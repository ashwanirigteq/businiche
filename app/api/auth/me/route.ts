import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { getUserCreditDetails } from '@/lib/credits';

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch fresh user details including created_on and credit info from DB
  try {
    const result = await sql`
      SELECT u.id, u.full_name, u.username, r.role_name, u.created_on
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ${session.userId}
      LIMIT 1;
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const dbUser = result[0];
    const creditDetails = await getUserCreditDetails(dbUser.id, dbUser.role_name);

    return NextResponse.json({
      user: {
        id: dbUser.id,
        userId: dbUser.id,
        username: dbUser.username,
        fullName: dbUser.full_name,
        role: dbUser.role_name,
        created_on: dbUser.created_on,
        credits: creditDetails.credits,
        lastCreditReset: creditDetails.lastCreditReset,
        nextCreditDate: creditDetails.nextCreditDate,
      },
    });
  } catch {
    // Fallback to session data if DB lookup fails
    return NextResponse.json({
      user: {
        id: session.userId,
        userId: session.userId,
        username: session.username,
        fullName: session.fullName,
        role: session.role,
        created_on: null,
        credits: session.role === 'Admin' ? Infinity : 0,
        nextCreditDate: null,
      },
    });
  }
}

