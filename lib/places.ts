import { sql } from './db';
import type { Lead, LeadGenerationResult } from './types';

interface NormalizedPlace {
  place_id: string;
  name: string;
  formatted_address?: string;
  website?: string;
  phone?: string;
  source_url?: string;
}

/**
 * Fetch detailed place info for legacy Places API
 */
async function fetchLegacyPlaceDetails(placeId: string, apiKey: string): Promise<Partial<NormalizedPlace>> {
  try {
    const fields = 'name,formatted_address,formatted_phone_number,international_phone_number,website,url';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${apiKey}`;
    
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return {};
    
    const data = await response.json();
    if (data.status === 'OK' && data.result) {
      return {
        phone: data.result.formatted_phone_number || data.result.international_phone_number,
        website: data.result.website,
        source_url: data.result.url,
        formatted_address: data.result.formatted_address,
        name: data.result.name,
      };
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Search Google Places using Places API (New)
 */
async function searchPlacesNew(query: string, apiKey: string, limit: number): Promise<NormalizedPlace[]> {
  const url = 'https://places.googleapis.com/v1/places:searchText';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri',
    },
    body: JSON.stringify({
      textQuery: query,
      pageSize: Math.min(limit, 20),
    }),
    signal: AbortSignal.timeout(10000),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorDetail = data.error?.message || response.statusText;
    throw new Error(`Places API (New) [${response.status}]: ${errorDetail}`);
  }

  if (!data.places || data.places.length === 0) {
    return [];
  }

  return data.places.map((p: {
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    websiteUri?: string;
    googleMapsUri?: string;
  }) => ({
    place_id: p.id,
    name: p.displayName?.text || 'Unknown Business',
    formatted_address: p.formattedAddress,
    phone: p.nationalPhoneNumber || p.internationalPhoneNumber,
    website: p.websiteUri,
    source_url: p.googleMapsUri,
  }));
}

/**
 * Search Google Places using Legacy Text Search
 */
async function searchPlacesLegacy(query: string, apiKey: string, limit: number): Promise<NormalizedPlace[]> {
  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
  const response = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) });
  
  if (!response.ok) {
    throw new Error(`Legacy Places API error: HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data.status === 'ZERO_RESULTS') {
    return [];
  }

  if (data.status === 'REQUEST_DENIED') {
    throw new Error(`Legacy Places API error (REQUEST_DENIED): ${data.error_message || 'Access Denied'}`);
  }

  if (data.status === 'OVER_QUERY_LIMIT') {
    throw new Error('Google Places API quota exceeded. Please try again later.');
  }

  if (data.status !== 'OK' || !data.results) {
    throw new Error(`Google Places API status ${data.status}: ${data.error_message || 'No results'}`);
  }

  const placesToFetch = data.results.slice(0, Math.min(limit, 20));

  const detailsPromises = placesToFetch.map(async (p: { place_id: string; name: string; formatted_address?: string }) => {
    const details = await fetchLegacyPlaceDetails(p.place_id, apiKey);
    return {
      place_id: p.place_id,
      name: details.name || p.name,
      formatted_address: details.formatted_address || p.formatted_address,
      website: details.website,
      phone: details.phone,
      source_url: details.source_url,
    };
  });

  return await Promise.all(detailsPromises);
}

/**
 * Discover leads from Google Places with automatic New / Legacy endpoint negotiation
 */
