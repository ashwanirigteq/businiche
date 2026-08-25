import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otpCode } = body;

    if (!email || !otpCode) {
      return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otpCode).trim();

    const result = await sql`
      SELECT id, expires_at FROM otp_verifications
      WHERE LOWER(email) = ${cleanEmail} AND otp_code = ${cleanOtp} AND verified = FALSE
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 });
    }

    const record = result[0];
    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Verification code has expired. Please request a new code.' }, { status: 400 });
    }

    // Mark as verified
    await sql`UPDATE otp_verifications SET verified = TRUE WHERE id = ${record.id};`;

    return NextResponse.json({ success: true, message: 'Email verified successfully.' });
  } catch (err: unknown) {
    console.error('OTP verify error:', err);
    return NextResponse.json({ error: 'Verification failed.' }, { status: 500 });
  }
}
