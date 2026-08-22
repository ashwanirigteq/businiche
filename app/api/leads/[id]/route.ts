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

    const leads = await sql`
      SELECT id, company_name, website, phone, email, address, industry, status, source, source_url, created_on
      FROM leads
      WHERE id = ${id}
      LIMIT 1;
    `;

    if (leads.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const commentCountResult = await sql`
      SELECT COUNT(*)::int as total FROM comments WHERE lead_id = ${id};
    `;

    return NextResponse.json({
      lead: leads[0],
      commentCount: commentCountResult[0]?.total || 0,
    });
  } catch (err: unknown) {
    console.error('Fetch lead by ID error:', err);
    return NextResponse.json({ error: 'Failed to retrieve lead details' }, { status: 500 });
  }
}

export async function PATCH(
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
    const { status, email, phone, website, company_name } = body;

    const updated = await sql`
      UPDATE leads
      SET 
        status = COALESCE(${status as LeadStatus || null}, status),
        email = COALESCE(${email || null}, email),
        phone = COALESCE(${phone || null}, phone),
        website = COALESCE(${website || null}, website),
        company_name = COALESCE(${company_name || null}, company_name)
      WHERE id = ${id}
      RETURNING id, company_name, website, phone, email, address, industry, status, source, source_url, created_on;
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Lead updated successfully',
      lead: updated[0],
    });
  } catch (err: unknown) {
    console.error('Update lead error:', err);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}
