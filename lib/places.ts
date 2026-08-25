import { sql } from './db';
import type { Lead, DiscoveredLead, LeadDiscoveryResult } from './types';

interface NormalizedPlace {
  place_id: string;
  name: string;
  formatted_address?: string;
  website?: string;
  phone?: string;
  email?: string;
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
 * Search Google Places using Places API (New) with multi-page pagination up to requested limit (30, 50, 100)
 */
async function searchPlacesNew(query: string, apiKey: string, limit: number): Promise<NormalizedPlace[]> {
  const url = 'https://places.googleapis.com/v1/places:searchText';
  const targetLimit = Math.min(Math.max(limit, 1), 100);
  const results: NormalizedPlace[] = [];
  let pageToken: string | undefined = undefined;

  // Loop pages until we reach targetLimit or no more results
  while (results.length < targetLimit) {
    const pageSize = Math.min(targetLimit - results.length, 20);
    const bodyPayload: Record<string, unknown> = {
      textQuery: query,
      pageSize,
    };
    if (pageToken) {
      bodyPayload.pageToken = pageToken;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,nextPageToken',
      },
      body: JSON.stringify(bodyPayload),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorDetail = data.error?.message || response.statusText;
      throw new Error(`Places API (New) [${response.status}]: ${errorDetail}`);
    }

    if (!data.places || data.places.length === 0) {
      break;
    }

    for (const p of data.places) {
      results.push({
        place_id: p.id,
        name: p.displayName?.text || 'Unknown Business',
        formatted_address: p.formattedAddress,
        phone: p.nationalPhoneNumber || p.internationalPhoneNumber,
        website: p.websiteUri,
        source_url: p.googleMapsUri,
      });
      if (results.length >= targetLimit) break;
    }

    if (!data.nextPageToken || results.length >= targetLimit) {
      break;
    }
    pageToken = data.nextPageToken;
    // Short sleep between page tokens as per Google API specifications
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  return results;
}

/**
 * Search Google Places using Legacy Text Search with pagination support
 */
async function searchPlacesLegacy(query: string, apiKey: string, limit: number): Promise<NormalizedPlace[]> {
  const targetLimit = Math.min(Math.max(limit, 1), 100);
  const allResults: NormalizedPlace[] = [];
  let nextPageToken: string | null = null;

  do {
    let searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
    if (nextPageToken) {
      searchUrl += `&pagetoken=${encodeURIComponent(nextPageToken)}`;
      // Google Legacy API requires ~1.5s delay before nextPageToken becomes active
      await new Promise((r) => setTimeout(r, 1800));
    }

    const response = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) break;

    const data = await response.json();
    if (data.status !== 'OK' || !data.results) break;

    const placesToFetch = data.results.slice(0, Math.min(targetLimit - allResults.length, 20));
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

    const pageResults = await Promise.all(detailsPromises);
    allResults.push(...pageResults);

    nextPageToken = data.next_page_token || null;
  } while (nextPageToken && allResults.length < targetLimit);

  return allResults;
}

/**
 * Discover in-memory leads from Google Places WITHOUT saving to database
 */
