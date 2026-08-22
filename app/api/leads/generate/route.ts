import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { discoverGooglePlacesLeads } from '@/lib/places';

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    if (session.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Forbidden: Lead generation is restricted to administrators.' },
        { status: 403 }
      );
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

    // Discover in-memory leads WITHOUT auto-saving
    const result = await discoverGooglePlacesLeads(niche, location, leadLimit);

    return NextResponse.json({
      success: true,
      message: `Discovered ${result.totalFound} businesses matching "${niche}" in "${location}". Leads are ready to review and save.`,
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
