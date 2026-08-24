import nodemailer from 'nodemailer';
import crypto from 'crypto';

/**
 * Fetch SMTP credentials strictly from environment variables (No hardcoded passwords)
 */
function getSmtpConfig() {
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER || 'sales@rigteq.com';
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'Rigteq Software <sales@rigteq.com>';

  if (!pass) {
    console.warn('SMTP_PASS is not configured in process.env');
  }

  return { host, port, user, pass, from };
}

/** Create reusable nodemailer transporter pointing to SMTP server */
export function getTransporter() {
  const config = getSmtpConfig();
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

export interface EmailPayload {
  to: string;
  companyName: string;
  contactName?: string;
  industry?: string;
  customSubject?: string;
  customBody?: string;
}

/**
 * Generate high-converting HTML + Plain-Text offer email from Rigteq Software
 */
export function generateOfferEmailTemplate(
  companyName: string,
  contactName?: string,
  industry?: string
) {
  const greeting = contactName ? `Hi ${contactName},` : `Hi ${companyName} Team,`;
  const industryMention = industry ? ` within the ${industry} space` : '';
  const subject = `Partnership Proposal: Accelerating ${companyName}'s Digital Growth | Rigteq Software`;
  const unsubscribeId = crypto.createHash('md5').update(companyName).digest('hex').slice(0, 12);

  // Plain-text alternative (crucial for anti-spam filtering)
  const text = `${greeting}

I've been following ${companyName}${industryMention} and wanted to connect directly.

At Rigteq Software, we partner with growth-focused businesses to build, modernize, and scale mission-critical digital products — from full-stack web and mobile apps to custom automation and cloud architectures.

What We Bring To The Table:
- Full-Lifecycle Engineering: Next.js, React, Node.js, Python, PostgreSQL, AWS & Cloud Native.
- Dedicated Agile Pods: Senior developers integrated directly into your sprint cycle.
- Speed & Quality: 40% faster delivery with automated CI/CD and rigorous code review.
- Risk-Free Trial: Free technical architecture audit + 1-week Proof of Concept.

Schedule a 15-Min Intro Call by replying to sales@rigteq.com.

Best regards,
Dev Sharma
Partnerships & Solutions Lead | Rigteq Software
sales@rigteq.com

© ${new Date().getFullYear()} Rigteq Software. All rights reserved.
Unsubscribe: mailto:sales@rigteq.com?subject=Unsubscribe%20${unsubscribeId}
`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f0f6ff; margin: 0; padding: 24px; color: #1e293b; line-height: 1.6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #bfdbfe; box-shadow: 0 4px 20px rgba(29, 78, 216, 0.08);">

    <!-- Header Banner -->
    <tr>
      <td style="background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%); padding: 32px 36px; text-align: left;">
        <table border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="vertical-align: middle;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; display: inline;">Rigteq Software</h1>
              <p style="color: #93c5fd; margin: 4px 0 0 0; font-size: 12px; letter-spacing: 0.5px;">High-Impact Engineering &amp; Product Teams</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 36px;">
        <p style="font-size: 15px; margin: 0 0 18px 0; color: #334155;">
          ${greeting}
        </p>

        <p style="font-size: 15px; margin: 0 0 18px 0; color: #334155;">
          I've been following <strong style="color: #1d4ed8;">${companyName}</strong>${industryMention} and wanted to connect directly.
        </p>

        <p style="font-size: 15px; margin: 0 0 22px 0; color: #334155;">
          At <strong>Rigteq Software</strong>, we partner with growth-focused businesses to build, modernize, and scale mission-critical digital products — from full-stack web and mobile apps to custom automation and cloud architectures.
        </p>

        <!-- Value Proposition Box -->
        <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-left: 4px solid #2563eb; padding: 20px; border-radius: 0 10px 10px 0; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #1e3a8a; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">What We Bring To The Table</h3>
          <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px;">
            <li style="margin-bottom: 8px;"><strong>Full-Lifecycle Engineering:</strong> Next.js, React, Node.js, Python, PostgreSQL, AWS &amp; Cloud Native.</li>
            <li style="margin-bottom: 8px;"><strong>Dedicated Agile Pods:</strong> Senior developers integrated directly into your sprint cycle.</li>
            <li style="margin-bottom: 8px;"><strong>Speed &amp; Quality:</strong> 40% faster delivery with automated CI/CD and rigorous code review.</li>
            <li style="margin-bottom: 0;"><strong>Risk-Free Trial:</strong> Free technical architecture audit + 1-week Proof of Concept.</li>
          </ul>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="mailto:sales@rigteq.com?subject=Re:%20Collaboration%20with%20Rigteq%20Software%20(${encodeURIComponent(companyName)})"
             style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; letter-spacing: 0.3px;">
            Schedule a 15-Min Intro Call →
          </a>
        </div>

        <p style="font-size: 14px; margin: 18px 0 0 0; color: #1e3a8a; font-weight: 700;">
          Best regards,<br>
          <span style="color: #334155; font-weight: 600;">Dev Sharma</span><br>
          <span style="color: #64748b; font-size: 13px; font-weight: 400;">Partnerships &amp; Solutions Lead | Rigteq Software</span><br>
          <a href="mailto:sales@rigteq.com" style="color: #2563eb; font-size: 12px; font-weight: 400; text-decoration: none;">sales@rigteq.com</a>
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #eff6ff; padding: 20px 36px; border-top: 1px solid #bfdbfe; text-align: center;">
        <p style="color: #93c5fd; font-size: 11px; margin: 0;">
          © ${new Date().getFullYear()} Rigteq Software. All rights reserved.<br>
          You received this email as a prospective software development partner.
          <a href="mailto:sales@rigteq.com?subject=Unsubscribe%20${unsubscribeId}" style="color: #60a5fa; text-decoration: underline;">Unsubscribe</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html, text };
}

