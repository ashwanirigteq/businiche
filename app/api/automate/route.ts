import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { runCampaignProcessor } from '@/lib/campaign_runner';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaigns = await sql`
      SELECT c.id, c.campaign_name, c.keywords, c.locations, c.target_emails, c.daily_email_limit,
             c.daily_email_count, c.last_daily_reset, c.credits_used, c.is_state_campaign,
             c.selected_states, c.city_progress_order, c.email_format_id, c.searches_count,
             c.leads_found_count, c.leads_enhanced_count, c.email_sent_count, c.status,
             c.started_at, c.time_taken_seconds, c.current_combination, c.last_update,
             c.created_by_user_id, c.created_at, f.format_name as email_format_name,
             u.username as created_by_username, u.full_name as created_by_full_name
      FROM campaigns c
      LEFT JOIN formats f ON c.email_format_id = f.id
      LEFT JOIN users u ON c.created_by_user_id = u.id
      ORDER BY c.created_at DESC;
    `;

    return NextResponse.json({ campaigns });
  } catch (err: unknown) {
    console.error('Fetch campaigns error:', err);
    return NextResponse.json({ error: 'Failed to retrieve campaigns.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const body = await request.json();

    // Check for duplicate action
    if (body.action === 'duplicate' && body.campaignId) {
      const sourceList = await sql`
        SELECT * FROM campaigns WHERE id = ${body.campaignId} LIMIT 1;
      `;
      if (sourceList.length === 0) {
        return NextResponse.json({ error: 'Source campaign not found.' }, { status: 404 });
      }
      const source = sourceList[0];
      const newName = `${source.campaign_name} (Copy)`;

      const inserted = await sql`
        INSERT INTO campaigns (
          campaign_name, keywords, locations, target_emails, daily_email_limit,
          is_state_campaign, selected_states, email_format_id, status, created_by_user_id
        )
        VALUES (
          ${newName},
          ${JSON.stringify(source.keywords)}::jsonb,
          ${JSON.stringify(source.locations)}::jsonb,
          ${source.target_emails},
          ${source.daily_email_limit || 50},
          ${Boolean(source.is_state_campaign)},
          ${JSON.stringify(source.selected_states || [])}::jsonb,
          ${source.email_format_id},
          'DRAFT',
          ${session.userId}
        )
        RETURNING id, campaign_name, status, created_at;
      `;

      return NextResponse.json({
        success: true,
        message: `Campaign duplicated as "${newName}".`,
        campaign: inserted[0],
      });
    }

    const {
      campaignName,
      keywords,
      locations,
      targetEmails,
      dailyEmailLimit,
      isStateCampaign,
      selectedStates,
      emailFormatId,
    } = body;

    if (!campaignName || typeof campaignName !== 'string' || campaignName.trim().length < 2) {
      return NextResponse.json({ error: 'Campaign name is required (min 2 characters).' }, { status: 400 });
    }

    const parsedKeywords = Array.isArray(keywords)
      ? keywords.map((k) => String(k).trim()).filter(Boolean)
      : String(keywords || '')
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean);

    const parsedLocations = Array.isArray(locations)
      ? locations.map((l) => String(l).trim()).filter(Boolean)
      : String(locations || '')
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean);

    if (parsedKeywords.length < 1 || parsedKeywords.length > 10) {
      return NextResponse.json({ error: 'Please enter between 1 and 10 keywords.' }, { status: 400 });
    }

    if (!isStateCampaign && (parsedLocations.length < 1 || parsedLocations.length > 10)) {
      return NextResponse.json({ error: 'Please enter between 1 and 10 locations or select State Campaign.' }, { status: 400 });
    }

    const validTargetEmails = Number(targetEmails) > 0 ? Number(targetEmails) : 50;
    const validDailyLimit = Number(dailyEmailLimit) >= 0 ? Number(dailyEmailLimit) : 50;

    const parsedStates = Array.isArray(selectedStates)
      ? selectedStates.map((s) => String(s).trim()).filter(Boolean)
      : [];

    const isUuid = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
    const cleanEmailFormatId = isUuid(emailFormatId) ? String(emailFormatId) : null;

    const inserted = await sql`
      INSERT INTO campaigns (
        campaign_name, keywords, locations, target_emails, daily_email_limit,
        is_state_campaign, selected_states, email_format_id, status, created_by_user_id
      )
      VALUES (
        ${campaignName.trim()},
        ${JSON.stringify(parsedKeywords)}::jsonb,
        ${JSON.stringify(parsedLocations)}::jsonb,
        ${validTargetEmails},
        ${validDailyLimit},
        ${Boolean(isStateCampaign)},
        ${JSON.stringify(parsedStates)}::jsonb,
        ${cleanEmailFormatId},
        'DRAFT',
        ${session.userId}
      )
      RETURNING id, campaign_name, keywords, locations, target_emails, daily_email_limit, status, created_at;
    `;

    return NextResponse.json({
      success: true,
      message: `Campaign "${campaignName.trim()}" created successfully.`,
      campaign: inserted[0],
    });
  } catch (err: unknown) {
    console.error('Create campaign error:', err);
    return NextResponse.json({ error: 'Failed to create campaign.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { campaignId, status, action } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required.' }, { status: 400 });
    }

    // Action: Restart Campaign
    if (action === 'restart') {
      const updated = await sql`
        UPDATE campaigns
        SET status = 'RUNNING',
            email_sent_count = 0,
            searches_count = 0,
            leads_found_count = 0,
            leads_enhanced_count = 0,
            daily_email_count = 0,
            city_progress_order = 0,
            started_at = CURRENT_TIMESTAMP,
            time_taken_seconds = 0,
            last_update = 'Campaign restarted by user.'
        WHERE id = ${campaignId}
        RETURNING id, campaign_name, status;
      `;

      if (updated.length === 0) {
        return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
      }

      runCampaignProcessor(campaignId).catch((err) => console.error('Restart runner error:', err));

      return NextResponse.json({
        success: true,
        message: 'Campaign restarted successfully.',
        campaign: updated[0],
      });
    }

    // Full Edit or Status Update
    if (body.campaignName || body.keywords || body.targetEmails) {
      const isUuid = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
      const cleanEmailFormatId = isUuid(body.emailFormatId) ? String(body.emailFormatId) : null;

      const parsedKeywords = Array.isArray(body.keywords)
        ? body.keywords.map((k: any) => String(k).trim()).filter(Boolean)
        : String(body.keywords || '').split(',').map((k) => k.trim()).filter(Boolean);

      const parsedLocations = Array.isArray(body.locations)
        ? body.locations.map((l: any) => String(l).trim()).filter(Boolean)
        : String(body.locations || '').split(',').map((l) => l.trim()).filter(Boolean);

      const parsedStates = Array.isArray(body.selectedStates)
        ? body.selectedStates.map((s: any) => String(s).trim()).filter(Boolean)
        : [];

      const updated = await sql`
        UPDATE campaigns
        SET campaign_name = COALESCE(${body.campaignName?.trim()}, campaign_name),
            keywords = ${JSON.stringify(parsedKeywords)}::jsonb,
            locations = ${JSON.stringify(parsedLocations)}::jsonb,
            target_emails = ${Number(body.targetEmails) || 50},
            daily_email_limit = ${Number(body.dailyEmailLimit) >= 0 ? Number(body.dailyEmailLimit) : 50},
            is_state_campaign = ${Boolean(body.isStateCampaign)},
            selected_states = ${JSON.stringify(parsedStates)}::jsonb,
            email_format_id = ${cleanEmailFormatId},
            status = COALESCE(${status}, status),
            last_update = 'Campaign settings updated.'
        WHERE id = ${campaignId}
        RETURNING id, campaign_name, status;
      `;

      if (updated.length === 0) {
        return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
      }

      if (status === 'RUNNING') {
        runCampaignProcessor(campaignId).catch((err) => console.error('Edit runner error:', err));
      }

      return NextResponse.json({
        success: true,
        message: 'Campaign updated successfully.',
        campaign: updated[0],
      });
    }

    // Simple Status Change (RUNNING / PAUSED / STOPPED)
    const validStatuses = ['DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'STOPPED', 'FAILED', 'SCHEDULED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid campaign status.' }, { status: 400 });
    }

    let updated;
    if (status === 'RUNNING') {
      updated = await sql`
        UPDATE campaigns
        SET status = ${status},
            started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
            last_update = 'Initializing discovery engine...'
        WHERE id = ${campaignId}
        RETURNING id, campaign_name, status;
      `;
    } else {
      updated = await sql`
        UPDATE campaigns
        SET status = ${status},
            last_update = ${`Campaign status changed to ${status}`}
        WHERE id = ${campaignId}
        RETURNING id, campaign_name, status;
      `;
    }

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
    }

    if (status === 'RUNNING') {
      runCampaignProcessor(campaignId).catch((err) => console.error('Status runner error:', err));
    }

    return NextResponse.json({
      success: true,
      message: `Campaign status updated to ${status}.`,
      campaign: updated[0],
    });
  } catch (err: unknown) {
    console.error('Update campaign error:', err);
    return NextResponse.json({ error: 'Failed to update campaign.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Campaign ID is required.' }, { status: 400 });
    }

    await sql`DELETE FROM campaigns WHERE id = ${id};`;

    return NextResponse.json({ success: true, message: 'Campaign deleted.' });
  } catch (err: unknown) {
    console.error('Delete campaign error:', err);
    return NextResponse.json({ error: 'Failed to delete campaign.' }, { status: 500 });
  }
}
