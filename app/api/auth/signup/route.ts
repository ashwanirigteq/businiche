import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hashPassword, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import type { UserRole } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, username, password } = body;

    if (!fullName || !username || !password) {
      return NextResponse.json(
        { error: 'All fields (Full Name, Username, Password) are required.' },
        { status: 400 }
      );
    }

    const cleanFullName = String(fullName).trim();
    const cleanUsername = String(username).trim().toLowerCase();
    const rawPassword = String(password);

    if (cleanFullName.length < 2) {
      return NextResponse.json(
        { error: 'Full name must be at least 2 characters.' },
        { status: 400 }
      );
    }

    if (cleanUsername.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters.' },
        { status: 400 }
      );
    }

    if (rawPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    // Check if username is already taken
    const existing = await sql`
      SELECT id FROM users WHERE LOWER(username) = ${cleanUsername} LIMIT 1;
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Username is already registered. Please choose another.' },
        { status: 409 }
      );
    }

    // Get default 'User' role
    const roles = await sql`
      SELECT id FROM roles WHERE role_name = 'User' LIMIT 1;
    `;

    if (roles.length === 0) {
      return NextResponse.json(
        { error: 'Role configuration error in database.' },
        { status: 500 }
      );
    }

    const roleId = roles[0].id;
    const passwordHash = await hashPassword(rawPassword);

    // Insert new user
    const newUserResult = await sql`
      INSERT INTO users (full_name, username, password_hash, role_id)
      VALUES (${cleanFullName}, ${cleanUsername}, ${passwordHash}, ${roleId})
      RETURNING id, full_name, username, created_on;
    `;

    const newUser = newUserResult[0];

    // Create session token
    const token = await createSessionToken({
      userId: newUser.id,
      username: newUser.username,
      fullName: newUser.full_name,
      role: 'User' as UserRole,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        fullName: newUser.full_name,
        username: newUser.username,
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
