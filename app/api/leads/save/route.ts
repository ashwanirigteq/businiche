import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { saveLeadToDatabase, saveBulkLeadsToDatabase } from '@/lib/places';
import type { DiscoveredLead } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const body = await request.json();
    const { lead, leads } = body;

    // Single lead save
    if (lead) {
      const saved = await saveLeadToDatabase(lead as DiscoveredLead, session.userId);
      return NextResponse.json({
        success: true,
        message: `Lead "${saved.company_name}" saved successfully.`,
        lead: saved,
      });
    }

    // Bulk leads save
    if (Array.isArray(leads) && leads.length > 0) {
      const { savedCount, savedLeads } = await saveBulkLeadsToDatabase(leads as DiscoveredLead[], session.userId);
      return NextResponse.json({
        success: true,
        message: `Successfully saved ${savedCount} leads to the database.`,
        savedCount,
        leads: savedLeads,
      });
    }

    return NextResponse.json(
      { error: 'No lead data provided to save.' },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error('Save lead error:', err);
    const message = err instanceof Error ? err.message : 'Failed to save lead to database.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
