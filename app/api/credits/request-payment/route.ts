import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { getTransporter } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const body = await request.json();
    const { packageName, creditsCount, priceUsd } = body;

    // Fetch user email
    let userEmail = '';
    try {
      const uRes = await sql`SELECT email FROM users WHERE id = ${session.userId} LIMIT 1;`;
      if (uRes.length > 0 && uRes[0].email) {
        userEmail = uRes[0].email;
      }
    } catch {}

    const recipient = userEmail || 'ops@rigteq.com';
    const transporter = getTransporter();

    const subject = `💳 Credit Top-Up Invoice: ${packageName} (${creditsCount?.toLocaleString()} Credits)`;
    const text = `Hi ${session.fullName},

Thank you for selecting the ${packageName} (${creditsCount?.toLocaleString()} Credits for $${priceUsd}) on Businiche.

You can complete your payment securely via the link below:
https://razorpay.me/@rigteq

Once payment is confirmed, your account credits will be refilled automatically.

Best regards,
Businiche Operations Team
ops@rigteq.com
`;

    const html = `
<div style="font-family: sans-serif; padding: 24px; background-color: #f0f6ff; color: #0f172a;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #bfdbfe;">
    <h2 style="color: #1d4ed8; margin-top: 0;">💳 Credit Top-Up Payment Link</h2>
    <p>Hi <strong>${session.fullName}</strong>,</p>
    <p>Thank you for requesting additional credits for your lead campaigns.</p>
    
    <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
      <h4 style="margin: 0 0 6px 0; color: #1e40af;">${packageName}</h4>
      <p style="margin: 0; font-size: 20px; font-weight: bold; color: #1e3a8a;">${creditsCount?.toLocaleString()} Credits for $${priceUsd}</p>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="https://razorpay.me/@rigteq" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 10px;">
        Complete Payment ($${priceUsd}) →
      </a>
    </div>

    <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
      Businiche Operations Team • Rigteq Software (ops@rigteq.com)
    </p>
  </div>
</div>
`;

    await transporter.sendMail({
      from: 'Businiche Billing <ops@rigteq.com>',
      to: recipient,
      subject,
      text,
      html,
    });

    return NextResponse.json({
      success: true,
      message: `Payment request and secure invoice link delivered to ${recipient}.`,
    });
  } catch (err: unknown) {
    console.error('Request payment error:', err);
    return NextResponse.json({ error: 'Failed to send payment link email.' }, { status: 500 });
  }
}
