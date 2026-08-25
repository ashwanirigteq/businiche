import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendOtpEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if email or user is already registered
    const existing = await sql`SELECT id FROM users WHERE LOWER(email) = ${cleanEmail} LIMIT 1;`;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email address is already registered.' }, { status: 409 });
    }

    // Generate random 6-digit code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Save to otp_verifications table
    await sql`
      INSERT INTO otp_verifications (email, otp_code, expires_at)
      VALUES (${cleanEmail}, ${otpCode}, ${expiresAt});
    `;

    // Send email from ops@rigteq.com
    await sendOtpEmail(cleanEmail, otpCode);

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}.`,
    });
  } catch (err: unknown) {
    console.error('OTP Send error:', err);
    return NextResponse.json({ error: 'Failed to send verification code. Please check email address.' }, { status: 500 });
  }
}
