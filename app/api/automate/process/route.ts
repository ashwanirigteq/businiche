import { NextResponse } from 'next/server';
import { runCampaignProcessor } from '@/lib/campaign_runner';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required.' }, { status: 400 });
    }

    await runCampaignProcessor(campaignId);

    return NextResponse.json({
      success: true,
      message: `Campaign processing finished for ${campaignId}.`,
    });
  } catch (err: unknown) {
    console.error('Campaign process route error:', err);
    return NextResponse.json({ error: 'Campaign automation background runner error.' }, { status: 500 });
  }
}
