import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import type { LeadStatus } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.max(Math.min(parseInt(searchParams.get('limit') || '10', 10), 50), 1);
    const offset = (page - 1) * limit;

    const [comments, countResult] = await Promise.all([
      sql`
        SELECT 
          c.id, c.lead_id, c.user_id, c.status, c.comment_text, c.created_at,
          u.full_name, u.username
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.lead_id = ${id}
        ORDER BY c.created_at DESC
        LIMIT ${limit} OFFSET ${offset};
      `,
      sql`SELECT COUNT(*)::int as total FROM comments WHERE lead_id = ${id};`,
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      comments,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (err: unknown) {
    console.error('Fetch comments error:', err);
    return NextResponse.json({ error: 'Failed to retrieve comments' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { comment_text, status } = body;

    if (!comment_text || typeof comment_text !== 'string' || !comment_text.trim()) {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
      );
    }

    const newStatus: LeadStatus = (status as LeadStatus) || 'New';
    const cleanComment = comment_text.trim();

    // 1. Insert the new comment
    const insertedComment = await sql`
      INSERT INTO comments (lead_id, user_id, status, comment_text)
      VALUES (${id}, ${session.userId}, ${newStatus}, ${cleanComment})
      RETURNING id, lead_id, user_id, status, comment_text, created_at;
    `;

    // 2. Update the lead's status in the leads table
    const updatedLead = await sql`
      UPDATE leads
      SET status = ${newStatus}
      WHERE id = ${id}
      RETURNING id, company_name, status;
    `;

    const commentData = {
      ...insertedComment[0],
      full_name: session.fullName,
      username: session.username,
    };

    return NextResponse.json({
      success: true,
      message: `Comment added and lead status updated to "${newStatus}".`,
      comment: commentData,
      lead: updatedLead[0],
    });
  } catch (err: unknown) {
    console.error('Add comment error:', err);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json({ error: 'commentId query param is required' }, { status: 400 });
    }

    // Allow user to delete their own comment, or Admin to delete any comment
    let deleted;
    if (session.role === 'Admin') {
      deleted = await sql`DELETE FROM comments WHERE id = ${commentId} RETURNING id;`;
    } else {
      deleted = await sql`
        DELETE FROM comments
        WHERE id = ${commentId} AND user_id = ${session.userId}
        RETURNING id;
      `;
    }

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Comment not found or permission denied.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Comment deleted.' });
  } catch (err: unknown) {
    console.error('Delete comment error:', err);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
