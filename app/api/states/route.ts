import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    let states;
    if (query.trim()) {
      states = await sql`
        SELECT id, state_name, cities_json
        FROM states
        WHERE LOWER(state_name) LIKE LOWER(${`%${query.trim()}%`})
        ORDER BY state_name ASC;
      `;
    } else {
      states = await sql`
        SELECT id, state_name, cities_json
        FROM states
        ORDER BY state_name ASC;
      `;
    }

    return NextResponse.json({ states });
  } catch (err: unknown) {
    console.error('Fetch states error:', err);
    return NextResponse.json({ error: 'Failed to fetch states.' }, { status: 500 });
  }
}