export async function discoverGooglePlacesLeads(
  niche: string,
  location: string,
  limit: number = 10,
  customApiKey?: string
): Promise<LeadDiscoveryResult> {
  const apiKey = customApiKey?.trim();
  if (!apiKey) {
    throw new Error('Google Places API Key is not configured. Please add custom_places_api_key in Profile or configure GOOGLE_MAPS_API_KEY.');
  }

  const cleanNiche = niche.trim();
  const cleanLocation = location.trim();
  if (!cleanNiche) throw new Error('Industry / Niche is required');
  if (!cleanLocation) throw new Error('Location is required');

  const query = `${cleanNiche} in ${cleanLocation}`;
  let rawPlaces: NormalizedPlace[] = [];

  // 1. Try Places API (New) first (preferred)
  try {
    rawPlaces = await searchPlacesNew(query, apiKey, limit);
  } catch (newApiErr: unknown) {
    const newErrMsg = newApiErr instanceof Error ? newApiErr.message : String(newApiErr);
    
    // 2. Fallback to Legacy Places API if necessary
    try {
      rawPlaces = await searchPlacesLegacy(query, apiKey, limit);
    } catch (legacyErr: unknown) {
      const legacyErrMsg = legacyErr instanceof Error ? legacyErr.message : String(legacyErr);

      if (newErrMsg.includes('API key not valid') || newErrMsg.includes('API_KEY_INVALID')) {
        throw new Error(
          'Google Places API Error: The provided API key is invalid or not activated. Please ensure "Places API (New)" is enabled in Google Cloud Console.'
        );
      }

      throw new Error(`Google Places API Error: ${newErrMsg || legacyErrMsg}`);
    }
  }

  if (rawPlaces.length === 0) {
    return { totalFound: 0, leads: [] };
  }

  // Check which of these leads already exist in PostgreSQL database
  const discoveredLeads: DiscoveredLead[] = [];

  for (let i = 0; i < rawPlaces.length; i++) {
    const p = rawPlaces[i];
    const companyName = (p.name || 'Unknown Business').trim();
    const address = p.formatted_address ? p.formatted_address.trim() : null;

    let isSaved = false;
    try {
      const existing = await sql`
        SELECT id FROM leads 
        WHERE LOWER(TRIM(company_name)) = LOWER(TRIM(${companyName}))
          AND LOWER(TRIM(COALESCE(address, ''))) = LOWER(TRIM(COALESCE(${address}, '')))
        LIMIT 1;
      `;
      isSaved = existing.length > 0;
    } catch {
      isSaved = false;
    }

    discoveredLeads.push({
      temp_id: `disc_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
      company_name: companyName,
      website: p.website ? p.website.trim() : null,
      phone: p.phone ? p.phone.trim() : null,
      email: p.email ? p.email.trim() : null,
      address,
      industry: cleanNiche,
      source: 'Google Places',
      source_url: p.source_url ? p.source_url.trim() : null,
      status: 'New',
      isSaved,
    });
  }

  return {
    totalFound: discoveredLeads.length,
    leads: discoveredLeads,
  };
}

/**
 * Save a single discovered lead to PostgreSQL database with creator ownership
 */
export async function saveLeadToDatabase(lead: DiscoveredLead, userId?: string): Promise<Lead> {
  const companyName = lead.company_name.trim();
  const address = lead.address ? lead.address.trim() : null;

  try {
    const existing = await sql`
      SELECT id, website, phone, email, additional_emails, additional_phones FROM leads
      WHERE LOWER(TRIM(company_name)) = LOWER(TRIM(${companyName}))
        AND LOWER(TRIM(COALESCE(address, ''))) = LOWER(TRIM(COALESCE(${address}, '')))
      LIMIT 1;
    `;

    if (existing.length > 0) {
      const existingId = existing[0].id;
      const updated = await sql`
        UPDATE leads
        SET website = COALESCE(${lead.website || null}, website),
            phone = COALESCE(${lead.phone || null}, phone),
            email = COALESCE(${lead.email || null}, email)
        WHERE id = ${existingId}
        RETURNING id, company_name, website, phone, email, address, industry, status, source, source_url, created_on, created_by, additional_emails, additional_phones;
      `;
      return updated[0] as unknown as Lead;
    }

    const inserted = await sql`
      INSERT INTO leads (company_name, website, phone, email, address, industry, status, source, source_url, created_by)
      VALUES (
        ${companyName},
        ${lead.website || null},
        ${lead.phone || null},
        ${lead.email || null},
        ${address},
        ${lead.industry},
        ${lead.status || 'New'},
        ${lead.source || 'Google Places'},
        ${lead.source_url || null},
        ${userId || null}
      )
      RETURNING id, company_name, website, phone, email, address, industry, status, source, source_url, created_on, created_by, additional_emails, additional_phones;
    `;

    return inserted[0] as unknown as Lead;
  } catch (err) {
    console.error('Error saving lead to database:', companyName, err);
    throw err;
  }
}

/**
 * Save multiple discovered leads in bulk to PostgreSQL
 */
export async function saveBulkLeadsToDatabase(leadsList: DiscoveredLead[], userId?: string): Promise<{ savedCount: number; savedLeads: Lead[] }> {
  const savedLeads: Lead[] = [];

  for (const lead of leadsList) {
    try {
      const saved = await saveLeadToDatabase(lead, userId);
      savedLeads.push(saved);
    } catch (err) {
      console.error('Failed to save lead:', lead.company_name, err);
    }
  }

  return {
    savedCount: savedLeads.length,
    savedLeads,
  };
}
