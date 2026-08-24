import { sql } from './db';
import type { UserRole } from './types';

export const CREDIT_COSTS = {
  GENERATE_PER_LEAD: 10, // 30 leads = 300 credits
  EMAIL_PER_LEAD: 5,
  ENHANCE_PER_LEAD: 5,
} as const;

export const INITIAL_MONTHLY_CREDITS = 1000;

export interface UserCreditInfo {
  credits: number;
  lastCreditReset: string | null;
  nextCreditDate: string | null;
}

export interface CreditCheckResult {
  success: boolean;
  remaining: number;
  nextCreditDate?: string | null;
  message?: string;
}

/**
 * Get current credits and next credit reset date for user with automatic 30-day monthly reset logic.
 * Admins receive Infinity credits.
 */
export async function getUserCreditDetails(userId: string, role: UserRole): Promise<UserCreditInfo> {
  if (role === 'Admin') {
    return {
      credits: Infinity,
      lastCreditReset: null,
      nextCreditDate: null,
    };
  }

  try {
    const result = await sql`
      SELECT credits, last_credit_reset, next_credit_date FROM users WHERE id = ${userId} LIMIT 1;
    `;

    if (result.length === 0) {
      return { credits: 0, lastCreditReset: null, nextCreditDate: null };
    }

    const { credits, last_credit_reset, next_credit_date } = result[0];
    const lastResetDate = last_credit_reset ? new Date(last_credit_reset) : new Date(0);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Auto-reset monthly credits if 30 days passed
    if (lastResetDate < thirtyDaysAgo) {
      const updated = await sql`
        UPDATE users
        SET credits = ${INITIAL_MONTHLY_CREDITS},
            last_credit_reset = CURRENT_TIMESTAMP,
            next_credit_date = CURRENT_TIMESTAMP + INTERVAL '30 days'
        WHERE id = ${userId}
        RETURNING credits, last_credit_reset, next_credit_date;
      `;
      const row = updated[0];
      return {
        credits: INITIAL_MONTHLY_CREDITS,
        lastCreditReset: row?.last_credit_reset ? new Date(row.last_credit_reset).toISOString() : null,
        nextCreditDate: row?.next_credit_date ? new Date(row.next_credit_date).toISOString() : null,
      };
    }

    // Ensure next_credit_date exists if null
    let finalNextCreditDate = next_credit_date;
    if (!finalNextCreditDate && last_credit_reset) {
      const computedNext = new Date(new Date(last_credit_reset).getTime() + 30 * 24 * 60 * 60 * 1000);
      finalNextCreditDate = computedNext.toISOString();
      await sql`UPDATE users SET next_credit_date = ${finalNextCreditDate} WHERE id = ${userId};`;
    }

    return {
      credits: credits ?? 0,
      lastCreditReset: last_credit_reset ? new Date(last_credit_reset).toISOString() : null,
      nextCreditDate: finalNextCreditDate ? new Date(finalNextCreditDate).toISOString() : null,
    };
  } catch (err) {
    console.error('Failed to fetch user credits:', err);
    return { credits: 0, lastCreditReset: null, nextCreditDate: null };
  }
}

/**
 * Backward-compatible helper to get credit balance number
 */
export async function getUserCredits(userId: string, role: UserRole): Promise<number> {
  const details = await getUserCreditDetails(userId, role);
  return details.credits;
}

/**
 * Atomically deduct credits for an action.
 * Returns { success: true, remaining, nextCreditDate } or { success: false, remaining, message }
 */
export async function deductUserCredits(
  userId: string,
  role: UserRole,
  amount: number,
  actionName: string
): Promise<CreditCheckResult> {
  if (role === 'Admin') {
    return { success: true, remaining: Infinity, nextCreditDate: null };
  }

  const currentDetails = await getUserCreditDetails(userId, role);

  if (currentDetails.credits < amount) {
    return {
      success: false,
      remaining: currentDetails.credits,
      nextCreditDate: currentDetails.nextCreditDate,
      message: `Insufficient credits. ${actionName} requires ${amount} credits, but you have ${currentDetails.credits} credits remaining.`,
    };
  }

  try {
    // Financial Atomic Deduction: WHERE credits >= amount prevents double-spending / negative balance
    const updated = await sql`
      UPDATE users
      SET credits = GREATEST(0, credits - ${amount}),
          next_credit_date = COALESCE(next_credit_date, CURRENT_TIMESTAMP + INTERVAL '30 days')
      WHERE id = ${userId} AND credits >= ${amount}
      RETURNING credits, next_credit_date;
    `;

    if (updated.length === 0) {
      // Failed atomic check (race condition / spent elsewhere)
      const fresh = await getUserCreditDetails(userId, role);
      return {
        success: false,
        remaining: fresh.credits,
        nextCreditDate: fresh.nextCreditDate,
        message: `Insufficient credits to complete ${actionName}.`,
      };
    }

    const row = updated[0];
    const remaining = row.credits ?? 0;
    const nextCreditDate = row.next_credit_date ? new Date(row.next_credit_date).toISOString() : currentDetails.nextCreditDate;

    return { success: true, remaining, nextCreditDate };
  } catch (err) {
    console.error('Failed to deduct user credits:', err);
    return {
      success: false,
      remaining: currentDetails.credits,
      nextCreditDate: currentDetails.nextCreditDate,
      message: 'Failed to process credit transaction.',
    };
  }
}

