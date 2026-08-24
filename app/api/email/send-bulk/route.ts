import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { sendLeadOfferEmail } from '@/lib/email';
import { deductUserCredits, CREDIT_COSTS } from '@/lib/credits';
import type { Lead } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const body = await request.json();
    const { leadIds, customSubject, customBody } = body;

    let targetLeads: Lead[] = [];

    const isAdmin = session.role === 'Admin';
    const userId = session.userId;

    if (Array.isArray(leadIds) && leadIds.length > 0) {
      let result;
      if (isAdmin) {
        result = await sql`
          SELECT id, company_name, website, phone, email, address, industry, status, source, source_url, created_on
          FROM leads
          WHERE id = ANY(${leadIds}) AND email IS NOT NULL AND email != '';
        `;
      } else {
        result = await sql`
          SELECT id, company_name, website, phone, email, address, industry, status, source, source_url, created_on
          FROM leads
          WHERE id = ANY(${leadIds}) AND created_by = ${userId} AND email IS NOT NULL AND email != '';
        `;
      }
      targetLeads = result as unknown as Lead[];
    } else {
      let result;
      if (isAdmin) {
        result = await sql`
          SELECT id, company_name, website, phone, email, address, industry, status, source, source_url, created_on
          FROM leads
          WHERE email IS NOT NULL AND email != ''
          ORDER BY created_on DESC;
        `;
      } else {
        result = await sql`
          SELECT id, company_name, website, phone, email, address, industry, status, source, source_url, created_on
          FROM leads
          WHERE created_by = ${userId} AND email IS NOT NULL AND email != ''
          ORDER BY created_on DESC;
        `;
      }
      targetLeads = result as unknown as Lead[];
    }

    if (targetLeads.length === 0) {
      return NextResponse.json(
        { error: 'No leads with valid email addresses found to send.' },
        { status: 400 }
      );
    }

    // Calculate total required credits (5 credits per lead)
    const requiredCredits = targetLeads.length * CREDIT_COSTS.EMAIL_PER_LEAD;

    const creditResult = await deductUserCredits(
      session.userId,
      session.role,
      requiredCredits,
      `Bulk Email ${targetLeads.length} Lead(s)`
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

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const lead of targetLeads) {
      if (!lead.email || !lead.email.includes('@')) {
        failedCount++;
        continue;
      }

      try {
        await sendLeadOfferEmail({
          to: lead.email.trim(),
          companyName: lead.company_name,
          industry: lead.industry,
          customSubject,
          customBody,
        });

        sentCount++;

        // Log comment and update status
        try {
          await sql`
            INSERT INTO comments (lead_id, user_id, status, comment_text)
            VALUES (
              ${lead.id},
              ${session.userId},
              'Follow Up',
              ${`Sent Rigteq Software collaboration offer email in bulk campaign to ${lead.email.trim()}`}
            );
          `;
          await sql`UPDATE leads SET status = 'Follow Up' WHERE id = ${lead.id};`;
        } catch (logErr) {
          console.error('Failed to log bulk email comment:', logErr);
        }

        // Small interval between sends to respect SMTP rate limits
        await new Promise((r) => setTimeout(r, 400));
      } catch (sendErr: unknown) {
        failedCount++;
        const msg = sendErr instanceof Error ? sendErr.message : 'Send failed';
        errors.push(`${lead.company_name} (${lead.email}): ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk email finished. Sent: ${sentCount}, Failed: ${failedCount}.`,
      sentCount,
      failedCount,
      totalAttempted: targetLeads.length,
      remainingCredits: creditResult.remaining,
      nextCreditDate: creditResult.nextCreditDate,
      errors: errors.slice(0, 5),
    });
  } catch (err: unknown) {
    console.error('Bulk email error:', err);
    const message = err instanceof Error ? err.message : 'Bulk email dispatch failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
