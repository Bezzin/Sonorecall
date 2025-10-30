import {
  ReferralProgramConfig,
  CustomerReferralCode,
  ReferralRelationship,
  ReferralEvent,
  ReferralMetrics,
  ReferralIncentiveType,
} from '../types';

/**
 * Generate a unique referral code for a customer
 * Format: First name + random number (e.g., "SARAH25")
 */
export function generateReferralCode(customerName: string): string {
  const firstName = customerName.split(' ')[0].toUpperCase();
  const randomNum = Math.floor(Math.random() * 10000);
  return `${firstName}${randomNum}`;
}

/**
 * Generate shareable referral link
 */
export function generateReferralLink(code: string, baseUrl: string = 'https://sonorecall.clinic'): string {
  return `${baseUrl}/book?ref=${code}`;
}

/**
 * Generate share message for WhatsApp/FB
 */
export function generateShareMessage(code: string, config: ReferralProgramConfig): string {
  const incentiveDesc = config.refereeIncentiveType === 'percentage_discount'
    ? `${config.refereeIncentiveValue}% off`
    : `£${config.refereeIncentiveValue} off`;

  return `I love SonoRecall! Use my code ${code} and get ${incentiveDesc} your first booking. ${generateReferralLink(code)}`;
}

/**
 * Validate referral code
 */
export function validateReferralCode(
  code: string,
  customerReferralCodes: CustomerReferralCode[],
  config: ReferralProgramConfig
): { valid: boolean; error?: string; referralCode?: CustomerReferralCode } {
  const referralCode = customerReferralCodes.find(c => c.referralCode === code && c.active);

  if (!referralCode) {
    return { valid: false, error: 'Invalid or inactive referral code' };
  }

  // Check expiry
  if (referralCode.expiresAt) {
    const expiryDate = new Date(referralCode.expiresAt);
    if (new Date() > expiryDate) {
      return { valid: false, error: 'Referral code has expired' };
    }
  }

  // Check max referrals per referrer
  if (config.maxRewardsPerReferrer && referralCode.totalReferrals >= config.maxRewardsPerReferrer) {
    return { valid: false, error: 'Referral code has reached maximum uses' };
  }

  return { valid: true, referralCode };
}

/**
 * Check for fraud - prevent self-referral and other fraud patterns
 */
export function performFraudChecks(
  referrerCode: CustomerReferralCode,
  refereeName: string,
  refereeEmail?: string,
  refereePhone?: string,
  config?: ReferralProgramConfig,
  existingRelationships?: ReferralRelationship[]
): { passed: boolean; notes?: string } {
  if (!config) {
    return { passed: true };
  }

  const fraudNotes: string[] = [];

  // Self-referral check
  if (config.preventSelfReferral) {
    const nameLower = refereeName.toLowerCase().trim();
    const referrerNameLower = referrerCode.customerName.toLowerCase().trim();

    if (nameLower === referrerNameLower) {
      return { passed: false, notes: 'Self-referral detected: same name' };
    }

    if (refereeEmail && config.requireUniqueEmail) {
      if (referrerCode.customerEmail?.toLowerCase() === refereeEmail.toLowerCase()) {
        return { passed: false, notes: 'Self-referral detected: same email' };
      }
    }

    if (refereePhone && config.requireUniquePhone) {
      if (referrerCode.customerPhone === refereePhone) {
        return { passed: false, notes: 'Self-referral detected: same phone' };
      }
    }
  }

  // Check for duplicate referee (already used a referral code)
  if (existingRelationships && config.maxUsesPerReferee === 1) {
    const duplicateByEmail = refereeEmail && existingRelationships.some(
      r => r.refereeEmail?.toLowerCase() === refereeEmail.toLowerCase() && r.status !== 'cancelled'
    );
    const duplicateByPhone = refereePhone && existingRelationships.some(
      r => r.refereePhone === refereePhone && r.status !== 'cancelled'
    );

    if (duplicateByEmail) {
      fraudNotes.push('Email already used for referral');
    }
    if (duplicateByPhone) {
      fraudNotes.push('Phone already used for referral');
    }

    if (duplicateByEmail || duplicateByPhone) {
      return { passed: false, notes: fraudNotes.join('; ') };
    }
  }

  // Check rapid-fire referrals (multiple referrals in short time)
  if (config.minDaysBetweenReferrals && existingRelationships) {
    const recentReferrals = existingRelationships.filter(
      r => r.referrerCode === referrerCode.referralCode
    ).sort((a, b) => new Date(b.referredAt).getTime() - new Date(a.referredAt).getTime());

    if (recentReferrals.length > 0) {
      const lastReferral = recentReferrals[0];
      const daysSinceLastReferral = (new Date().getTime() - new Date(lastReferral.referredAt).getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceLastReferral < config.minDaysBetweenReferrals) {
        return { passed: false, notes: `Too many referrals in short time (${daysSinceLastReferral.toFixed(1)} days since last)` };
      }
    }
  }

  return { passed: true };
}

