import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession, hashPassword } from '@/lib/auth';
import type { SafeUser, UserRole } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin privilege required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';

    let users: SafeUser[];
    if (q) {
      const searchPattern = `%${q}%`;
      const result = await sql`
        SELECT u.id, u.full_name, u.username, r.role_name, u.created_on
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.full_name ILIKE ${searchPattern} OR u.username ILIKE ${searchPattern} OR r.role_name ILIKE ${searchPattern}
        ORDER BY u.created_on DESC;
      `;
      users = result as unknown as SafeUser[];
    } else {
      const result = await sql`
        SELECT u.id, u.full_name, u.username, r.role_name, u.created_on
        FROM users u
        JOIN roles r ON u.role_id = r.id
        ORDER BY u.created_on DESC;
      `;
      users = result as unknown as SafeUser[];
    }

    return NextResponse.json({ users });
  } catch (err: unknown) {
    console.error('Fetch users error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve user list.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin privilege required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { fullName, username, password, role } = body;

    if (!fullName || !username || !password) {
      return NextResponse.json(
        { error: 'Full name, username, and password are required.' },
        { status: 400 }
      );
    }

    const cleanFullName = String(fullName).trim();
    const cleanUsername = String(username).trim().toLowerCase();
    const rawPassword = String(password);
    const selectedRole: UserRole = role === 'Admin' ? 'Admin' : 'User';

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

    // Check duplicate username
    const existing = await sql`
      SELECT id FROM users WHERE LOWER(username) = ${cleanUsername} LIMIT 1;
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Username already exists. Please choose another username.' },
        { status: 409 }
      );
    }

    // Fetch role id
    const roles = await sql`
      SELECT id FROM roles WHERE role_name = ${selectedRole} LIMIT 1;
    `;

    if (roles.length === 0) {
      return NextResponse.json(
        { error: 'Role not found in database.' },
        { status: 500 }
      );
    }

    const roleId = roles[0].id;
    const passwordHash = await hashPassword(rawPassword);

    const insertResult = await sql`
      INSERT INTO users (full_name, username, password_hash, role_id)
      VALUES (${cleanFullName}, ${cleanUsername}, ${passwordHash}, ${roleId})
      RETURNING id, full_name, username, created_on;
    `;

    const newUser = insertResult[0];

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        fullName: newUser.full_name,
        username: newUser.username,
        role_name: selectedRole,
        created_on: newUser.created_on,
      },
    });
  } catch (err: unknown) {
    console.error('Create user error:', err);
    return NextResponse.json(
      { error: 'Failed to create user.' },
      { status: 500 }
    );
  }
}
