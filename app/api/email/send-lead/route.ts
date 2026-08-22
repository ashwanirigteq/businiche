import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { sendLeadOfferEmail } from '@/lib/email';

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

    const finalCompanyName = companyName?.trim() || 'Valued Partner';

    // Send email via SMTP
    const emailResult = await sendLeadOfferEmail({
      to: to.trim(),
      companyName: finalCompanyName,
      contactName: contactName?.trim(),
      industry: industry?.trim(),
      customSubject,
      customBody,
    });

    // If leadId is provided, record an activity comment and update status
    if (leadId) {
      try {
        await sql`
          INSERT INTO comments (lead_id, user_id, status, comment_text)
          VALUES (
            ${leadId},
            ${session.userId},
            'Follow Up',
            ${`Sent Rigteq Software strategic collaboration offer email to ${to.trim()}`}
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
      message: `Offer email successfully delivered to ${to.trim()}.`,
      ...emailResult,
    });
  } catch (err: unknown) {
    console.error('Send lead email error:', err);
    const message = err instanceof Error ? err.message : 'Failed to send email. Please check SMTP settings.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