export async function discoverGooglePlacesLeads(
  niche: string,
  location: string,
  limit: number = 10
): Promise<NormalizedPlace[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured in .env.local');
  }

  const query = `${niche.trim()} in ${location.trim()}`;

  // 1. Try Places API (New) first (preferred by modern Google Cloud projects)
  try {
    return await searchPlacesNew(query, apiKey, limit);
  } catch (newApiErr: unknown) {
    const newErrMsg = newApiErr instanceof Error ? newApiErr.message : String(newApiErr);
    
    // 2. Fallback to Legacy Places API if Places (New) is not configured
    try {
      return await searchPlacesLegacy(query, apiKey, limit);
    } catch (legacyErr: unknown) {
      const legacyErrMsg = legacyErr instanceof Error ? legacyErr.message : String(legacyErr);

      // Return the most informative actionable error
      if (newErrMsg.includes('API key not valid') || newErrMsg.includes('API_KEY_INVALID')) {
        throw new Error(
          'Google Places API Error: The provided GOOGLE_MAPS_API_KEY is invalid or not activated for the Places API. Please enable "Places API (New)" and ensure billing is active in your Google Cloud Console.'
        );
      }

      if (legacyErrMsg.includes('REQUEST_DENIED') || legacyErrMsg.includes('LegacyApiNotActivatedMapError')) {
        throw new Error(
          'Google Cloud Configuration Required: The Google Cloud project for this API key has not enabled the Places API. To enable it, visit Google Cloud Console > APIs & Services > Enable "Places API (New)".'
        );
      }

      throw new Error(`Google Places API Error: ${newErrMsg || legacyErrMsg}`);
    }
  }
}

/**
 * Generate, normalize, deduplicate, and save leads into Neon PostgreSQL
 */
export async function generateAndSaveLeads(
  niche: string,
  location: string,
  requestedCount: number
): Promise<LeadGenerationResult> {
  const cleanNiche = niche.trim();
  const cleanLocation = location.trim();

  if (!cleanNiche) throw new Error('Industry / Niche is required');
  if (!cleanLocation) throw new Error('Location is required');
  const count = Math.min(Math.max(Number(requestedCount) || 5, 1), 20);

  // 1. Fetch places from Google Places API
  const rawPlaces = await discoverGooglePlacesLeads(cleanNiche, cleanLocation, count);

  if (rawPlaces.length === 0) {
    return {
      totalFound: 0,
      insertedCount: 0,
      duplicatesCount: 0,
      leads: [],
    };
  }

  // 2. Normalize raw data
  const normalizedCandidates = rawPlaces.map((item) => ({
    company_name: (item.name || 'Unknown Business').trim(),
    website: item.website ? item.website.trim() : null,
    phone: item.phone ? item.phone.trim() : null,
    address: item.formatted_address ? item.formatted_address.trim() : null,
    industry: cleanNiche,
    source: 'Google Places',
    source_url: item.source_url ? item.source_url.trim() : null,
  }));

  // 3. Deduplicate against PostgreSQL leads table
  const newlyInsertedLeads: Lead[] = [];
  let duplicatesCount = 0;

  for (const candidate of normalizedCandidates) {
    try {
      const existing = await sql`
        SELECT id FROM leads 
        WHERE LOWER(TRIM(company_name)) = LOWER(TRIM(${candidate.company_name}))
          AND LOWER(TRIM(COALESCE(address, ''))) = LOWER(TRIM(COALESCE(${candidate.address}, '')))
        LIMIT 1;
      `;

      if (existing.length > 0) {
        duplicatesCount++;
        continue;
      }

      const inserted = await sql`
        INSERT INTO leads (company_name, website, phone, address, industry, source, source_url)
        VALUES (
          ${candidate.company_name},
          ${candidate.website},
          ${candidate.phone},
          ${candidate.address},
          ${candidate.industry},
          ${candidate.source},
          ${candidate.source_url}
        )
        RETURNING id, company_name, website, phone, address, industry, source, source_url, created_on;
      `;

      if (inserted.length > 0) {
        newlyInsertedLeads.push(inserted[0] as unknown as Lead);
      }
    } catch (dbErr: unknown) {
      const err = dbErr as { code?: string };
      if (err.code === '23505') {
        duplicatesCount++;
      } else {
        throw dbErr;
      }
    }
  }

  return {
    totalFound: rawPlaces.length,
    insertedCount: newlyInsertedLeads.length,
    duplicatesCount,
    leads: newlyInsertedLeads,
  };
}
