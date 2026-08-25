import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { deductUserCredits, CREDIT_COSTS } from '@/lib/credits';

// Clean standard email regex
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi;

// Comprehensive international phone number regex (requires at least 7 to 15 digits)
const PHONE_REGEX = /(\+?\d{1,4}[\s.\-]?\(?\d{1,4}\)?[\s.\-]?\d{1,4}[\s.\-]?\d{1,9})/g;

// Emails that are typically generic/non-personal — filtered out
const SPAM_PREFIXES = [
  'noreply', 'no-reply', 'donotreply', 'do-not-reply',
  'support', 'webmaster', 'postmaster',
  'newsletter', 'news', 'notifications', 'notification',
  'bounce', 'mailer', 'daemon',
];

function isGenericEmail(email: string): boolean {
  const local = email.split('@')[0].toLowerCase();
  return SPAM_PREFIXES.some((p) => local === p || local.startsWith(p + '.'));
}

/**
 * De-obfuscate emails in text: help[at]company[dot]com -> help@company.com
 */
function deobfuscateText(text: string): string {
  return text
    .replace(/\s*\[\s*at\s*\]\s*/gi, '@')
    .replace(/\s*\(\s*at\s*\)\s*/gi, '@')
    .replace(/\s*\{\s*at\s*\}\s*/gi, '@')
    .replace(/\s+at\s+/gi, '@')
    .replace(/\s*\[\s*dot\s*\]\s*/gi, '.')
    .replace(/\s*\(\s*dot\s*\)\s*/gi, '.')
    .replace(/\s*\{\s*dot\s*\}\s*/gi, '.')
    .replace(/\s+dot\s+/gi, '.');
}

/**
 * Clean and validate phone number
 */
