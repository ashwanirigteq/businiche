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
    const q = searchParams.get('q')?.trim() || '';
    const industry = searchParams.get('industry')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const source = searchParams.get('source')?.trim() || '';
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.max(Math.min(parseInt(searchParams.get('limit') || '25', 10), 200), 1);
    const offset = (page - 1) * limit;

    // Use parameterized queries
    const searchPattern = q ? `%${q}%` : null;

    let leadsQuery;
    let countQuery;

    if (searchPattern && industry && status && source) {
      leadsQuery = sql`
        SELECT id, company_name, website, phone, email, address, industry, status, source, source_url, created_on
        FROM leads
        WHERE (
          company_name ILIKE ${searchPattern} OR
          industry ILIKE ${searchPattern} OR
          COALESCE(address, '') ILIKE ${searchPattern} OR
          COALESCE(phone, '') ILIKE ${searchPattern} OR
          COALESCE(email, '') ILIKE ${searchPattern} OR
          COALESCE(website, '') ILIKE ${searchPattern}
        )
        AND industry = ${industry} AND status = ${status} AND source = ${source}
        ORDER BY created_on DESC LIMIT ${limit} OFFSET ${offset};
      `;
      countQuery = sql`
        SELECT COUNT(*)::int as total FROM leads
        WHERE (
          company_name ILIKE ${searchPattern} OR
          industry ILIKE ${searchPattern} OR
          COALESCE(address, '') ILIKE ${searchPattern} OR
          COALESCE(phone, '') ILIKE ${searchPattern} OR
          COALESCE(email, '') ILIKE ${searchPattern} OR
          COALESCE(website, '') ILIKE ${searchPattern}
        )
        AND industry = ${industry} AND status = ${status} AND source = ${source};
      `;
    } else if (searchPattern && industry && status) {
      leadsQuery = sql`
        SELECT id, company_name, website, phone, email, address, industry, status, source, source_url, created_on
        FROM leads
        WHERE (
          company_name ILIKE ${searchPattern} OR
          industry ILIKE ${searchPattern} OR
          COALESCE(address, '') ILIKE ${searchPattern} OR
          COALESCE(phone, '') ILIKE ${searchPattern} OR
          COALESCE(email, '') ILIKE ${searchPattern} OR
          COALESCE(website, '') ILIKE ${searchPattern}
        )
        AND industry = ${industry} AND status = ${status}
        ORDER BY created_on DESC LIMIT ${limit} OFFSET ${offset};
      `;
      countQuery = sql`
        SELECT COUNT(*)::int as total FROM leads
        WHERE (
          company_name ILIKE ${searchPattern} OR
          industry ILIKE ${searchPattern} OR
          COALESCE(address, '') ILIKE ${searchPattern} OR
          COALESCE(phone, '') ILIKE ${searchPattern} OR
          COALESCE(email, '') ILIKE ${searchPattern} OR
          COALESCE(website, '') ILIKE ${searchPattern}
        )
        AND industry = ${industry} AND status = ${status};
      `;
    } else if (searchPattern && industry) {
      leadsQuery = sql`
        SELECT id, company_name, website, phone, email, address, industry, status, source, source_url, created_on
        FROM leads
        WHERE (
          company_name ILIKE ${searchPattern} OR
          industry ILIKE ${searchPattern} OR
          COALESCE(address, '') ILIKE ${searchPattern} OR
          COALESCE(phone, '') ILIKE ${searchPattern} OR
          COALESCE(email, '') ILIKE ${searchPattern} OR
          COALESCE(website, '') ILIKE ${searchPattern}
        )
        AND industry = ${industry}
        ORDER BY created_on DESC LIMIT ${limit} OFFSET ${offset};
      `;
      countQuery = sql`
        SELECT COUNT(*)::int as total FROM leads
        WHERE (
          company_name ILIKE ${searchPattern} OR
          industry ILIKE ${searchPattern} OR
          COALESCE(address, '') ILIKE ${searchPattern} OR
          COALESCE(phone, '') ILIKE ${searchPattern} OR
          COALESCE(email, '') ILIKE ${searchPattern} OR
          COALESCE(website, '') ILIKE ${searchPattern}
        )
        AND industry = ${industry};
      `;
    } else if (searchPattern && status) {
      leadsQuery = sql`
        SELECT id, company_name, website, phone, email, address, industry, status, source, source_url, created_on
        FROM leads
        WHERE (
          company_name ILIKE ${searchPattern} OR
          industry ILIKE ${searchPattern} OR
          COALESCE(address, '') ILIKE ${searchPattern} OR
          COALESCE(phone, '') ILIKE ${searchPattern} OR
          COALESCE(email, '') ILIKE ${searchPattern} OR
          COALESCE(website, '') ILIKE ${searchPattern}
        )
        AND status = ${status}
        ORDER BY created_on DESC LIMIT ${limit} OFFSET ${offset};
      `;
      countQuery = sql`
        SELECT COUNT(*)::int as total FROM leads
        WHERE (
          company_name ILIKE ${searchPattern} OR
          industry ILIKE ${searchPattern} OR
          COALESCE(address, '') ILIKE ${searchPattern} OR
          COALESCE(phone, '') ILIKE ${searchPattern} OR
          COALESCE(email, '') ILIKE ${searchPattern} OR
          COALESCE(website, '') ILIKE ${searchPattern}
        )
        AND status = ${status};
      `;
    } else if (searchPattern) {
      leadsQuery = sql`
        SELECT id, company_name, website, phone, email, address, industry, status, source, source_url, created_on
        FROM leads
        WHERE (
          company_name ILIKE ${searchPattern} OR
          industry ILIKE ${searchPattern} OR
          COALESCE(address, '') ILIKE ${searchPattern} OR
          COALESCE(phone, '') ILIKE ${searchPattern} OR
          COALESCE(email, '') ILIKE ${searchPattern} OR
          COALESCE(website, '') ILIKE ${searchPattern}
        )
        ORDER BY created_on DESC LIMIT ${limit} OFFSET ${offset};
      `;
      countQuery = sql`
        SELECT COUNT(*)::int as total FROM leads
        WHERE (
          company_name ILIKE ${searchPattern} OR
          industry ILIKE ${searchPattern} OR
          COALESCE(address, '') ILIKE ${searchPattern} OR
          COALESCE(phone, '') ILIKE ${searchPattern} OR
          COALESCE(email, '') ILIKE ${searchPattern} OR
          COALESCE(website, '') ILIKE ${searchPattern}
        );
      `;
    } else if (industry && status) {
      leadsQuery = sql`
        SELECT id, company_name, website, phone, email, address, industry, status, source, source_url, created_on
        FROM leads
        WHERE industry = ${industry} AND status = ${status}
        ORDER BY created_on DESC LIMIT ${limit} OFFSET ${offset};
      `;
      countQuery = sql`
        SELECT COUNT(*)::int as total FROM leads WHERE industry = ${industry} AND status = ${status};
      `;
    } else if (industry) {
      leadsQuery = sql`
        SELECT id, company_name, website, phone, email, address, industry, status, source, source_url, created_on
        FROM leads
        WHERE industry = ${industry}
        ORDER BY created_on DESC LIMIT ${limit} OFFSET ${offset};
      `;
      countQuery = sql`
        SELECT COUNT(*)::int as total FROM leads WHERE industry = ${industry};
      `;
    } else if (status) {
      leadsQuery = sql`
        SELECT id, company_name, website, phone, email, address, industry, status, source, source_url, created_on
        FROM leads
        WHERE status = ${status}
        ORDER BY created_on DESC LIMIT ${limit} OFFSET ${offset};
      `;
      countQuery = sql`
        SELECT COUNT(*)::int as total FROM leads WHERE status = ${status};
      `;
    } else if (source) {
      leadsQuery = sql`
        SELECT id, company_name, website, phone, email, address, industry, status, source, source_url, created_on
        FROM leads
        WHERE source = ${source}
        ORDER BY created_on DESC LIMIT ${limit} OFFSET ${offset};
      `;
      countQuery = sql`
        SELECT COUNT(*)::int as total FROM leads WHERE source = ${source};
      `;
    } else {
      leadsQuery = sql`
        SELECT id, company_name, website, phone, email, address, industry, status, source, source_url, created_on
        FROM leads
        ORDER BY created_on DESC LIMIT ${limit} OFFSET ${offset};
      `;
      countQuery = sql`SELECT COUNT(*)::int as total FROM leads;`;
    }

    const [leads, countResult, industriesResult, statusesResult] = await Promise.all([
      leadsQuery,
      countQuery,
      sql`SELECT DISTINCT industry FROM leads WHERE industry IS NOT NULL ORDER BY industry ASC;`,
      sql`SELECT DISTINCT status FROM leads WHERE status IS NOT NULL ORDER BY status ASC;`,
    ]);

    const total = countResult[0]?.total ?? leads.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const industries = industriesResult.map((r) => r.industry);
    const statuses = statusesResult.map((r) => r.status);

    return NextResponse.json({
      leads,
      total,
      page,
      limit,
      totalPages,
      industries,
      statuses,
    });
  } catch (err: unknown) {
    console.error('Fetch leads error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve leads from database.' },
      { status: 500 }
    );
  }
}
