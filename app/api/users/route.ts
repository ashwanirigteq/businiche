import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession, hashPassword } from '@/lib/auth';
import type { SafeUser, UserRole } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin privilege required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';

    let users: SafeUser[];
    if (q) {
      const searchPattern = `%${q}%`;
      const result = await sql`
        SELECT u.id, u.full_name, u.username, r.role_name, u.credits, u.created_on
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.full_name ILIKE ${searchPattern} OR u.username ILIKE ${searchPattern} OR r.role_name ILIKE ${searchPattern}
        ORDER BY u.created_on DESC;
      `;
      users = result as unknown as SafeUser[];
    } else {
      const result = await sql`
        SELECT u.id, u.full_name, u.username, r.role_name, u.credits, u.created_on
        FROM users u
        JOIN roles r ON u.role_id = r.id
        ORDER BY u.created_on DESC;
      `;
      users = result as unknown as SafeUser[];
    }

    return NextResponse.json({ users });
  } catch (err: unknown) {
    console.error('Fetch users error:', err);
    return NextResponse.json({ error: 'Failed to retrieve users.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin privilege required' }, { status: 403 });
    }

    const body = await request.json();
    const { fullName, username, password, role, credits } = body;

    if (!fullName || !username || !password) {
      return NextResponse.json({ error: 'Full name, username, and password are required.' }, { status: 400 });
    }

    const cleanFullName = String(fullName).trim();
    const cleanUsername = String(username).trim().toLowerCase();
    const rawPassword = String(password);
    const selectedRole: UserRole = role === 'Admin' ? 'Admin' : 'User';
    const initialCredits = Number(credits) >= 0 ? Number(credits) : 1000;

    if (cleanFullName.length < 2) return NextResponse.json({ error: 'Full name min 2 chars.' }, { status: 400 });
    if (cleanUsername.length < 3) return NextResponse.json({ error: 'Username min 3 chars.' }, { status: 400 });
    if (rawPassword.length < 6) return NextResponse.json({ error: 'Password min 6 chars.' }, { status: 400 });

    const existing = await sql`SELECT id FROM users WHERE LOWER(username) = ${cleanUsername} LIMIT 1;`;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Username already exists.' }, { status: 409 });
    }

    const roles = await sql`SELECT id FROM roles WHERE role_name = ${selectedRole} LIMIT 1;`;
    if (roles.length === 0) return NextResponse.json({ error: 'Role not found.' }, { status: 500 });

    const roleId = roles[0].id;
    const passwordHash = await hashPassword(rawPassword);

    const insertResult = await sql`
      INSERT INTO users (full_name, username, password_hash, role_id, credits)
      VALUES (${cleanFullName}, ${cleanUsername}, ${passwordHash}, ${roleId}, ${initialCredits})
      RETURNING id, full_name, username, credits, created_on;
    `;

    const newUser = insertResult[0];

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        fullName: newUser.full_name,
        username: newUser.username,
        role_name: selectedRole,
        credits: newUser.credits,
        created_on: newUser.created_on,
      },
    });
  } catch (err: unknown) {
    console.error('Create user error:', err);
    return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin privilege required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, fullName, role, password, credits } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    if (fullName) {
      await sql`UPDATE users SET full_name = ${String(fullName).trim()} WHERE id = ${userId};`;
    }

    if (role) {
      const selectedRole: UserRole = role === 'Admin' ? 'Admin' : 'User';
      const roleRow = await sql`SELECT id FROM roles WHERE role_name = ${selectedRole} LIMIT 1;`;
      if (roleRow.length > 0) {
        await sql`UPDATE users SET role_id = ${roleRow[0].id} WHERE id = ${userId};`;
      }
    }

    if (password && String(password).length >= 6) {
      const hash = await hashPassword(String(password));
      await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${userId};`;
    }

    if (credits !== undefined && credits !== null && !isNaN(Number(credits))) {
      await sql`UPDATE users SET credits = ${Math.max(0, Number(credits))} WHERE id = ${userId};`;
    }

    return NextResponse.json({ success: true, message: 'User account updated.' });
  } catch (err: unknown) {
    console.error('Update user error:', err);
    return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin privilege required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required for deletion.' }, { status: 400 });
    }

    if (userId === session.userId) {
      return NextResponse.json({ error: 'Cannot delete your own admin account.' }, { status: 400 });
    }

    const deleted = await sql`DELETE FROM users WHERE id = ${userId} RETURNING username;`;

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `User @${deleted[0].username} deleted successfully.`,
    });
  } catch (err: unknown) {
    console.error('Delete user error:', err);
    return NextResponse.json({ error: 'Failed to delete user account.' }, { status: 500 });
  }
}
