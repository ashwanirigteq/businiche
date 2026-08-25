import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { sendLeadOfferEmail, sanitizeEmailAddress } from '@/lib/email';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user credentials
    const users = await sql`
      SELECT email, email_password, incoming_server_host, incoming_server_port, full_name
      FROM users WHERE id = ${session.userId} LIMIT 1;
    `;

    if (users.length === 0 || !users[0].email) {
      return NextResponse.json({
        error: 'Sender email address not configured. Please add your email and password in your Profile page.',
        messages: [],
      }, { status: 200 });
    }

    const user = users[0];

    // Query real logged emails from emails_log table
    const loggedEmails = await sql`
      SELECT id, user_id, folder, from_email, to_email, subject, body_html, body_text, unread, sent_at
      FROM emails_log
      WHERE user_id = ${session.userId}
      ORDER BY sent_at DESC
      LIMIT 100;
    `;

    const messages = loggedEmails.map((m) => {
      const isSent = m.folder === 'Sent';
      return {
        id: m.id,
        sender: m.from_email,
        recipient: m.to_email,
        subject: m.subject,
        snippet: m.body_text ? m.body_text.slice(0, 120) : (m.body_html || '').replace(/<[^>]+>/g, '').slice(0, 120),
        bodyHtml: m.body_html || null,
        bodyText: m.body_text || null,
        date: m.sent_at,
        folder: isSent ? 'Sent' : 'Inbox',
        unread: Boolean(m.unread),
      };
    });

    const unreadCount = messages.filter((m) => m.folder === 'Inbox' && m.unread).length;

    return NextResponse.json({
      success: true,
      mailboxEmail: user.email,
      incomingHost: user.incoming_server_host || 'imap.hostinger.com',
      incomingPort: user.incoming_server_port || 993,
      unreadCount,
      messages,
    });
  } catch (err: unknown) {
    console.error('Mailbox fetch error:', err);
    return NextResponse.json({ error: 'Failed to retrieve mailbox messages.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to, subject, message } = body;

    const cleanTo = sanitizeEmailAddress(to);
    if (!cleanTo || !message) {
      return NextResponse.json({ error: 'Valid recipient email and message content are required.' }, { status: 400 });
    }

    const users = await sql`
      SELECT full_name, company_name, email, email_password, smtp_host, smtp_port
      FROM users WHERE id = ${session.userId} LIMIT 1;
    `;

    if (users.length === 0 || !users[0].email || !users[0].email_password) {
      return NextResponse.json({ error: 'SMTP credentials missing. Please configure your profile first.' }, { status: 400 });
    }

    const u = users[0];
    await sendLeadOfferEmail({
      to: cleanTo,
      companyName: 'Recipient',
      customSubject: subject || 'Direct Outreach Message',
      customBody: message,
      userFullName: u.full_name,
      userCompanyName: u.company_name,
      userEmail: u.email,
      userEmailPassword: u.email_password,
      userSmtpHost: u.smtp_host,
      userSmtpPort: u.smtp_port,
      userId: session.userId,
    });

    return NextResponse.json({ success: true, message: `Email dispatched successfully to ${cleanTo}` });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
