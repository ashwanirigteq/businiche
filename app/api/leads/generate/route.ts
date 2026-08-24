import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { discoverGooglePlacesLeads } from '@/lib/places';
import { deductUserCredits, CREDIT_COSTS } from '@/lib/credits';

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
    const totalRequiredCredits = leadLimit * CREDIT_COSTS.GENERATE_PER_LEAD; // 10 credits per lead

    // Check & Deduct Credits before calling API
    const creditResult = await deductUserCredits(
      session.userId,
      session.role,
      totalRequiredCredits,
      `Generate ${leadLimit} Leads`
    );

    if (!creditResult.success) {
      return NextResponse.json(
        {
          error: creditResult.message,
          outOfCredits: true,
          remainingCredits: creditResult.remaining,
        },
        { status: 402 }
      );
    }

    // Discover in-memory leads
    const result = await discoverGooglePlacesLeads(niche, location, leadLimit);

    return NextResponse.json({
      success: true,
      message: `Discovered ${result.totalFound} businesses matching "${niche}" in "${location}".`,
      remainingCredits: creditResult.remaining,
      nextCreditDate: creditResult.nextCreditDate,
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