/**
 * Convert plain text custom body into responsive HTML while preserving paragraph breaks
 */
export function formatPlainTextAsHtml(plainText: string): string {
  if (/^\s*<[a-z][\s\S]*>/i.test(plainText.trim())) {
    // Already contains HTML tags
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

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f0f6ff; margin: 0; padding: 24px; color: #1e293b; line-height: 1.6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #bfdbfe; box-shadow: 0 4px 20px rgba(29, 78, 216, 0.08);">
    <tr>
      <td style="background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%); padding: 24px 32px; text-align: left;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Rigteq Software</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        ${paragraphs}
      </td>
    </tr>
    <tr>
      <td style="background-color: #eff6ff; padding: 16px 32px; border-top: 1px solid #bfdbfe; text-align: center;">
        <p style="color: #64748b; font-size: 11px; margin: 0;">
          © ${new Date().getFullYear()} Rigteq Software. All rights reserved.<br>
          Sent from Rigteq Lead Intelligence Platform.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Send an offer email to a single lead with clean anti-spam headers and plain-text fallback
 */
export async function sendLeadOfferEmail(payload: EmailPayload) {
  const config = getSmtpConfig();
  const transporter = getTransporter();
  const { subject, html, text } = generateOfferEmailTemplate(
    payload.companyName,
    payload.contactName,
    payload.industry
  );

  const plainTextBody = payload.customBody
    ? payload.customBody.replace(/<[^>]+>/g, '')
    : text;

  const htmlBody = payload.customBody
    ? formatPlainTextAsHtml(payload.customBody)
    : html;

  const mailOptions = {
    from: config.from,
    to: payload.to,
    replyTo: 'sales@rigteq.com',
    subject: payload.customSubject || subject,
    text: plainTextBody,
    html: htmlBody,
    headers: {
      'X-Mailer': 'Rigteq-Outreach/1.0',
      'List-Unsubscribe': `<mailto:sales@rigteq.com?subject=Unsubscribe>`,
    },
  };

  const info = await transporter.sendMail(mailOptions);
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
    const config = getSmtpConfig();
    const transporter = getTransporter();
    const alertSubject = `🔔 New User Registration Alert: ${user.fullName} (@${user.username})`;
    const timestamp = user.created_on ? new Date(user.created_on).toLocaleString() : new Date().toLocaleString();

    const text = `New User Signup Alert - Businiche Platform

Full Name: ${user.fullName}
Username: ${user.username}
Registration Time: ${timestamp}
Role: User (1,000 Initial Monthly Credits)

This is an automated notification from the Businiche Lead Intelligence System.
`;

    const html = `
<div style="font-family: sans-serif; padding: 20px; background-color: #f0f6ff; color: #0f172a;">
  <div style="max-width: 500px; margin: 0 auto; bg-color: #ffffff; background: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #bfdbfe;">
    <h2 style="color: #1d4ed8; margin-top: 0;">🔔 New User Registration</h2>
    <p>A new user account has been registered on <strong>Businiche</strong>.</p>
    <table width="100%" style="border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #eff6ff; font-weight: bold; width: 120px;">Full Name:</td><td style="padding: 8px; border-bottom: 1px solid #eff6ff;">${user.fullName}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eff6ff; font-weight: bold;">Username:</td><td style="padding: 8px; border-bottom: 1px solid #eff6ff;">@${user.username}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eff6ff; font-weight: bold;">Time:</td><td style="padding: 8px; border-bottom: 1px solid #eff6ff;">${timestamp}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eff6ff; font-weight: bold;">Credits:</td><td style="padding: 8px; border-bottom: 1px solid #eff6ff;">1,000 Monthly Credits</td></tr>
    </table>
    <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Businiche Automated Notification System • Rigteq Software</p>
  </div>
</div>
`;

    await transporter.sendMail({
      from: config.from,
      to: 'ops@rigteq.com',
      subject: alertSubject,
      text,
      html,
    });
  } catch (err) {
    console.error('Failed to send signup notification email to ops@rigteq.com:', err);
  }
}
