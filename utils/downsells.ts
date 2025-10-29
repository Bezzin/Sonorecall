import {
  DownsellRule,
  DownsellSuggestion,
  DownsellCondition,
  PaymentPlan,
  PaymentSchedule,
  ScaledOffer,
  DownsellTrigger
} from '../types';

interface DownsellContext {
  cartValue: number;
  lastDeclinedItemType?: 'service' | 'product' | 'bundle' | 'upsell';
  lastDeclinedItemId?: number;
  hasDeclinedUpsell: boolean;
}

/**
 * Calculate payment schedule for a given plan and total amount
 */
export const calculatePaymentSchedule = (
  plan: PaymentPlan,
  totalAmount: number
): PaymentSchedule => {
  const processingFeeRaw = plan.processingFeePercentage
    ? totalAmount * (plan.processingFeePercentage / 100)
    : 0;

  const toCurrency = (value: number) => Math.round(value * 100) / 100;

  const processingFee = processingFeeRaw > 0 ? toCurrency(processingFeeRaw) : 0;
  const totalWithFee = toCurrency(totalAmount + processingFee);
  const rawInstallment = totalWithFee / plan.installmentCount;

  const installments = [];
  let accumulated = 0;
  let firstInstallmentAmount = 0;

  for (let i = 0; i < plan.installmentCount; i++) {
    let dueDate: string;
    let description: string;

    if (i === 0) {
      dueDate = 'Today';
      description = 'Initial payment';
    } else if (plan.type === 'half_now_half_later' && i === 1) {
      dueDate = 'In 30 days';
      description = 'Final payment';
    } else {
      const daysFromNow = 30 * i; // Roughly monthly
      dueDate = `In ${daysFromNow} days`;
      description = `Payment ${i + 1} of ${plan.installmentCount}`;
    }

    let amount = toCurrency(rawInstallment);

    // Adjust final installment to account for rounding differences
    if (i === plan.installmentCount - 1) {
      amount = toCurrency(totalWithFee - accumulated);
    }

    if (i === 0) {
      firstInstallmentAmount = amount;
    }

    installments.push({
      dueDate,
      amount,
      description,
    });

    accumulated = toCurrency(accumulated + amount);
  }

  return {
    installments,
    totalAmount: totalWithFee,
    dueToday: firstInstallmentAmount,
    processingFee: processingFee > 0 ? processingFee : undefined,
  };
};

/**
 * Check if a downsell condition matches the current context
 */
const checkDownsellCondition = (
  condition: DownsellCondition,
  context: DownsellContext,
  trigger: DownsellTrigger
): boolean => {
  // Must match trigger type
  if (condition.triggerType !== trigger) return false;

  // Check cart value if specified
  if (condition.minCartValue && context.cartValue < condition.minCartValue) {
    return false;
  }

  // Check declined item type if specified
  if (condition.declinedItemType) {
    if (!context.lastDeclinedItemType ||
        context.lastDeclinedItemType !== condition.declinedItemType) {
      return false;
    }
  }

  // Check declined item ID if specified
  if (condition.declinedItemId) {
    if (!context.lastDeclinedItemId ||
        context.lastDeclinedItemId !== condition.declinedItemId) {
      return false;
    }
  }

  return true;
};

/**
 * Check if a downsell rule is eligible
 */
const isDownsellRuleEligible = (
  rule: DownsellRule,
  context: DownsellContext,
  trigger: DownsellTrigger,
  shownRulesInSession: Set<number>
): boolean => {
  // Must be active
  if (!rule.active) return false;

  // Check if already shown (for onlyShowOnce rules)
  if (rule.onlyShowOnce && shownRulesInSession.has(rule.id)) {
    return false;
  }

  // All conditions must match
  return rule.conditions.every(condition =>
    checkDownsellCondition(condition, context, trigger)
  );
};

/**
 * Evaluate downsell rules and return the highest priority eligible suggestion
 */
export const evaluateDownsells = (
  rules: DownsellRule[],
  context: DownsellContext,
  trigger: DownsellTrigger,
  paymentPlans: PaymentPlan[],
  scaledOffers: ScaledOffer[],
  shownRulesInSession: Set<number> = new Set()
): DownsellSuggestion | null => {
  // Filter eligible rules
  const eligibleRules = rules.filter(rule =>
    isDownsellRuleEligible(rule, context, trigger, shownRulesInSession)
  );

  // Sort by priority (higher first)
  eligibleRules.sort((a, b) => b.priority - a.priority);

  // Return only the top suggestion (limit to 1 to avoid spam)
  if (eligibleRules.length === 0) return null;

  const rule = eligibleRules[0];

  // Build suggestion based on offer type
  const suggestion: DownsellSuggestion = {
    ruleId: rule.id,
    ruleName: rule.name,
    offerType: rule.offerType,
    headline: rule.headline,
    subheadline: rule.subheadline,
    trigger,
  };

  if (rule.offerType === 'payment_plan' && rule.paymentPlanId) {
    const plan = paymentPlans.find(p => p.id === rule.paymentPlanId);
    if (plan && plan.active) {
      // Check minimum cart value for plan
      if (plan.minCartValue && context.cartValue < plan.minCartValue) {
        return null; // Plan not eligible for this cart value
      }

      const schedule = calculatePaymentSchedule(plan, context.cartValue);
      suggestion.paymentPlan = plan;
      suggestion.paymentSchedule = schedule;
    } else {
      return null; // Plan not found or inactive
    }
  } else if (rule.offerType === 'scaled_offer' && rule.scaledOfferId) {
    const scaledOffer = scaledOffers.find(o => o.id === rule.scaledOfferId);
    if (scaledOffer && scaledOffer.active) {
      suggestion.scaledOffer = scaledOffer;
      suggestion.newPrice = scaledOffer.reducedPrice;
    } else {
      return null; // Scaled offer not found or inactive
    }
  } else if (rule.offerType === 'trial_credit') {
    suggestion.trialCreditAmount = rule.trialCreditAmount;
    suggestion.trialCreditDescription = rule.trialCreditDescription;
  }

  return suggestion;
};

/**
 * Build downsell context from booking state
 */
export const buildDownsellContext = (
  cartValue: number,
  lastDeclinedItemType?: 'service' | 'product' | 'bundle' | 'upsell',
  lastDeclinedItemId?: number,
  hasDeclinedUpsell: boolean = false
): DownsellContext => {
  return {
    cartValue,
    lastDeclinedItemType,
    lastDeclinedItemId,
    hasDeclinedUpsell,
  };
};
