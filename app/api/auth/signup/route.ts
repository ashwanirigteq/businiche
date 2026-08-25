import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hashPassword, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { sendSignupNotificationEmail } from '@/lib/email';
import type { UserRole } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, username, password, email, companyName, otpCode } = body;

    if (!fullName || !username || !password || !email || !otpCode) {
      return NextResponse.json(
        { error: 'All fields including email and verification code are required.' },
        { status: 400 }
      );
    }

    const cleanFullName = String(fullName).trim();
    const cleanUsername = String(username).trim().toLowerCase();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanCompany = companyName ? String(companyName).trim() : 'Demo';
    const cleanOtp = String(otpCode).trim();
    const rawPassword = String(password);

    if (cleanFullName.length < 2) {
      return NextResponse.json({ error: 'Full name must be at least 2 characters.' }, { status: 400 });
    }

    if (cleanUsername.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters.' }, { status: 400 });
    }

    if (!cleanEmail.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
    }

    if (rawPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    // Verify OTP code
    const otpResult = await sql`
      SELECT id, expires_at FROM otp_verifications
      WHERE LOWER(email) = ${cleanEmail} AND otp_code = ${cleanOtp}
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    if (otpResult.length === 0) {
      return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 });
    }

    if (new Date(otpResult[0].expires_at) < new Date()) {
      return NextResponse.json({ error: 'Verification code has expired.' }, { status: 400 });
    }

    // Check username or email uniqueness
    const existing = await sql`
      SELECT id FROM users WHERE LOWER(username) = ${cleanUsername} OR LOWER(email) = ${cleanEmail} LIMIT 1;
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Username or Email is already registered.' },
        { status: 409 }
      );
    }

    // Get default 'User' role
    const roles = await sql`SELECT id FROM roles WHERE role_name = 'User' LIMIT 1;`;
    if (roles.length === 0) {
      return NextResponse.json({ error: 'Role configuration error in database.' }, { status: 500 });
    }

    const roleId = roles[0].id;
    const passwordHash = await hashPassword(rawPassword);

    // Insert new user with 10,000 weekly credits default
    const newUserResult = await sql`
      INSERT INTO users (full_name, username, password_hash, role_id, company_name, email, credits, last_credit_reset, next_credit_date)
      VALUES (
        ${cleanFullName},
        ${cleanUsername},
        ${passwordHash},
        ${roleId},
        ${cleanCompany},
        ${cleanEmail},
        10000,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + INTERVAL '7 days'
      )
      RETURNING id, full_name, username, email, company_name, created_on;
    `;

    const newUser = newUserResult[0];

    // Create session token
    const token = await createSessionToken({
      userId: newUser.id,
      username: newUser.username,
      fullName: newUser.full_name,
      role: 'User' as UserRole,
    });

    // Notify ops@rigteq.com asynchronously
    sendSignupNotificationEmail({
      fullName: newUser.full_name,
      username: newUser.username,
      created_on: newUser.created_on,
    }).catch(() => {});

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        fullName: newUser.full_name,
        username: newUser.username,
        email: newUser.email,
        companyName: newUser.company_name,
        role: 'User',
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: unknown) {
    console.error('Signup error:', err);
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
