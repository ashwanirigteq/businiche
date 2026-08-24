import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.role === 'Admin';
    const userId = session.userId;

    const result = isAdmin
      ? await sql`SELECT COUNT(*)::int as total FROM comments;`
      : await sql`
          SELECT COUNT(*)::int as total
          FROM comments c
          JOIN leads l ON c.lead_id = l.id
          WHERE l.created_by = ${userId};
        `;

    const totalComments = result[0]?.total ?? 0;

    return NextResponse.json({ totalComments });
  } catch (err) {
    console.error('Stats error:', err);
    return NextResponse.json({ totalComments: 0 });
  }
}

