import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { discoverGooglePlacesLeads } from '@/lib/places';
import { getUserCreditDetails, deductUserCredits, CREDIT_COSTS } from '@/lib/credits';

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const body = await request.json();
    const { niche, location, limit } = body;

    if (!niche || typeof niche !== 'string' || niche.trim().length < 2) {
      return NextResponse.json(
        { error: 'Please specify a valid industry or business niche (min 2 characters).' },
        { status: 400 }
      );
    }

    if (!location || typeof location !== 'string' || location.trim().length < 2) {
      return NextResponse.json(
        { error: 'Please specify a valid location (min 2 characters).' },
        { status: 400 }
      );
    }

    const leadLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    // Check user credit balance
    const userCreditDetails = await getUserCreditDetails(session.userId, session.role);
    if (session.role !== 'Admin' && userCreditDetails.credits < CREDIT_COSTS.GENERATE_PER_LEAD) {
      return NextResponse.json(
        {
          error: `Insufficient credits. Lead generation requires at least ${CREDIT_COSTS.GENERATE_PER_LEAD} credits per lead. You have ${userCreditDetails.credits} credits.`,
          outOfCredits: true,
          remainingCredits: userCreditDetails.credits,
          nextCreditDate: userCreditDetails.nextCreditDate,
        },
        { status: 402 }
      );
    }

    // Fetch user's custom Places API key if set in profile
    let customPlacesApiKey: string | undefined = undefined;
    try {
      const uRes = await sql`SELECT custom_places_api_key FROM users WHERE id = ${session.userId} LIMIT 1;`;
      if (uRes.length > 0 && uRes[0].custom_places_api_key) {
        customPlacesApiKey = uRes[0].custom_places_api_key;
      }
    } catch {}

    // Discover leads using Google Places API
    let result;
    try {
      result = await discoverGooglePlacesLeads(niche, location, leadLimit, customPlacesApiKey);
    } catch (placesErr: unknown) {
      const rawMsg = placesErr instanceof Error ? placesErr.message : String(placesErr);
      if (
        rawMsg.includes('API Key is not configured') ||
        rawMsg.includes('invalid') ||
        rawMsg.includes('REQUEST_DENIED') ||
        rawMsg.includes('API_KEY_INVALID')
      ) {
        return NextResponse.json(
          {
            error: `Google Places API Key is missing or invalid (${rawMsg}). Please add or update your custom Google Places API Key in your Profile Page.`,
            requiresProfileKey: true,
          },
          { status: 400 }
        );
      }
      throw placesErr;
    }

    // Deduct credits based on ACTUAL leads returned
    const actualFound = result.totalFound || 0;
    const creditsToDeduct = actualFound * CREDIT_COSTS.GENERATE_PER_LEAD;

    let remainingCredits = userCreditDetails.credits;
    let nextCreditDate = userCreditDetails.nextCreditDate;

    if (creditsToDeduct > 0 && session.role !== 'Admin') {
      const creditResult = await deductUserCredits(
        session.userId,
        session.role,
        creditsToDeduct,
        `Generated ${actualFound} Lead(s)`
      );
      remainingCredits = creditResult.remaining;
      nextCreditDate = creditResult.nextCreditDate || nextCreditDate;
    }

    return NextResponse.json({
      success: true,
      message: `Discovered ${actualFound} business(es) matching "${niche}" in "${location}".`,
      remainingCredits,
      nextCreditDate,
      ...result,
    });
  } catch (err: unknown) {
    console.error('Lead discovery error:', err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred during lead discovery.';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
