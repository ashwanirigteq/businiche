import { sql } from '@/lib/db';
import { discoverGooglePlacesLeads, saveLeadToDatabase } from '@/lib/places';
import { sendLeadOfferEmail, sanitizeEmailAddress } from '@/lib/email';
import { deductUserCredits, CREDIT_COSTS } from '@/lib/credits';
import type { DiscoveredLead } from '@/lib/types';

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi;
const SPAM_PREFIXES = ['noreply', 'no-reply', 'donotreply', 'do-not-reply', 'support', 'webmaster', 'postmaster', 'bounce', 'mailer'];

/**
 * Fast website email scraper for lead enhancement
 */
async function scrapeWebsiteForEmail(websiteUrl: string): Promise<string | null> {
  try {
    const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const html = await res.text();
    const matches = html.match(EMAIL_REGEX) || [];

    for (const raw of matches) {
      const email = sanitizeEmailAddress(raw);
      if (email) {
        const local = email.split('@')[0];
        if (!SPAM_PREFIXES.some((p) => local === p || local.startsWith(p + '.'))) {
          return email;
        }
      }
    }
  } catch {}
  return null;
}

/**
 * Execute automated B2B campaign background runner.
 */
export async function runCampaignProcessor(campaignId: string) {
  try {
    // Fetch campaign details with user profile SMTP & API keys
    const res = await sql`
      SELECT c.*, f.subject as format_subject, f.format_large_text, u.full_name as user_full_name,
             u.company_name as user_company_name, u.email as user_email, u.email_password as user_email_password,
             u.smtp_host as user_smtp_host, u.smtp_port as user_smtp_port,
             u.custom_places_api_key, u.role_id, r.role_name
      FROM campaigns c
      LEFT JOIN formats f ON c.email_format_id = f.id
      JOIN users u ON c.created_by_user_id = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE c.id = ${campaignId} AND c.status = 'RUNNING'
      LIMIT 1;
    `;

    if (res.length === 0) {
      console.log(`Campaign ${campaignId} is not in RUNNING state.`);
      return;
    }

    const campaign = res[0];
    const rawKeywords = campaign.keywords;
    const rawLocations = campaign.locations;

    const keywords: string[] = Array.isArray(rawKeywords)
      ? rawKeywords
      : typeof rawKeywords === 'string'
      ? JSON.parse(rawKeywords)
      : [];

    const baseLocations: string[] = Array.isArray(rawLocations)
      ? rawLocations
      : typeof rawLocations === 'string'
      ? JSON.parse(rawLocations)
      : [];

    const targetEmails: number = campaign.target_emails || 50;
    const dailyLimit: number = Number(campaign.daily_email_limit || 0);

    // 1. Daily Email Limit Counter Reset check (24h or calendar day change)
    let dailyCount: number = Number(campaign.daily_email_count || 0);
    const lastResetDate = campaign.last_daily_reset ? new Date(campaign.last_daily_reset) : new Date();
    const isNewDay = new Date().toDateString() !== lastResetDate.toDateString();

    if (isNewDay) {
      dailyCount = 0;
      await sql`
        UPDATE campaigns
        SET daily_email_count = 0,
            last_daily_reset = CURRENT_TIMESTAMP
        WHERE id = ${campaignId};
      `;
    }

    if (dailyLimit > 0 && dailyCount >= dailyLimit) {
      await sql`
        UPDATE campaigns
        SET status = 'SCHEDULED',
            last_update = ${`Daily email limit reached (${dailyCount}/${dailyLimit} today). Scheduled to resume tomorrow.`}
        WHERE id = ${campaignId};
      `;
      return;
    }

    // 2. Send Sample Verification Email to user's own email on start
    if (!campaign.started_at || campaign.searches_count === 0) {
      if (!campaign.user_email || !campaign.user_email_password || !campaign.user_smtp_host) {
        await sql`
          UPDATE campaigns
          SET status = 'FAILED',
              last_update = 'SMTP Failure: Sender email, SMTP host, or password not configured in profile.'
          WHERE id = ${campaignId};
        `;
        return;
      }

      try {
        await sendLeadOfferEmail({
          to: campaign.user_email,
          companyName: campaign.user_company_name || 'Self Test',
          customSubject: `[Verification] Campaign "${campaign.campaign_name}" SMTP Test`,
          customBody: `This is an automated sample verification email for campaign "${campaign.campaign_name}". Your SMTP credentials are working correctly.`,
          userFullName: campaign.user_full_name,
          userCompanyName: campaign.user_company_name,
          userEmail: campaign.user_email,
          userEmailPassword: campaign.user_email_password,
          userSmtpHost: campaign.user_smtp_host,
          userSmtpPort: campaign.user_smtp_port,
          userId: campaign.created_by_user_id,
        });
      } catch (smtpTestErr: unknown) {
        const testMsg = smtpTestErr instanceof Error ? smtpTestErr.message : String(smtpTestErr);
        await sql`
          UPDATE campaigns
          SET status = 'FAILED',
              last_update = ${`SMTP Self-Test Failed: ${testMsg}. Please verify your profile email settings.`}
          WHERE id = ${campaignId};
        `;
        return;
      }
    }

    // Set initial started_at timestamp if not set
    const startTimeStamp = campaign.started_at ? new Date(campaign.started_at) : new Date();
    await sql`
      UPDATE campaigns
      SET started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
          last_update = 'Starting automated discovery pipeline...'
      WHERE id = ${campaignId};
    `;

    // 3. Build Location Matrix (Base Locations + US State Cities if State Campaign)
    let locations: string[] = [...baseLocations];
    const isStateCampaign = Boolean(campaign.is_state_campaign);
    const rawSelectedStates = campaign.selected_states;

    const selectedStatesList: string[] = Array.isArray(rawSelectedStates)
      ? rawSelectedStates
      : typeof rawSelectedStates === 'string'
      ? JSON.parse(rawSelectedStates)
      : [];

    if (isStateCampaign && selectedStatesList.length > 0) {
      try {
        const stateRows = await sql`
          SELECT state_name, cities_json
          FROM states
          WHERE state_name = ANY(${selectedStatesList});
        `;

        for (const stRow of stateRows) {
          const cities = Array.isArray(stRow.cities_json) ? stRow.cities_json : [];
          cities.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          for (const cObj of cities) {
            if (cObj.city) {
              const locStr = `${cObj.city}, ${stRow.state_name}`;
              if (!locations.includes(locStr)) {
                locations.push(locStr);
              }
            }
          }
        }
      } catch (stErr) {
        console.error('Failed to load state cities for campaign:', stErr);
      }
    }

    // Generate unique combinations
    const combinations: { keyword: string; location: string }[] = [];
    for (const kw of keywords) {
      for (const loc of locations) {
        combinations.push({ keyword: String(kw).trim(), location: String(loc).trim() });
      }
    }

    if (combinations.length === 0) {
      await sql`
        UPDATE campaigns
        SET status = 'FAILED',
            last_update = 'Failed: No valid keywords or locations defined for campaign.'
        WHERE id = ${campaignId};
      `;
      return;
    }

    let sentCount = campaign.email_sent_count || 0;
    let searchesCount = campaign.searches_count || 0;
    let leadsFoundCount = campaign.leads_found_count || 0;
    let enhancedCount = campaign.leads_enhanced_count || 0;
    let creditsUsed = Number(campaign.credits_used || 0);

    // Resume from city progress order if set
    let startIndex = Number(campaign.city_progress_order || 0);
    if (startIndex >= combinations.length) startIndex = 0;

    for (let cIdx = startIndex; cIdx < combinations.length; cIdx++) {
      const comb = combinations[cIdx];
      const currentComboStr = `${comb.keyword} in ${comb.location}`;

      // Re-verify campaign status before starting combination
      const statusCheck = await sql`SELECT status FROM campaigns WHERE id = ${campaignId} LIMIT 1;`;
      if (statusCheck.length === 0 || statusCheck[0].status !== 'RUNNING') {
        console.log(`Campaign ${campaignId} is no longer RUNNING. Halting.`);
        break;
      }

      // Check total target email limit
      if (sentCount >= targetEmails) {
        await sql`
          UPDATE campaigns
          SET status = 'PAUSED',
              last_update = ${`Target email limit reached (${sentCount}/${targetEmails}). Campaign paused. Click 'Continue Campaign' or adjust target to resume.`}
          WHERE id = ${campaignId};
        `;
        return;
      }

      // Check daily email limit
      if (dailyLimit > 0 && dailyCount >= dailyLimit) {
        await sql`
          UPDATE campaigns
          SET status = 'SCHEDULED',
              last_update = ${`Daily email limit reached (${dailyCount}/${dailyLimit} today). Scheduled to resume tomorrow.`}
          WHERE id = ${campaignId};
        `;
        return;
      }

      try {
        // STEP 1: Generate leads for Combination A
        searchesCount++;
        const elapsedSec = Math.floor((Date.now() - startTimeStamp.getTime()) / 1000);

        await sql`
          UPDATE campaigns
          SET searches_count = ${searchesCount},
              current_combination = ${currentComboStr},
              city_progress_order = ${cIdx},
              last_update = ${`Step 1/3: Generating leads for "${currentComboStr}"...`},
              time_taken_seconds = ${elapsedSec}
          WHERE id = ${campaignId};
        `;

        let discovery;
        try {
          discovery = await discoverGooglePlacesLeads(
            comb.keyword,
            comb.location,
            20,
            campaign.custom_places_api_key
          );
        } catch (apiErr: unknown) {
          const apiMsg = apiErr instanceof Error ? apiErr.message : String(apiErr);
          console.error('Lead discovery API failure:', apiMsg);
          await sql`
            UPDATE campaigns
            SET status = 'FAILED',
                last_update = ${`Failed: ${apiMsg}`}
            WHERE id = ${campaignId};
          `;
          return;
        }

        const discoveredLeads: DiscoveredLead[] = discovery.leads || [];
        leadsFoundCount += discoveredLeads.length;

        // Deduct 10 credits per lead found
        if (discoveredLeads.length > 0 && campaign.role_name !== 'Admin') {
          const cost = discoveredLeads.length * CREDIT_COSTS.GENERATE_PER_LEAD; // 10 credits / lead
          const dedRes = await deductUserCredits(
            campaign.created_by_user_id,
            campaign.role_name,
            cost,
            `Campaign Lead Discovery (${currentComboStr})`
          );
          if (dedRes.success) {
            creditsUsed += cost;
          }
        }

        await sql`
          UPDATE campaigns
          SET leads_found_count = ${leadsFoundCount},
              credits_used = ${creditsUsed},
              last_update = ${`Discovered ${discoveredLeads.length} leads for "${currentComboStr}". Starting Step 2: Enhancing leads...`}
          WHERE id = ${campaignId};
        `;

        // STEP 2: Enhance ALL discovered leads from Combination A to find emails
        const processedLeads: { savedLead: any; email: string | null }[] = [];

        for (let i = 0; i < discoveredLeads.length; i++) {
          const rawLead = discoveredLeads[i];

          // Re-verify status
          const stCheck = await sql`SELECT status FROM campaigns WHERE id = ${campaignId} LIMIT 1;`;
          if (stCheck.length === 0 || stCheck[0].status !== 'RUNNING') break;

          // Save lead to database
          const savedLead = await saveLeadToDatabase(rawLead, campaign.created_by_user_id);
          let targetEmail = sanitizeEmailAddress(savedLead.email || rawLead.email || '');

          // If email is missing but website exists, enhance via web scraping
          if (!targetEmail && savedLead.website) {
            await sql`
              UPDATE campaigns
              SET last_update = ${`Step 2/3: Enhancing lead (${i + 1}/${discoveredLeads.length}): ${savedLead.company_name} (${savedLead.website})...`}
              WHERE id = ${campaignId};
            `;

            const foundEmail = await scrapeWebsiteForEmail(savedLead.website);
            if (foundEmail) {
              targetEmail = foundEmail;
              await sql`
                UPDATE leads
                SET email = ${foundEmail}
                WHERE id = ${savedLead.id};
              `;
            }

            // Deduct 5 credits per enhanced lead
            if (campaign.role_name !== 'Admin') {
              const cost = CREDIT_COSTS.ENHANCE_PER_LEAD; // 5 credits
              const dedRes = await deductUserCredits(
                campaign.created_by_user_id,
                campaign.role_name,
                cost,
                `Campaign Lead Enhancement (${savedLead.company_name})`
              );
              if (dedRes.success) {
                creditsUsed += cost;
              }
            }

            // Log comment on lead enhancement
            try {
              const commentMsg = foundEmail
                ? `Enhanced lead via automated campaign extraction: Extracted email (${foundEmail}) from website ${savedLead.website}.`
                : `Enhanced lead via automated campaign extraction: Scraped ${savedLead.website}, no new emails found.`;

              await sql`
                INSERT INTO comments (lead_id, user_id, status, comment_text)
                VALUES (
                  ${savedLead.id},
                  ${campaign.created_by_user_id},
                  'Qualified',
                  ${commentMsg}
                );
              `;
            } catch {}

            enhancedCount++;
            await sql`
              UPDATE campaigns
              SET leads_enhanced_count = ${enhancedCount},
                  credits_used = ${creditsUsed}
              WHERE id = ${campaignId};
            `;
          }

          processedLeads.push({ savedLead, email: targetEmail });
        }

        // STEP 3: Send Outreach Email to valid emails found for Combination A
        await sql`
          UPDATE campaigns
          SET last_update = ${`Step 3/3: Dispatching outreach emails for "${currentComboStr}"...`}
          WHERE id = ${campaignId};
        `;

        for (const pItem of processedLeads) {
          // Re-check status before email dispatch
          const stCheck = await sql`SELECT status FROM campaigns WHERE id = ${campaignId} LIMIT 1;`;
          if (stCheck.length === 0 || stCheck[0].status !== 'RUNNING') break;

          // Check total target email limit
          if (sentCount >= targetEmails) {
            await sql`
              UPDATE campaigns
              SET status = 'PAUSED',
                  last_update = ${`Target email limit reached (${sentCount}/${targetEmails}). Campaign paused. Click 'Continue Campaign' or adjust target to resume.`}
              WHERE id = ${campaignId};
            `;
            return;
          }

          // Check daily email limit
          if (dailyLimit > 0 && dailyCount >= dailyLimit) {
            await sql`
              UPDATE campaigns
              SET status = 'SCHEDULED',
                  last_update = ${`Daily email limit reached (${dailyCount}/${dailyLimit} today). Scheduled to resume tomorrow.`}
              WHERE id = ${campaignId};
            `;
            return;
          }

          const cleanRecipient = pItem.email ? sanitizeEmailAddress(pItem.email) : null;

          if (cleanRecipient) {
            await sql`
              UPDATE campaigns
              SET last_update = ${`Sending outreach email to ${cleanRecipient} (${pItem.savedLead.company_name})...`}
              WHERE id = ${campaignId};
            `;

            // Deduct 5 credits per email sent
            if (campaign.role_name !== 'Admin') {
              const creditRes = await deductUserCredits(
                campaign.created_by_user_id,
                campaign.role_name,
                CREDIT_COSTS.EMAIL_PER_LEAD, // 5 credits
                'Campaign Automated Outreach Email'
              );
              if (!creditRes.success) {
                await sql`
                  UPDATE campaigns
                  SET status = 'PAUSED',
                      last_update = 'Paused: Insufficient credits to send email.'
                  WHERE id = ${campaignId};
                `;
                return;
              }
              creditsUsed += CREDIT_COSTS.EMAIL_PER_LEAD;
            }

            // Send personalized outreach email & store in emails_log
            try {
              await sendLeadOfferEmail({
                to: cleanRecipient,
                companyName: pItem.savedLead.company_name,
                industry: pItem.savedLead.industry || comb.keyword,
                customSubject: campaign.format_subject || undefined,
                customBody: campaign.format_large_text || undefined,
                userFullName: campaign.user_full_name,
                userCompanyName: campaign.user_company_name,
                userEmail: campaign.user_email,
                userEmailPassword: campaign.user_email_password,
                userSmtpHost: campaign.user_smtp_host,
                userSmtpPort: campaign.user_smtp_port,
                userId: campaign.created_by_user_id,
              });

              sentCount++;
              dailyCount++;

              await sql`
                UPDATE campaigns
                SET email_sent_count = ${sentCount},
                    daily_email_count = ${dailyCount},
                    credits_used = ${creditsUsed},
                    last_update = ${`Email delivered to ${cleanRecipient}. (${sentCount}/${targetEmails} total sent)`}
                WHERE id = ${campaignId};
              `;

              // Log activity comment
              try {
                await sql`
                  INSERT INTO comments (lead_id, user_id, status, comment_text)
                  VALUES (
                    ${pItem.savedLead.id},
                    ${campaign.created_by_user_id},
                    'Follow Up',
                    ${`Sent automated campaign offer email to ${cleanRecipient}`}
                  );
                `;
                await sql`UPDATE leads SET status = 'Follow Up' WHERE id = ${pItem.savedLead.id};`;
              } catch {}
            } catch (smtpErr: unknown) {
              const smtpMsg = smtpErr instanceof Error ? smtpErr.message : String(smtpErr);
              console.error('Campaign SMTP dispatch error:', smtpMsg);
              await sql`
                UPDATE campaigns
                SET status = 'PAUSED',
                    last_update = ${`SMTP Failure: ${smtpMsg}`}
                WHERE id = ${campaignId};
              `;
              return;
            }

            await new Promise((r) => setTimeout(r, 600));
          }
        }
      } catch (stepErr) {
        console.error('Campaign combination step error:', stepErr);
      }
    }

    // STEP 4: Final completion check
    const totalElapsedSec = Math.floor((Date.now() - startTimeStamp.getTime()) / 1000);
    const finalCheck = await sql`SELECT status, email_sent_count FROM campaigns WHERE id = ${campaignId} LIMIT 1;`;
    if (finalCheck.length > 0 && finalCheck[0].status === 'RUNNING') {
      await sql`
        UPDATE campaigns
        SET status = 'COMPLETED',
            last_update = ${`Campaign completed successfully. Delivered ${sentCount} outreach emails.`},
            time_taken_seconds = ${totalElapsedSec}
        WHERE id = ${campaignId};
      `;
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('runCampaignProcessor error:', errMsg);
    try {
      await sql`
        UPDATE campaigns
        SET status = 'FAILED',
            last_update = ${`Execution Error: ${errMsg}`}
        WHERE id = ${campaignId};
      `;
    } catch {}
  }
}
