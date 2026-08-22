import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_USER = process.env.SMTP_USER || 'devsharma1991111@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'yiuy zlms bpca bpct';
const SMTP_FROM = process.env.SMTP_FROM || 'Rigteq Software <devsharma1991111@gmail.com>';

// Create reusable nodemailer transporter
export function getTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
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
 * Generate a high-converting, crisp HTML offer email from Rigteq Software
 */
export function generateOfferEmailTemplate(companyName: string, contactName?: string, industry?: string) {
  const greeting = contactName ? `Hi ${contactName},` : `Hi ${companyName} Team,`;
  const industryMention = industry ? ` within the ${industry} space` : '';

  const subject = `Partnership Proposal: Accelerating ${companyName}'s Software Engineering | Rigteq Software`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; line-height: 1.6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Header Banner -->
    <tr>
      <td style="background-color: #0f172a; padding: 32px 36px; text-align: left;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Rigteq Software</h1>
        <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px;">High-Impact Software Engineering & Dedicated Product Teams</p>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 36px;">
        <p style="font-size: 15px; margin: 0 0 18px 0; color: #334155;">
          ${greeting}
        </p>

        <p style="font-size: 15px; margin: 0 0 18px 0; color: #334155;">
          I’ve been following <strong>${companyName}</strong>${industryMention} and wanted to reach out directly.
        </p>

        <p style="font-size: 15px; margin: 0 0 22px 0; color: #334155;">
          At <strong>Rigteq Software</strong>, we partner with forward-thinking businesses to build, modernize, and scale mission-critical digital products — from full-stack web and mobile apps to custom automation and cloud architectures.
        </p>

        <!-- Value Proposition Box -->
        <div style="background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #0f172a; font-weight: 600;">What We Bring To The Table:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 14px;">
            <li style="margin-bottom: 8px;"><strong>Full-Lifecycle Engineering:</strong> Next.js, React, Node.js, Python, PostgreSQL, AWS & Cloud Native systems.</li>
            <li style="margin-bottom: 8px;"><strong>Dedicated Agile Pods:</strong> Battle-tested senior developers who integrate directly into your sprint cycle.</li>
            <li style="margin-bottom: 8px;"><strong>Speed & Quality:</strong> Reduce development cycles by 40% with automated CI/CD and rigorous code review.</li>
            <li style="margin-bottom: 0;"><strong>Risk-Free Trial:</strong> Complimentary technical architecture audit + 1-week Proof of Concept (POC).</li>
          </ul>
        </div>

        <p style="font-size: 15px; margin: 0 0 24px 0; color: #334155;">
          Whether you have an upcoming project, need to accelerate your roadmap, or want to augment your engineering bandwidth without hiring overhead, we would love to collaborate.
        </p>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="mailto:devsharma1991111@gmail.com?subject=Re:%20Collaboration%20with%20Rigteq%20Software%20(${encodeURIComponent(companyName)})" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            Schedule a 15-Min Intro Call →
          </a>
        </div>

        <p style="font-size: 14px; margin: 0 0 6px 0; color: #64748b;">
          Looking forward to hearing your thoughts.
        </p>

        <p style="font-size: 14px; margin: 18px 0 0 0; color: #0f172a; font-weight: 600;">
          Best regards,<br>
          <span style="color: #334155; font-weight: 500;">Dev Sharma</span><br>
          <span style="color: #64748b; font-size: 13px; font-weight: normal;">Partnerships & Solutions Lead | Rigteq Software</span><br>
          <span style="color: #64748b; font-size: 12px; font-weight: normal;">devsharma1991111@gmail.com</span>
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} Rigteq Software. All rights reserved.<br>
          You received this email regarding prospective software development collaboration.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Send an offer email to a single lead
 */
export async function sendLeadOfferEmail(payload: EmailPayload) {
  const transporter = getTransporter();
  const { subject, html } = generateOfferEmailTemplate(
    payload.companyName,
    payload.contactName,
    payload.industry
  );

  const mailOptions = {
    from: SMTP_FROM,
    to: payload.to,
    subject: payload.customSubject || subject,
    html: payload.customBody || html,
  };

  const info = await transporter.sendMail(mailOptions);
  return { success: true, messageId: info.messageId };
}