function normalizeToE164(rawPhone: string): string | null {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D/g, '');

  // Strictly require 8 to 15 digits
  if (digits.length < 8 || digits.length > 15) return null;

  // Filter out dates (e.g. 20260825, 20241231)
  if (/^(19|20)\d{6}$/.test(digits) || /^(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/.test(digits)) return null;

  // Filter out repeating/sequential/fake numbers
  if (/^(\d)\1+$/.test(digits)) return null;
  if ('123456789012345'.includes(digits) || '098765432109876'.includes(digits)) return null;
  if (digits.includes('55501') || digits.includes('000000')) return null;

  // Normalize to E.164 format (+XXXXXXXXXXX)
  if (rawPhone.trim().startsWith('+')) {
    return `+${digits}`;
  } else if (digits.length === 10) {
    // Default 10-digit North American number without + prefix -> +1
    return `+1${digits}`;
  } else if (digits.length >= 11 && (digits.startsWith('1') || digits.startsWith('44') || digits.startsWith('91') || digits.startsWith('33') || digits.startsWith('49'))) {
    return `+${digits}`;
  } else if (digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

function extractFromHtml(html: string): { emails: string[]; phones: string[] } {
  const emails = new Set<string>();
  const phones = new Set<string>();

  // 1. Extract mailto: links
  const mailtoMatches = html.matchAll(/href=["']mailto:([^"'?&\s]+)/gi);
  for (const m of mailtoMatches) {
    const rawEmail = m[1].trim().toLowerCase();
    const deob = deobfuscateText(rawEmail);
    if (deob.includes('@') && !isGenericEmail(deob)) {
      emails.add(deob);
    }
  }

  // 2. De-obfuscate HTML body text and extract standard emails
  const textContent = deobfuscateText(html.replace(/<[^>]+>/g, ' '));
  const emailMatches = textContent.match(EMAIL_REGEX) || [];
  for (const email of emailMatches) {
    const clean = email.toLowerCase().replace(/[.]+$/, '');
    if (clean.includes('@') && !isGenericEmail(clean)) {
      emails.add(clean);
    }
  }

  // 3. Extract phone numbers
  const phoneMatches = textContent.match(PHONE_REGEX) || [];
  for (const phone of phoneMatches) {
    const validPhone = normalizeToE164(phone);
    if (validPhone) {
      phones.add(validPhone);
    }
  }

  return {
    emails: Array.from(emails).slice(0, 10),
    phones: Array.from(phones).slice(0, 5),
  };
}

function getContactPageUrl(baseUrl: string, html: string): string | null {
  try {
    const base = new URL(baseUrl);
    const contactPatterns = [
      /href=["']([^"']*contact[^"']*)['"]/gi,
      /href=["']([^"']*about[^"']*)['"]/gi,
      /href=["']([^"']*reach[^"']*)['"]/gi,
      /href=["']([^"']*team[^"']*)['"]/gi,
    ];

    for (const pattern of contactPatterns) {
      const match = html.match(pattern);
      if (match) {
        const hrefMatch = match[0].match(/href=["']([^"']+)['"]/i);
        if (hrefMatch) {
          const href = hrefMatch[1];
          try {
            const url = new URL(href, base.origin);
            if (url.hostname === base.hostname) {
              return url.href;
            }
          } catch {}
        }
      }
    }
  } catch {}
  return null;
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

    // Fetch lead details
    const leads = await sql`
      SELECT id, company_name, website, email, phone, additional_emails, additional_phones
      FROM leads WHERE id = ${id} LIMIT 1;
    `;

    if (leads.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const lead = leads[0];

    if (!lead.website) {
      return NextResponse.json({
        error: 'No website URL',
        reason: 'missing_website',
        emails: [],
        phones: [],
        foundCount: 0,
      }, { status: 200 });
    }

    // Deduct Credits
    const creditResult = await deductUserCredits(
      session.userId,
      session.role,
      CREDIT_COSTS.ENHANCE_PER_LEAD,
      'Enhance Lead'
    );

    if (!creditResult.success) {
      return NextResponse.json({
        error: creditResult.message,
        outOfCredits: true,
        remainingCredits: creditResult.remaining,
      }, { status: 402 });
    }

    const website = lead.website.startsWith('http')
      ? lead.website
      : `https://${lead.website}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout budget

    let homepageHtml = '';
    let isTimedOut = false;

    try {
      const res = await fetch(website, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      if (res.ok) {
        homepageHtml = await res.text();
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        isTimedOut = true;
      }
    } finally {
      clearTimeout(timeout);
    }

    // Incremental extraction from whatever HTML we received
    const homeResults = homepageHtml ? extractFromHtml(homepageHtml) : { emails: [], phones: [] };
    let contactResults = { emails: [] as string[], phones: [] as string[] };

    if (!isTimedOut && homeResults.emails.length === 0 && homepageHtml) {
      const contactUrl = getContactPageUrl(website, homepageHtml);
      if (contactUrl) {
        const contactController = new AbortController();
        const contactTimeout = setTimeout(() => contactController.abort(), 3500);
        try {
          const contactRes = await fetch(contactUrl, {
            signal: contactController.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            },
          });
          if (contactRes.ok) {
            const contactHtml = await contactRes.text();
            contactResults = extractFromHtml(contactHtml);
          }
        } catch {
        } finally {
          clearTimeout(contactTimeout);
        }
      }
    }

    // Merge extracted emails and phones
    const allFoundEmails = Array.from(new Set([...homeResults.emails, ...contactResults.emails]));
    const allFoundPhones = Array.from(new Set([...homeResults.phones, ...contactResults.phones]));

    // Existing contacts
    const existingMainEmail = lead.email ? [lead.email] : [];
    const existingAddEmails: string[] = Array.isArray(lead.additional_emails) ? lead.additional_emails : [];
    const existingMainPhone = lead.phone ? [lead.phone] : [];
    const existingAddPhones: string[] = Array.isArray(lead.additional_phones) ? lead.additional_phones : [];

    // Filter out already saved emails and phones
    const newEmails = allFoundEmails.filter(
      (e) => !existingMainEmail.includes(e) && !existingAddEmails.includes(e)
    );
    const newPhones = allFoundPhones.filter(
      (p) => !existingMainPhone.includes(p) && !existingAddPhones.includes(p)
    );

    // Save newly found contacts without overwriting main email/phone
    let updatedEmail = lead.email;
    let updatedPhone = lead.phone;
    const finalAddEmails = [...existingAddEmails];
    const finalAddPhones = [...existingAddPhones];

    if (!updatedEmail && newEmails.length > 0) {
      updatedEmail = newEmails.shift()!;
    }
    finalAddEmails.push(...newEmails);

    if (!updatedPhone && newPhones.length > 0) {
      updatedPhone = newPhones.shift()!;
    }
    finalAddPhones.push(...newPhones);

    // Update DB with merged contacts
    await sql`
      UPDATE leads
      SET email = ${updatedEmail || null},
          phone = ${updatedPhone || null},
          additional_emails = ${JSON.stringify(Array.from(new Set(finalAddEmails)))}::jsonb,
          additional_phones = ${JSON.stringify(Array.from(new Set(finalAddPhones)))}::jsonb
      WHERE id = ${id};
    `;

    const totalFound = allFoundEmails.length + allFoundPhones.length;

    // Log comment on lead enhancement
    try {
      const commentMsg = totalFound > 0
        ? `Enhanced lead via website extraction: Found ${allFoundEmails.length} email(s) and ${allFoundPhones.length} phone number(s).`
        : isTimedOut
        ? `Enhanced lead via website extraction: Website connection timed out.`
        : `Enhanced lead via website extraction: No additional contact details found.`;

      await sql`
        INSERT INTO comments (lead_id, user_id, status, comment_text)
        VALUES (
          ${id},
          ${session.userId},
          'Qualified',
          ${commentMsg}
        );
      `;
    } catch (logErr) {
      console.error('Failed to log comment on enhance:', logErr);
    }

    return NextResponse.json({
      success: true,
      emails: allFoundEmails,
      phones: allFoundPhones,
      foundCount: totalFound,
      isTimedOut,
      statusMessage: totalFound > 0 ? `Found ${totalFound} contact(s)` : isTimedOut ? 'Timed out' : 'No new contacts found',
      remainingCredits: creditResult.remaining,
      nextCreditDate: creditResult.nextCreditDate,
    });
  } catch (err: unknown) {
    console.error('Enhance lead error:', err);
    return NextResponse.json({
      error: 'Timed out',
      emails: [],
      phones: [],
      foundCount: 0,
    }, { status: 200 });
  }
}
