import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from '@/lib/auth';

const DEFAULT_GENERIC_FORMAT = {
  id: 'default_generic',
  format_name: 'Generic Technology Validation Sprint Offer (Default)',
  subject: 'Partnership Proposal: 7-Day Technology Validation Sprint for ${company_name}',
  format_large_text: `<body style="margin:0;padding:0;background:#f4f7fc;font-family:Calibri,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f7fc;padding:30px 0;">
<tr>
<td align="center">
<table width="650" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:15px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
<tr>
<td style="background:#0f172a;padding:40px;text-align:center;">
<h1 style="color:#ffffff;margin:0;font-size:35px;font-weight:700;letter-spacing:0.5px;font-family:Calibri,Arial,sans-serif;">
    \${user_company_name}
</h1>
<p style="color:#e5e7eb;font-size:19px;margin:15px 0 0;font-weight:500;font-family:Calibri,Arial,sans-serif;">
    AI • Web • Mobile • CRM • Enterprise Solutions
</p>
</td>
</tr>
<tr>
<td style="padding:40px;text-align:center;">
<h2 style="color:#0f172a;margin:0 0 15px;font-size:25px;">
    What If You Could Evaluate Our Engineering Before You Commit?
</h2>
<p style="color:#555555;line-height:28px;font-size:16px;margin:0 0 18px;">
    At \${user_company_name}, we believe technology partnerships should be built on <strong>demonstrable capability — not promises.</strong>
</p>
<p style="color:#555555;line-height:28px;font-size:16px;margin:0 0 25px;">
    For selected businesses like <strong>\${company_name}</strong>, our engineering team is opening a <strong style="color:#0f172a;">7-Day Technology Validation Sprint</strong> to transform a real business requirement into a tangible technology outcome.
</p>
<a href="mailto:\${user_email}?subject=7-Day Technology Validation" style="display:inline-block;background:#dc2626;color:#ffffff;padding:14px 35px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
    Explore the Opportunity
</a>
</td>
</tr>
<tr>
<td style="padding:20px 40px 35px;">
<h3 style="text-align:center;color:#0f172a;font-size:23px;margin:0 0 20px;">
    What Happens in 7 Days?
</h3>
<table width="100%" cellpadding="10" cellspacing="0" border="0">
<tr>
<td style="font-size:15px;color:#333333;">✓ Business Requirement Assessment</td>
<td style="font-size:15px;color:#333333;">✓ Technology & Architecture Mapping</td>
</tr>
<tr>
<td style="font-size:15px;color:#333333;">✓ Solution Blueprint</td>
<td style="font-size:15px;color:#333333;">✓ Functional Demonstration</td>
</tr>
<tr>
<td style="font-size:15px;color:#333333;">✓ Technical Feasibility Validation</td>
<td style="font-size:15px;color:#333333;">✓ Product / Workflow Prototype</td>
</tr>
<tr>
<td style="font-size:15px;color:#333333;">✓ Engineering Recommendations</td>
<td style="font-size:15px;color:#333333;">✓ Clear Next-Step Roadmap</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:30px 40px;background:#f8fafc;text-align:center;">
<h3 style="color:#0f172a;font-size:22px;margin:0 0 15px;">Why We're Doing This</h3>
<p style="color:#555555;font-size:15px;line-height:26px;margin:0;">
    Instead of asking you to trust a proposal, we're giving you the opportunity to experience our <strong>engineering quality, communication, architecture thinking and execution approach</strong> first-hand.
</p>
</td>
</tr>
<tr>
<td style="padding:30px 40px 35px;">
<h3 style="text-align:center;color:#0f172a;font-size:23px;margin:0 0 20px;">Where We Can Add Value</h3>
<table width="100%" cellpadding="10" cellspacing="0" border="0">
<tr>
<td style="font-size:15px;color:#333333;">✓ Digital Product Engineering</td>
<td style="font-size:15px;color:#333333;">✓ AI & Intelligent Automation</td>
</tr>
<tr>
<td style="font-size:15px;color:#333333;">✓ Web & Mobile Platforms</td>
<td style="font-size:15px;color:#333333;">✓ CRM & Enterprise Systems</td>
</tr>
<tr>
<td style="font-size:15px;color:#333333;">✓ SaaS Product Development</td>
<td style="font-size:15px;color:#333333;">✓ Business Process Automation</td>
</tr>
<tr>
<td style="font-size:15px;color:#333333;">✓ Cloud & API Engineering</td>
<td style="font-size:15px;color:#333333;">✓ Legacy Modernization</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:35px;background:#0f172a;text-align:center;">
<h2 style="color:#ffffff;margin:0 0 10px;font-size:25px;">Don't Take Our Word For It. Experience It.</h2>
<p style="color:#dbeafe;margin:0 0 22px;font-size:16px;line-height:25px;">
    Share one technology challenge, product idea or process you want to improve.
</p>
<p style="color:#ffffff;margin:0 0 25px;font-size:17px;line-height:26px;font-weight:bold;">
    We'll invest the first 7 days in showing you what's possible.
</p>
<a href="mailto:\${user_email}?subject=Technology Validation Sprint" style="display:inline-block;background:#dc2626;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
    START THE CONVERSATION
</a>
<p style="color:#94a3b8;font-size:12px;margin:18px 0 0;">
    Available for selected business requirements.
</p>
</td>
</tr>
<tr>
<td style="padding:40px;background:#ffffff;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td width="65%" valign="top">
<h2 style="margin:0;color:#dc2626;font-size:23px;">\${user_full_name}</h2>
<p style="margin:8px 0;color:#333333;"><b>Business Executive</b></p>
<p style="margin:6px 0;color:#555555;">\${user_company_name}</p>
<p style="margin:6px 0;color:#555555;">🌐 www.rigteq.com</p>
<p style="margin:6px 0;color:#555555;">📧 \${user_email}</p>
</td>
<td width="35%" align="right" valign="middle">
<p style="color:#64748b;font-size:13px;line-height:22px;margin:0;">
    Digital Product Engineering<br>
    AI & Automation<br>
    Enterprise Technology<br>
    Cloud Solutions
</p>
</td>
</tr>
</table>
<hr style="border:0;border-top:1px solid #eeeeee;margin:30px 0;">
<p style="text-align:center;margin:0;font-size:14px;line-height:24px;">
    <span style="color:#dc2626;font-weight:bold;">AI Solutions</span>
    &nbsp;|&nbsp;
    <span style="color:#2563eb;font-weight:bold;">Product Engineering</span>
    &nbsp;|&nbsp;
    <span style="color:#dc2626;font-weight:bold;">Enterprise Solutions</span>
    &nbsp;|&nbsp;
    <span style="color:#2563eb;font-weight:bold;">Automation</span>
</p>
<p style="font-size:12px;color:#888888;text-align:center;margin:20px 0 0;">
    © 2026 \${user_company_name}. All Rights Reserved.
</p>
<p style="font-size:12px;color:#94a3b8;text-align:center;margin:18px 0 0;">
    If you no longer wish to receive these emails, you can <a href="mailto:\${user_email}?subject=Unsubscribe" style="color:#dc2626;text-decoration:underline;">Unsubscribe here</a>.
</p>
</td>
</tr>
<tr>
<td style="height:15px;background:#0f172a;font-size:0;line-height:0;">&nbsp;</td>
</tr>
</table>
</td>
</tr>
</table>
</body>`,
  created_at: new Date().toISOString(),
};

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formats = await sql`
      SELECT id, format_name, user_id, subject, format_large_text, created_at
      FROM formats
      WHERE user_id = ${session.userId} OR user_id IS NULL
      ORDER BY created_at DESC;
    `;

    return NextResponse.json({
      formats: [DEFAULT_GENERIC_FORMAT, ...formats],
    });
  } catch (err: unknown) {
    console.error('Fetch email formats error:', err);
    return NextResponse.json({ error: 'Failed to retrieve email formats.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { formatName, subject, formatLargeText } = body;

    if (!formatName || typeof formatName !== 'string' || formatName.trim().length < 2) {
      return NextResponse.json({ error: 'Format name is required (min 2 characters).' }, { status: 400 });
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length < 2) {
      return NextResponse.json({ error: 'Subject is required.' }, { status: 400 });
    }

    if (!formatLargeText || typeof formatLargeText !== 'string' || formatLargeText.trim().length < 5) {
      return NextResponse.json({ error: 'Email body text is required (min 5 characters).' }, { status: 400 });
    }

    const inserted = await sql`
      INSERT INTO formats (format_name, user_id, subject, format_large_text)
      VALUES (${formatName.trim()}, ${session.userId}, ${subject.trim()}, ${formatLargeText.trim()})
      RETURNING id, format_name, user_id, subject, format_large_text, created_at;
    `;

    return NextResponse.json({
      success: true,
      message: `Format "${formatName.trim()}" saved successfully.`,
      format: inserted[0],
    });
  } catch (err: unknown) {
    console.error('Save email format error:', err);
    return NextResponse.json({ error: 'Failed to save email format.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Format ID is required.' }, { status: 400 });
    }

    await sql`
      DELETE FROM formats WHERE id = ${id} AND user_id = ${session.userId};
    `;

    return NextResponse.json({ success: true, message: 'Format deleted.' });
  } catch (err: unknown) {
    console.error('Delete format error:', err);
    return NextResponse.json({ error: 'Failed to delete format.' }, { status: 500 });
  }
}
