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

    // Fetch user profile SMTP credentials
    let userFullName = session.fullName;
    let userCompanyName = 'Demo';
    let userEmail = '';
    let userEmailPassword = '';
    let userSmtpHost = '';
    let userSmtpPort: number | undefined = undefined;

    try {
      const uRes = await sql`SELECT full_name, company_name, email, email_password, smtp_host, smtp_port FROM users WHERE id = ${session.userId} LIMIT 1;`;
      if (uRes.length > 0) {
        userFullName = uRes[0].full_name || session.fullName;
        userCompanyName = uRes[0].company_name || 'Demo';
        userEmail = uRes[0].email || '';
        userEmailPassword = uRes[0].email_password || '';
        userSmtpHost = uRes[0].smtp_host || '';
        userSmtpPort = uRes[0].smtp_port || 465;
      }
    } catch {}

    if (!userEmail || !userEmailPassword || !userSmtpHost) {
      return NextResponse.json(
        {
          error: 'Bulk email campaign failed: Your Email SMTP credentials (Email, Host, Port, Password) are missing. Please add them in your Profile Page.',
          requiresProfileUpdate: true,
        },
        { status: 400 }
      );
    }

    let targetLeads: Lead[] = [];

    if (Array.isArray(leadIds) && leadIds.length > 0) {
      const result = await sql`
        SELECT id, company_name, website, phone, email, address, industry, status, source, source_url, created_on
        FROM leads
        WHERE id = ANY(${leadIds}) AND email IS NOT NULL AND email != '';
      `;
      targetLeads = result as unknown as Lead[];
    } else {
      const result = await sql`
        SELECT id, company_name, website, phone, email, address, industry, status, source, source_url, created_on
        FROM leads
        WHERE email IS NOT NULL AND email != ''
        ORDER BY created_on DESC;
      `;
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
          userFullName,
          userCompanyName,
          userEmail,
          userEmailPassword,
          userSmtpHost,
          userSmtpPort,
          userId: session.userId,
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
              ${`Sent outreach offer email in bulk campaign to ${lead.email.trim()}`}
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