/**
 * Calculate referee incentive discount
 */
export function calculateRefereeIncentive(
  cartTotal: number,
  config: ReferralProgramConfig
): { valid: boolean; discount: number; message: string } {
  // Check minimum purchase
  if (config.refereeMinimumPurchase && cartTotal < config.refereeMinimumPurchase) {
    return {
      valid: false,
      discount: 0,
      message: `Minimum purchase of £${config.refereeMinimumPurchase} required to use referral code`,
    };
  }

  let discount = 0;
  let message = '';

  switch (config.refereeIncentiveType) {
    case 'percentage_discount':
      discount = cartTotal * (config.refereeIncentiveValue / 100);
      message = `${config.refereeIncentiveValue}% off applied (£${discount.toFixed(2)})`;
      break;
    case 'fixed_discount':
      discount = Math.min(config.refereeIncentiveValue, cartTotal); // don't exceed cart total
      message = `£${discount.toFixed(2)} off applied`;
      break;
    case 'account_credit':
      // Credit issued after purchase
      message = `£${config.refereeIncentiveValue} credit will be applied to your account`;
      break;
    case 'free_product':
      message = 'Free product will be added to your order';
      break;
    case 'free_service':
      message = 'Free service upgrade applied';
      break;
  }

  return { valid: true, discount, message };
}

/**
 * Calculate referral metrics
 */
export function calculateReferralMetrics(
  relationships: ReferralRelationship[],
  customerCodes: CustomerReferralCode[]
): ReferralMetrics {
  const completedReferrals = relationships.filter(r => r.status === 'completed' || r.status === 'rewarded');
  const pendingReferrals = relationships.filter(r => r.status === 'pending');

  const totalRevenue = completedReferrals.reduce((sum, r) => sum + (r.purchaseAmount || 0), 0);

  // Calculate total cost (rewards issued)
  const totalCost = relationships.reduce((sum, r) => {
    let cost = 0;
    if (r.refereeIncentiveApplied?.type === 'fixed_discount') {
      cost += r.refereeIncentiveApplied.value;
    }
    if (r.referrerRewardIssued?.type === 'account_credit') {
      cost += r.referrerRewardIssued.value;
    }
    return sum + cost;
  }, 0);

  const conversionRate = relationships.length > 0
    ? (completedReferrals.length / relationships.length) * 100
    : 0;

  const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

  const averageOrderValue = completedReferrals.length > 0
    ? totalRevenue / completedReferrals.length
    : 0;

  // Top referrers
  const referrerStats = new Map<string, { name: string; code: string; referrals: number; revenue: number }>();

  relationships.forEach(r => {
    if (r.status === 'completed' || r.status === 'rewarded') {
      const existing = referrerStats.get(r.referrerCode) || {
        name: r.referrerName,
        code: r.referrerCode,
        referrals: 0,
        revenue: 0,
      };
      existing.referrals++;
      existing.revenue += r.purchaseAmount || 0;
      referrerStats.set(r.referrerCode, existing);
    }
  });

  const topReferrers = Array.from(referrerStats.values())
    .sort((a, b) => b.referrals - a.referrals)
    .slice(0, 10);

  return {
    totalReferrals: relationships.length,
    completedReferrals: completedReferrals.length,
    pendingReferrals: pendingReferrals.length,
    conversionRate,
    totalRevenue,
    totalCost,
    roi,
    averageOrderValue,
    topReferrers,
  };
}

/**
 * Create referral event
 */
export function createReferralEvent(
  relationshipId: number,
  type: ReferralEvent['type'],
  data?: any,
  notes?: string
): ReferralEvent {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    relationshipId,
    type,
    timestamp: new Date().toISOString(),
    data,
    notes,
  };
}

/**
 * Format incentive description for display
 */
export function formatIncentiveDescription(
  type: ReferralIncentiveType,
  value: number,
  productName?: string,
  serviceName?: string
): string {
  switch (type) {
    case 'percentage_discount':
      return `${value}% discount`;
    case 'fixed_discount':
      return `£${value} off`;
    case 'account_credit':
      return `£${value} account credit`;
    case 'free_product':
      return productName ? `Free ${productName}` : 'Free product';
    case 'free_service':
      return serviceName ? `Free ${serviceName}` : 'Free service';
    default:
      return 'Reward';
  }
}
