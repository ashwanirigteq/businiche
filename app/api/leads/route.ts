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
    const source = searchParams.get('source')?.trim() || '';

    // Build query conditions safely using Neon SQL
    let leads;
    let countResult;

    if (q && industry && source) {
      const searchPattern = `%${q}%`;
      leads = await sql`
        SELECT id, company_name, website, phone, address, industry, source, source_url, created_on
        FROM leads
        WHERE (
          company_name ILIKE ${searchPattern} OR
          industry ILIKE ${searchPattern} OR
          COALESCE(address, '') ILIKE ${searchPattern} OR
          COALESCE(phone, '') ILIKE ${searchPattern} OR
          COALESCE(website, '') ILIKE ${searchPattern}
        )
        AND industry = ${industry}
        AND source = ${source}
        ORDER BY created_on DESC;
      `;
      countResult = await sql`
        SELECT COUNT(*)::int as total FROM leads
        WHERE (
          company_name ILIKE ${searchPattern} OR
          industry ILIKE ${searchPattern} OR
          COALESCE(address, '') ILIKE ${searchPattern} OR
          COALESCE(phone, '') ILIKE ${searchPattern} OR
          COALESCE(website, '') ILIKE ${searchPattern}
        )
        AND industry = ${industry}
        AND source = ${source};
      `;
    } else if (q && industry) {
      const searchPattern = `%${q}%`;
      leads = await sql`
        SELECT id, company_name, website, phone, address, industry, source, source_url, created_on
        FROM leads
        WHERE (
          company_name ILIKE ${searchPattern} OR
          industry ILIKE ${searchPattern} OR
          COALESCE(address, '') ILIKE ${searchPattern} OR
          COALESCE(phone, '') ILIKE ${searchPattern} OR
          COALESCE(website, '') ILIKE ${searchPattern}
        )
        AND industry = ${industry}
        ORDER BY created_on DESC;
      `;
      countResult = await sql`
        SELECT COUNT(*)::int as total FROM leads
        WHERE (
          company_name ILIKE ${searchPattern} OR
          industry ILIKE ${searchPattern} OR
          COALESCE(address, '') ILIKE ${searchPattern} OR
          COALESCE(phone, '') ILIKE ${searchPattern} OR
          COALESCE(website, '') ILIKE ${searchPattern}
        )
        AND industry = ${industry};
      `;
    } else if (q && source) {
      const searchPattern = `%${q}%`;
      leads = await sql`
        SELECT id, company_name, website, phone, address, industry, source, source_url, created_on
        FROM leads
        WHERE (
          company_name ILIKE ${searchPattern} OR
          industry ILIKE ${searchPattern} OR
          COALESCE(address, '') ILIKE ${searchPattern} OR
          COALESCE(phone, '') ILIKE ${searchPattern} OR
          COALESCE(website, '') ILIKE ${searchPattern}
        )
        AND source = ${source}
        ORDER BY created_on DESC;
      `;
      countResult = await sql`
        SELECT COUNT(*)::int as total FROM leads
        WHERE (
          company_name ILIKE ${searchPattern} OR
          industry ILIKE ${searchPattern} OR
          COALESCE(address, '') ILIKE ${searchPattern} OR
          COALESCE(phone, '') ILIKE ${searchPattern} OR
          COALESCE(website, '') ILIKE ${searchPattern}
        )
        AND source = ${source};
      `;
    } else if (q) {
      const searchPattern = `%${q}%`;
      leads = await sql`
        SELECT id, company_name, website, phone, address, industry, source, source_url, created_on
        FROM leads
        WHERE (
          company_name ILIKE ${searchPattern} OR
          industry ILIKE ${searchPattern} OR
          COALESCE(address, '') ILIKE ${searchPattern} OR
          COALESCE(phone, '') ILIKE ${searchPattern} OR
          COALESCE(website, '') ILIKE ${searchPattern}
        )
        ORDER BY created_on DESC;
      `;
      countResult = await sql`
        SELECT COUNT(*)::int as total FROM leads
        WHERE (
          company_name ILIKE ${searchPattern} OR
          industry ILIKE ${searchPattern} OR
          COALESCE(address, '') ILIKE ${searchPattern} OR
          COALESCE(phone, '') ILIKE ${searchPattern} OR
          COALESCE(website, '') ILIKE ${searchPattern}
        );
      `;
    } else if (industry && source) {
      leads = await sql`
        SELECT id, company_name, website, phone, address, industry, source, source_url, created_on
        FROM leads
        WHERE industry = ${industry} AND source = ${source}
        ORDER BY created_on DESC;
      `;
      countResult = await sql`
        SELECT COUNT(*)::int as total FROM leads WHERE industry = ${industry} AND source = ${source};
      `;
    } else if (industry) {
      leads = await sql`
        SELECT id, company_name, website, phone, address, industry, source, source_url, created_on
        FROM leads
        WHERE industry = ${industry}
        ORDER BY created_on DESC;
      `;
      countResult = await sql`
        SELECT COUNT(*)::int as total FROM leads WHERE industry = ${industry};
      `;
    } else if (source) {
      leads = await sql`
        SELECT id, company_name, website, phone, address, industry, source, source_url, created_on
        FROM leads
        WHERE source = ${source}
        ORDER BY created_on DESC;
      `;
      countResult = await sql`
        SELECT COUNT(*)::int as total FROM leads WHERE source = ${source};
      `;
    } else {
      leads = await sql`
        SELECT id, company_name, website, phone, address, industry, source, source_url, created_on
        FROM leads
        ORDER BY created_on DESC;
      `;
      countResult = await sql`SELECT COUNT(*)::int as total FROM leads;`;
    }

    // Get list of distinct industries for filter dropdown
    const industriesResult = await sql`
      SELECT DISTINCT industry FROM leads ORDER BY industry ASC;
    `;
    const industries = industriesResult.map((r) => r.industry);

    const total = countResult[0]?.total ?? leads.length;

    return NextResponse.json({
      leads,
      total,
      industries,
    });
  } catch (err: unknown) {
    console.error('Fetch leads error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve leads from database.' },
      { status: 500 }
    );
  }
}
