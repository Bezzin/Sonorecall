import {
  BillingInterval,
  CarryoverRule,
  MemberSubscription,
  MembershipPlan,
} from '../types';

export const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
  every_4_weeks: 'Every 4 Weeks',
};

const monthsPerInterval: Record<BillingInterval, number> = {
  monthly: 1,
  quarterly: 3,
  annually: 12,
  every_4_weeks: 0, // handled separately (28 days)
};

export function calculateNextRenewalDate(
  from: string | Date,
  interval: BillingInterval,
  periods: number = 1
): string {
  let base = typeof from === 'string' ? new Date(from) : new Date(from.getTime());
  for (let i = 0; i < periods; i += 1) {
    base = addSingleInterval(base, interval);
  }
  return base.toISOString();
}

export function calculateMinimumTermEndDate(
  enrolledAt: string,
  minimumTermMonths?: number
): string | undefined {
  if (!minimumTermMonths) return undefined;
  const start = new Date(enrolledAt);
  const end = new Date(start.getTime());
  end.setMonth(end.getMonth() + minimumTermMonths);
  return end.toISOString();
}

export function getIntervalsPerYear(interval: BillingInterval): number {
  switch (interval) {
    case 'monthly':
      return 12;
    case 'quarterly':
      return 4;
    case 'annually':
      return 1;
    case 'every_4_weeks':
      return 13;
    default:
      return 12;
  }
}

export function calculatePrepayTotal(
  pricePerPeriod: number,
  periods: number,
  discountPercentage?: number
): {
  subtotal: number;
  discountAmount: number;
  totalDue: number;
} {
  const subtotal = pricePerPeriod * periods;
  const discountAmount = discountPercentage
    ? Math.round(subtotal * (discountPercentage / 100) * 100) / 100
    : 0;
  const totalDue = Math.max(subtotal - discountAmount, 0);
  return { subtotal, discountAmount, totalDue };
}

export function applyCarryoverRule(
  remainingCurrentPeriodCredits: number,
  previousCarryoverCredits: number,
  rule: CarryoverRule
): { carriedOver: number; expired: number } {
  switch (rule) {
    case 'none':
      return { carriedOver: 0, expired: remainingCurrentPeriodCredits + previousCarryoverCredits };
    case 'one_period':
      return { carriedOver: remainingCurrentPeriodCredits, expired: previousCarryoverCredits };
    case 'unlimited':
      return {
        carriedOver: remainingCurrentPeriodCredits + previousCarryoverCredits,
        expired: 0,
      };
    default:
      return { carriedOver: 0, expired: remainingCurrentPeriodCredits + previousCarryoverCredits };
  }
}

export function buildRenewalCreditState(
  subscription: MemberSubscription,
  plan: MembershipPlan,
  periods: number = 1
): {
  currentPeriodCredits: number;
  carriedOverCredits: number;
  totalCreditsGranted: number;
  expiredCredits: number;
} {
  let current = subscription.currentPeriodCredits;
  let carryover = subscription.carriedOverCredits;
  let totalGranted = subscription.totalCreditsGranted;
  let expiredTotal = 0;

  for (let i = 0; i < periods; i += 1) {
    const { carriedOver, expired } = applyCarryoverRule(current, carryover, plan.creditCarryoverRule);
    carryover = carriedOver;
    expiredTotal += expired;
    current = plan.includedCredits;
    totalGranted += plan.includedCredits;
  }

  return {
    currentPeriodCredits: current,
    carriedOverCredits: carryover,
    totalCreditsGranted,
    expiredCredits: expiredTotal,
  };
}

export function isWithinMinimumTerm(
  subscription: MemberSubscription,
  referenceDate: Date = new Date()
): boolean {
  if (!subscription.minimumTermEndDate) return false;
  return referenceDate < new Date(subscription.minimumTermEndDate);
}

export function getAvailableMembershipCredits(subscription: MemberSubscription): number {
  return Math.max(subscription.currentPeriodCredits + subscription.carriedOverCredits, 0);
}

export function redeemMembershipCredits(
  subscription: MemberSubscription,
  creditsToRedeem: number
): {
  updatedSubscription?: MemberSubscription;
  redeemed: number;
  fromCarryover: number;
  fromCurrent: number;
  error?: string;
} {
  const normalizedCredits = Math.floor(Math.max(creditsToRedeem, 0));
  if (normalizedCredits <= 0) {
    return { redeemed: 0, fromCarryover: 0, fromCurrent: 0, error: 'No credits requested.' };
  }

  const available = getAvailableMembershipCredits(subscription);
  if (normalizedCredits > available) {
    return {
      redeemed: 0,
      fromCarryover: 0,
      fromCurrent: 0,
      error: 'Insufficient membership credits.',
    };
  }

  let remaining = normalizedCredits;
  let fromCarryover = 0;
  let fromCurrent = 0;
  let carryover = subscription.carriedOverCredits;
  let current = subscription.currentPeriodCredits;

  if (carryover > 0) {
    const useFromCarry = Math.min(carryover, remaining);
    fromCarryover = useFromCarry;
    carryover -= useFromCarry;
    remaining -= useFromCarry;
  }

  if (remaining > 0 && current > 0) {
    const useFromCurrent = Math.min(current, remaining);
    fromCurrent = useFromCurrent;
    current -= useFromCurrent;
    remaining -= useFromCurrent;
  }

  const updated: MemberSubscription = {
    ...subscription,
    carriedOverCredits: carryover,
    currentPeriodCredits: current,
    totalCreditsRedeemed: subscription.totalCreditsRedeemed + normalizedCredits,
  };

  return {
    updatedSubscription: updated,
    redeemed: normalizedCredits,
    fromCarryover,
    fromCurrent,
  };
}

export function calculatePrepaidUntil(
  enrolledAt: string,
  interval: BillingInterval,
  prepaidPeriods: number
): string {
  return calculateNextRenewalDate(enrolledAt, interval, prepaidPeriods);
}

export function getMinimumTermPeriods(
  plan: MembershipPlan
): number | undefined {
  if (!plan.minimumTermMonths) return undefined;
  const months = plan.minimumTermMonths;
  if (plan.billingInterval === 'every_4_weeks') {
    // Approximate 28-day cycle into months (~0.92 months)
    return Math.ceil((months * 30.4375) / 28);
  }
  const monthsPer = monthsPerInterval[plan.billingInterval];
  if (!monthsPer || monthsPer === 0) {
    return Math.ceil(months / 1);
  }
  return Math.ceil(months / monthsPer);
}

function addSingleInterval(date: Date, interval: BillingInterval): Date {
  const next = new Date(date.getTime());
  switch (interval) {
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'annually':
      next.setFullYear(next.getFullYear() + 1);
      break;
    case 'every_4_weeks':
      next.setDate(next.getDate() + 28);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return next;
}
