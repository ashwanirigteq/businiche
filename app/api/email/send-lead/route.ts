import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { sendLeadOfferEmail } from '@/lib/email';
import { deductUserCredits, CREDIT_COSTS } from '@/lib/credits';

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const body = await request.json();
    const { leadId, to, companyName, contactName, industry, customSubject, customBody } = body;

    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return NextResponse.json(
        { error: 'A valid recipient email address is required.' },
        { status: 400 }
      );
    }

    // Fetch user details for signature & custom SMTP
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

    // Deduct 5 credits for email outreach
    const creditResult = await deductUserCredits(
      session.userId,
      session.role,
      CREDIT_COSTS.EMAIL_PER_LEAD,
      'Email Lead'
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

    const finalCompanyName = companyName?.trim() || 'Valued Partner';

    // Send email via SMTP
    let emailResult;
    try {
      emailResult = await sendLeadOfferEmail({
        to: to.trim(),
        companyName: finalCompanyName,
        contactName: contactName?.trim(),
        industry: industry?.trim(),
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
    } catch (sendErr: unknown) {
      console.error('SMTP sending failure:', sendErr);
      const rawErrMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
      return NextResponse.json(
        {
          error: `Email delivery failed (${rawErrMsg}). Please add or verify your Email, SMTP Host, SMTP Port, and Password in your Profile Page.`,
          requiresProfileUpdate: true,
        },
        { status: 400 }
      );
    }

    // Record activity comment and update status
    if (leadId) {
      try {
        await sql`
          INSERT INTO comments (lead_id, user_id, status, comment_text)
          VALUES (
            ${leadId},
            ${session.userId},
            'Follow Up',
            ${`Sent outreach offer email to ${to.trim()}`}
          );
        `;

        await sql`
          UPDATE leads
          SET status = 'Follow Up', email = COALESCE(email, ${to.trim()})
          WHERE id = ${leadId};
        `;
      } catch (logErr) {
        console.error('Failed to log email comment to lead:', logErr);
      }
    }

    return NextResponse.json({
      message: `Offer email delivered to ${to.trim()}.`,
      remainingCredits: creditResult.remaining,
      nextCreditDate: creditResult.nextCreditDate,
      ...emailResult,
    });
  } catch (err: unknown) {
    console.error('Send lead email error:', err);
    const message = err instanceof Error ? err.message : 'Failed to send email.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
