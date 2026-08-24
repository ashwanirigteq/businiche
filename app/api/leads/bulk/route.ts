import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from '@/lib/auth';

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leadIds } = body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'No lead IDs provided for deletion.' }, { status: 400 });
    }

    // Delete associated comments
    await sql`DELETE FROM comments WHERE lead_id = ANY(${leadIds});`;

    // Delete leads
    let result;
    if (session.role === 'Admin') {
      result = await sql`DELETE FROM leads WHERE id = ANY(${leadIds}) RETURNING id;`;
    } else {
      result = await sql`DELETE FROM leads WHERE id = ANY(${leadIds}) AND created_by = ${session.userId} RETURNING id;`;
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.length,
      message: `Successfully deleted ${result.length} lead(s).`,
    });
  } catch (err: unknown) {
    console.error('Bulk delete leads error:', err);
    return NextResponse.json({ error: 'Failed to delete leads.' }, { status: 500 });
  }
}
