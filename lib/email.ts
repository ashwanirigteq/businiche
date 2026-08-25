import nodemailer from 'nodemailer';
import { sql } from '@/lib/db';

/**
 * Fetch SMTP credentials strictly from user profile settings in users table.
 * Construct "from" as: Full Name <email> (Full name and email picked from users table)
 * No fallback || static values or env property for outreach emails.
 */
function getSmtpConfig(
  customHost?: string,
  customPort?: number | string,
  customEmail?: string,
  customPassword?: string,
  userFullName?: string
) {
  const host = customHost?.trim();
  const port = customPort ? parseInt(String(customPort), 10) : 465;
  const user = customEmail?.trim();
  const pass = customPassword?.trim();
  const fullName = userFullName?.trim();

  if (!host || !user || !pass) {
    throw new Error('Email SMTP details incomplete. Please add your Sender Email, SMTP Host, SMTP Port, and Password in your Profile Page.');
  }

  // Format: Full Name <email> (Picked strictly from users table)
  const from = fullName ? `${fullName} <${user}>` : user;

  return { host, port, user, pass, from };
}

/** Create nodemailer transporter pointing strictly to user's custom SMTP server */
export function getTransporter(
  customHost?: string,
  customPort?: number | string,
  customEmail?: string,
  customPassword?: string,
  userFullName?: string
) {
  const config = getSmtpConfig(customHost, customPort, customEmail, customPassword, userFullName);
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Operations Transporter helper for System Notifications & OTP Emails (from ops@rigteq.com)
 */
function getOpsTransporter() {
  const host = process.env.OPS_SMTP_HOST || 'smtp.hostinger.com';
  const port = parseInt(process.env.OPS_SMTP_PORT || '465', 10);
  const user = process.env.OPS_SMTP_USER || 'ops@rigteq.com';
  const pass = process.env.OPS_SMTP_PASS;
  const from = process.env.OPS_SMTP_FROM || 'Businiche Operations <ops@rigteq.com>';

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  return { transporter, from, user };
}

export interface EmailPayload {
  to: string;
  companyName: string;
  contactName?: string;
  industry?: string;
  customSubject?: string;
  customBody?: string;
  userFullName?: string;
  userCompanyName?: string;
  userEmail?: string;
  userEmailPassword?: string;
  userSmtpHost?: string;
  userSmtpPort?: number | string;
  userId?: string;
}

/**
 * Dynamically replace placeholders like ${company_name}, ${industry}, ${user_full_name}, ${user_company_name}, ${user_email}
 */
export function replaceDynamicPlaceholders(
  template: string,
  data: {
    companyName?: string;
    contactName?: string;
    industry?: string;
    userFullName?: string;
    userCompanyName?: string;
    userEmail?: string;
  }
): string {
  if (!template) return '';
  return template
    .replace(/\$\{company_name\}/gi, data.companyName || 'Valued Partner')
    .replace(/\$\{contact_name\}/gi, data.contactName || data.companyName || 'Team')
    .replace(/\$\{industry\}/gi, data.industry || 'your industry')
    .replace(/\$\{user_full_name\}/gi, data.userFullName || '')
    .replace(/\$\{user_company_name\}/gi, data.userCompanyName || '')
    .replace(/\$\{user_email\}/gi, data.userEmail || '');
}

/**
 * Generate generic HTML + Plain-Text offer email based on exact user specification with Unsubscribe button
 */
export function generateOfferEmailTemplate(
  companyName: string,
  contactName?: string,
  industry?: string,
  userFullName?: string,
  userCompanyName?: string,
  userEmail?: string
) {
  const greeting = contactName ? `Hi ${contactName},` : `Hi ${companyName} Team,`;
  const senderCompany = userCompanyName || 'Rigteq Software';
  const senderName = userFullName || 'Ashwani Singh';
  const senderEmail = userEmail || 'sales@rigteq.com';

  const subject = `Partnership Proposal: 7-Day Technology Validation Sprint for ${companyName}`;

  const text = `${greeting}

What If You Could Evaluate Our Engineering Before You Commit?

At ${senderCompany}, we believe technology partnerships should be built on demonstrable capability — not promises.

For selected businesses like ${companyName}, our engineering team is opening a 7-Day Technology Validation Sprint to transform a real business requirement into a tangible technology outcome.

What Happens in 7 Days?
✓ Business Requirement Assessment
✓ Technology & Architecture Mapping
✓ Solution Blueprint
✓ Functional Demonstration
✓ Technical Feasibility Validation
✓ Product / Workflow Prototype
✓ Engineering Recommendations
✓ Clear Next-Step Roadmap

Why We're Doing This:
Instead of asking you to trust a proposal, we're giving you the opportunity to experience our engineering quality, communication, architecture thinking and execution approach first-hand.

Where We Can Add Value:
✓ Digital Product Engineering
✓ AI & Intelligent Automation
✓ Web & Mobile Platforms
✓ CRM & Enterprise Systems
✓ SaaS Product Development
✓ Business Process Automation
✓ Cloud & API Engineering
✓ Legacy Modernization

Best regards,
${senderName}
${senderCompany}
${senderEmail}

Unsubscribe: mailto:${senderEmail}?subject=Unsubscribe
`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fc;font-family:Calibri,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f7fc;padding:30px 0;">
<tr>
<td align="center">

<!-- Main Container -->
<table width="650" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:15px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">

<!-- HEADER -->
<tr>
<td style="background:#0f172a;padding:40px;text-align:center;">
<h1 style="color:#ffffff;margin:0;font-size:35px;font-weight:700;letter-spacing:0.5px;font-family:Calibri,Arial,sans-serif;">
    ${senderCompany}
</h1>
<p style="color:#e5e7eb;font-size:19px;margin:15px 0 0;font-weight:500;font-family:Calibri,Arial,sans-serif;">
    AI • Web • Mobile • CRM • Enterprise Solutions
</p>
</td>
</tr>

<!-- INTRODUCTION -->
<tr>
<td style="padding:40px;text-align:center;">
<h2 style="color:#0f172a;margin:0 0 15px;font-size:25px;">
    What If You Could Evaluate Our Engineering Before You Commit?
</h2>
<p style="color:#555555;line-height:28px;font-size:16px;margin:0 0 18px;">
    At ${senderCompany}, we believe technology partnerships should be built on <strong>demonstrable capability — not promises.</strong>
</p>
<p style="color:#555555;line-height:28px;font-size:16px;margin:0 0 25px;">
    For selected businesses like <strong>${companyName}</strong>, our engineering team is opening a
    <strong style="color:#0f172a;">7-Day Technology Validation Sprint</strong> to transform a real business requirement into a tangible technology outcome.
</p>
<a href="mailto:${senderEmail}?subject=7-Day Technology Validation" style="display:inline-block;background:#dc2626;color:#ffffff;padding:14px 35px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
    Explore the Opportunity
</a>
</td>
</tr>

<!-- OFFER -->
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

<!-- VALUE PROPOSITION -->
<tr>
<td style="padding:30px 40px;background:#f8fafc;text-align:center;">
<h3 style="color:#0f172a;font-size:22px;margin:0 0 15px;">Why We're Doing This</h3>
<p style="color:#555555;font-size:15px;line-height:26px;margin:0;">
    Instead of asking you to trust a proposal, we're giving you the opportunity to experience our <strong>engineering quality, communication, architecture thinking and execution approach</strong> first-hand.
</p>
</td>
</tr>

<!-- EXPERTISE -->
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

<!-- CTA -->
<tr>
<td style="padding:35px;background:#0f172a;text-align:center;">
<h2 style="color:#ffffff;margin:0 0 10px;font-size:25px;">Don't Take Our Word For It. Experience It.</h2>
<p style="color:#dbeafe;margin:0 0 22px;font-size:16px;line-height:25px;">
    Share one technology challenge, product idea or process you want to improve.
</p>
<p style="color:#ffffff;margin:0 0 25px;font-size:17px;line-height:26px;font-weight:bold;">
    We'll invest the first 7 days in showing you what's possible.
</p>
<a href="mailto:${senderEmail}?subject=Technology Validation Sprint" style="display:inline-block;background:#dc2626;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
    START THE CONVERSATION
</a>
<p style="color:#94a3b8;font-size:12px;margin:18px 0 0;">
    Available for selected business requirements.
</p>
</td>
</tr>

<!-- CONTACT & FOOTER -->
<tr>
<td style="padding:40px;background:#ffffff;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td width="65%" valign="top">
<h2 style="margin:0;color:#dc2626;font-size:23px;">${senderName}</h2>
<p style="margin:8px 0;color:#333333;"><b>Business Executive</b></p>
<p style="margin:6px 0;color:#555555;">${senderCompany}</p>
<p style="margin:6px 0;color:#555555;">🌐 www.rigteq.com</p>
<p style="margin:6px 0;color:#555555;">📧 ${senderEmail}</p>
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
    © 2026 ${senderCompany}. All Rights Reserved.
</p>

<p style="font-size:12px;color:#94a3b8;text-align:center;margin:18px 0 0;">
    If you no longer wish to receive these emails, you can <a href="mailto:${senderEmail}?subject=Unsubscribe" style="color:#dc2626;text-decoration:underline;">Unsubscribe here</a>.
</p>

</td>
</tr>

<!-- Bottom Bar -->
<tr>
<td style="height:15px;background:#0f172a;font-size:0;line-height:0;">&nbsp;</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;

  return { subject, html, text };
}

/**
 * Convert plain text custom body into responsive HTML while preserving paragraph breaks and adding Unsubscribe button at the bottom
 */
export function formatPlainTextAsHtml(plainText: string, senderCompany = '', senderEmail = ''): string {
  if (/^\s*<[a-z][\s\S]*>/i.test(plainText.trim())) {
    if (!plainText.toLowerCase().includes('unsubscribe')) {
      const unsubFooter = `<div style="text-align:center;padding:20px;font-size:12px;color:#94a3b8;">If you no longer wish to receive these emails, you can <a href="mailto:${senderEmail}?subject=Unsubscribe" style="color:#dc2626;text-decoration:underline;">Unsubscribe here</a>.</div>`;
      return plainText + unsubFooter;
    }
    return plainText;
  }

  const escaped = plainText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const paragraphs = escaped
    .split(/\n\s*\n/)
    .map((p) => `<p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f7fc;font-family:Calibri,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f7fc;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:15px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:#0f172a;padding:28px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">${senderCompany || 'Outreach'}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              ${paragraphs}
              <hr style="border:0;border-top:1px solid #eeeeee;margin:30px 0;">
              <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">
                If you no longer wish to receive these emails, you can <a href="mailto:${senderEmail}?subject=Unsubscribe" style="color:#dc2626;text-decoration:underline;">Unsubscribe here</a>.
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
</body>
</html>
  `;
}

/**
 * Clean & validate recipient email address to prevent SMTP 501 5.1.3 syntax errors
 */
export function sanitizeEmailAddress(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let cleaned = raw.trim().replace(/^["'<]+|["'>]+$/g, '').trim().toLowerCase();

  const angleMatch = cleaned.match(/<([^>]+)>/);
  if (angleMatch) {
    cleaned = angleMatch[1].trim();
  }

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return EMAIL_REGEX.test(cleaned) ? cleaned : null;
}

/**
 * Send an offer email to a single lead with clean anti-spam headers and plain-text fallback
 */
export async function sendLeadOfferEmail(payload: EmailPayload) {
  const cleanTo = sanitizeEmailAddress(payload.to);
  if (!cleanTo) {
    throw new Error(`Invalid recipient email syntax: "${payload.to}"`);
  }

  const config = getSmtpConfig(
    payload.userSmtpHost,
    payload.userSmtpPort,
    payload.userEmail,
    payload.userEmailPassword,
    payload.userFullName
  );
  const transporter = getTransporter(
    payload.userSmtpHost,
    payload.userSmtpPort,
    payload.userEmail,
    payload.userEmailPassword,
    payload.userFullName
  );

  const defaultTemplate = generateOfferEmailTemplate(
    payload.companyName,
    payload.contactName,
    payload.industry,
    payload.userFullName,
    payload.userCompanyName,
    payload.userEmail
  );

  const placeholderData = {
    companyName: payload.companyName,
    contactName: payload.contactName,
    industry: payload.industry,
    userFullName: payload.userFullName,
    userCompanyName: payload.userCompanyName,
    userEmail: payload.userEmail,
  };

  const finalSubject = payload.customSubject
    ? replaceDynamicPlaceholders(payload.customSubject, placeholderData)
    : defaultTemplate.subject;

  const rawCustomBody = payload.customBody
    ? replaceDynamicPlaceholders(payload.customBody, placeholderData)
    : null;

  const plainTextBody = rawCustomBody
    ? rawCustomBody.replace(/<[^>]+>/g, '')
    : defaultTemplate.text;

  const htmlBody = rawCustomBody
    ? formatPlainTextAsHtml(rawCustomBody, payload.userCompanyName || '', payload.userEmail || config.user)
    : defaultTemplate.html;

  const mailOptions = {
    from: config.from,
    to: cleanTo,
    replyTo: payload.userEmail || config.user,
    subject: finalSubject,
    text: plainTextBody,
    html: htmlBody,
    headers: {
      'X-Mailer': 'Businiche-Outreach/2.0',
      'List-Unsubscribe': `<mailto:${payload.userEmail || config.user}?subject=Unsubscribe>`,
    },
  };

  const info = await transporter.sendMail(mailOptions);

  if (payload.userId) {
    try {
      await sql`
        INSERT INTO emails_log (user_id, folder, from_email, to_email, subject, body_html, body_text)
        VALUES (
          ${payload.userId},
          'Sent',
          ${config.from},
          ${cleanTo},
          ${finalSubject},
          ${htmlBody},
          ${plainTextBody}
        );
      `;
    } catch (logErr) {
      console.error('Failed to log email in emails_log:', logErr);
    }
  }

  return { success: true, messageId: info.messageId };
}

/**
 * Send New Signup Alert Email to ops@rigteq.com
 */
export async function sendSignupNotificationEmail(user: {
  fullName: string;
  username: string;
  created_on?: string;
}) {
  try {
    const { transporter, from } = getOpsTransporter();
    const alertSubject = `🔔 New User Registration Alert: ${user.fullName} (@${user.username})`;
    const timestamp = user.created_on ? new Date(user.created_on).toLocaleString() : new Date().toLocaleString();

    const text = `New User Signup Alert - Businiche Platform

Full Name: ${user.fullName}
Username: ${user.username}
Registration Time: ${timestamp}
Role: User (10,000 Initial Weekly Credits)

This is an automated notification from the Businiche Lead Intelligence System.
`;

    const html = `
<div style="font-family: sans-serif; padding: 20px; background-color: #f0f6ff; color: #0f172a;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #bfdbfe;">
    <h2 style="color: #1d4ed8; margin-top: 0;">🔔 New User Registration</h2>
    <p>A new user account has been registered on <strong>Businiche</strong>.</p>
    <table width="100%" style="border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #eff6ff; font-weight: bold; width: 120px;">Full Name:</td><td style="padding: 8px; border-bottom: 1px solid #eff6ff;">${user.fullName}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eff6ff; font-weight: bold;">Username:</td><td style="padding: 8px; border-bottom: 1px solid #eff6ff;">@${user.username}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eff6ff; font-weight: bold;">Time:</td><td style="padding: 8px; border-bottom: 1px solid #eff6ff;">${timestamp}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eff6ff; font-weight: bold;">Credits:</td><td style="padding: 8px; border-bottom: 1px solid #eff6ff;">10,000 Weekly Credits</td></tr>
    </table>
    <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Businiche Automated Notification System • Rigteq Software</p>
  </div>
</div>
`;

    await transporter.sendMail({
      from,
      to: 'ops@rigteq.com',
      subject: alertSubject,
      text,
      html,
    });
  } catch (err) {
    console.error('Failed to send signup notification email to ops@rigteq.com:', err);
  }
}

/**
 * Send 6-Digit OTP Verification Email from Ops@rigteq.com
 */
export async function sendOtpEmail(toEmail: string, otpCode: string) {
  const { transporter, from } = getOpsTransporter();

  const subject = `🔑 Your Verification Code: ${otpCode} - Businiche Registration`;
  const text = `Your verification code is: ${otpCode}\n\nThis code is valid for 10 minutes. If you did not request this, please ignore this email.`;

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f0f6ff; padding: 32px 16px; color: #0f172a;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #bfdbfe; box-shadow: 0 4px 20px rgba(29,78,216,0.08);">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 48px; height: 48px; background: #2563eb; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px;">B</div>
      <h2 style="color: #1e3a8a; font-size: 20px; margin: 12px 0 4px 0;">Verify Your Email Address</h2>
      <p style="color: #64748b; font-size: 13px; margin: 0;">Businiche Lead Intelligence &amp; Campaign Automation</p>
    </div>

    <div style="background: #eff6ff; border: 1px dashed #3b82f6; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
      <span style="font-size: 12px; color: #1d4ed8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 8px;">Your 6-Digit Code</span>
      <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #1e40af; font-mono: monospace;">${otpCode}</span>
    </div>

    <p style="font-size: 13px; color: #475569; line-height: 1.5; text-align: center;">
      Enter this code on the registration page to complete your signup. This code will expire in <strong>10 minutes</strong>.
    </p>

    <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
      Businiche Platform • Rigteq Software (ops@rigteq.com)
    </div>
  </div>
</div>
  `;

  return await transporter.sendMail({
    from,
    to: toEmail,
    subject,
    text,
    html,
  });
}
