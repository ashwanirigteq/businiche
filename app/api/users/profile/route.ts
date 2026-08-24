import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession, hashPassword } from '@/lib/auth';

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, password } = body;

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters.' }, { status: 400 });
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
      }
      const hash = await hashPassword(password);
      await sql`
        UPDATE users SET full_name = ${fullName.trim()}, password_hash = ${hash}
        WHERE id = ${session.userId};
      `;
    } else {
      await sql`
        UPDATE users SET full_name = ${fullName.trim()}
        WHERE id = ${session.userId};
      `;
    }

    return NextResponse.json({ success: true, fullName: fullName.trim() });
  } catch (err: unknown) {
    console.error('Profile update error:', err);
    return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
  }
}
