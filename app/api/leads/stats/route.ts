import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await sql`SELECT COUNT(*)::int as total FROM comments;`;
    const totalComments = result[0]?.total ?? 0;

    return NextResponse.json({ totalComments });
  } catch (err) {
    console.error('Stats error:', err);
    return NextResponse.json({ totalComments: 0 });
  }
}
