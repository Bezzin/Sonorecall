import {
  AccountCredit,
  CreditLedgerEntry,
  RefundTransaction,
  CustomerCreditBalance,
  CreditSource,
  CreditCategory,
  CreditLedgerAction,
  Appointment,
} from '../types';

/**
 * Generate unique ID for credits/ledger entries
 */
export function generateCreditId(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}

/**
 * Issue a new account credit
 */
export function issueCredit(
  patientName: string,
  amount: number,
  source: CreditSource,
  reasonCode: string,
  description: string,
  options: {
    createdBy?: string;
    expiresAt?: string;
    allowedCategories?: CreditCategory[];
    maxPerOrder?: number;
    sourceReference?: string;
  } = {}
): AccountCredit {
  const now = new Date().toISOString();

  return {
    id: generateCreditId(),
    patientName,
    amount,
    remainingAmount: amount,
    description,
    source,
    sourceReference: options.sourceReference,
    createdAt: now,
    createdBy: options.createdBy || 'system',
    expiresAt: options.expiresAt,
    isActive: true,
    allowedCategories: options.allowedCategories || ['all'],
    maxPerOrder: options.maxPerOrder,
    reasonCode,
  };
}

/**
 * Create ledger entry for credit action
 */
export function createLedgerEntry(
  creditId: number,
  action: CreditLedgerAction,
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  options: {
    appointmentId?: number;
    refundId?: number;
    performedBy?: string;
    notes?: string;
  } = {}
): CreditLedgerEntry {
  return {
    id: generateCreditId(),
    creditId,
    action,
    amount,
    balanceBefore,
    balanceAfter,
    appointmentId: options.appointmentId,
    refundId: options.refundId,
    timestamp: new Date().toISOString(),
    performedBy: options.performedBy || 'system',
    notes: options.notes,
  };
}

/**
 * Check if credit is expired
 */
export function isCreditExpired(credit: AccountCredit): boolean {
  if (!credit.expiresAt) return false;
  return new Date(credit.expiresAt) < new Date();
}

/**
 * Check if credit is expiring soon (within days)
 */
export function isCreditExpiringSoon(credit: AccountCredit, days: number = 30): boolean {
  if (!credit.expiresAt) return false;
  const expiryDate = new Date(credit.expiresAt);
  const soonDate = new Date();
  soonDate.setDate(soonDate.getDate() + days);
  return expiryDate <= soonDate && expiryDate > new Date();
}

/**
 * Validate if credit can be used for a purchase
 */
export function validateCreditForPurchase(
  credit: AccountCredit,
  purchaseContext: {
    hasServices: boolean;
    hasProducts: boolean;
    hasPackages: boolean;
    totalAmount: number;
  }
): { valid: boolean; reason?: string } {
  // Check if active
  if (!credit.isActive) {
    return { valid: false, reason: 'Credit is not active' };
  }

  // Check if expired
  if (isCreditExpired(credit)) {
    return { valid: false, reason: 'Credit has expired' };
  }

  // Check if has remaining balance
  if (credit.remainingAmount <= 0) {
    return { valid: false, reason: 'Credit has no remaining balance' };
  }

  // Check category restrictions
  const categories = credit.allowedCategories || ['all'];
  if (!categories.includes('all')) {
    if (categories.includes('services_only') && !purchaseContext.hasServices) {
      return { valid: false, reason: 'Credit can only be used for services' };
    }
    if (categories.includes('products_only') && !purchaseContext.hasProducts) {
      return { valid: false, reason: 'Credit can only be used for products' };
    }
    if (categories.includes('packages_only') && !purchaseContext.hasPackages) {
      return { valid: false, reason: 'Credit can only be used for packages' };
    }
  }

  return { valid: true };
}

/**
 * Calculate how much credit can be applied to a purchase
 */
export function calculateApplicableCredit(
  credit: AccountCredit,
  totalAmount: number
): number {
  let applicable = credit.remainingAmount;

  // Apply max per order limit
  if (credit.maxPerOrder && credit.maxPerOrder < applicable) {
    applicable = credit.maxPerOrder;
  }

  // Can't apply more than the total amount
  if (applicable > totalAmount) {
    applicable = totalAmount;
  }

  return Math.round(applicable * 100) / 100; // Round to 2 decimals
}

/**
 * Apply credit to a purchase and create ledger entry
 */
export function applyCredit(
  credit: AccountCredit,
  amountToApply: number,
  appointmentId: number,
  ledger: CreditLedgerEntry[],
  performedBy?: string
): {
  updatedCredit: AccountCredit;
  ledgerEntry: CreditLedgerEntry;
} {
  const balanceBefore = credit.remainingAmount;
  const balanceAfter = Math.max(0, balanceBefore - amountToApply);

  const updatedCredit: AccountCredit = {
    ...credit,
    remainingAmount: balanceAfter,
  };

  const ledgerEntry = createLedgerEntry(
    credit.id,
    'applied',
    amountToApply,
    balanceBefore,
    balanceAfter,
    {
      appointmentId,
      performedBy,
      notes: `Applied to appointment #${appointmentId}`,
    }
  );

  return { updatedCredit, ledgerEntry };
}

/**
 * Expire a credit and create ledger entry
 */
export function expireCredit(
  credit: AccountCredit,
  ledger: CreditLedgerEntry[]
): {
  updatedCredit: AccountCredit;
  ledgerEntry: CreditLedgerEntry;
} {
  const balanceBefore = credit.remainingAmount;

  const updatedCredit: AccountCredit = {
    ...credit,
    isActive: false,
    remainingAmount: 0,
  };

  const ledgerEntry = createLedgerEntry(
    credit.id,
    'expired',
    balanceBefore,
    balanceBefore,
    0,
    {
      performedBy: 'system',
      notes: 'Credit expired',
    }
  );

  return { updatedCredit, ledgerEntry };
}

/**
 * Revoke a credit and create ledger entry
 */
export function revokeCredit(
  credit: AccountCredit,
  reason: string,
  performedBy: string,
  ledger: CreditLedgerEntry[]
): {
  updatedCredit: AccountCredit;
  ledgerEntry: CreditLedgerEntry;
} {
  const balanceBefore = credit.remainingAmount;

  const updatedCredit: AccountCredit = {
    ...credit,
    isActive: false,
    remainingAmount: 0,
  };

  const ledgerEntry = createLedgerEntry(
    credit.id,
    'revoked',
    balanceBefore,
    balanceBefore,
    0,
    {
      performedBy,
      notes: reason,
    }
  );

  return { updatedCredit, ledgerEntry };
}

/**
 * Adjust credit amount (can be positive or negative)
 */
export function adjustCredit(
  credit: AccountCredit,
  adjustmentAmount: number,
  reason: string,
  performedBy: string,
  ledger: CreditLedgerEntry[]
): {
  updatedCredit: AccountCredit;
  ledgerEntry: CreditLedgerEntry;
} {
  const balanceBefore = credit.remainingAmount;
  const balanceAfter = Math.max(0, balanceBefore + adjustmentAmount);

  const updatedCredit: AccountCredit = {
    ...credit,
    remainingAmount: balanceAfter,
    amount: credit.amount + adjustmentAmount, // Update total amount too
  };

  const ledgerEntry = createLedgerEntry(
    credit.id,
    'adjusted',
    Math.abs(adjustmentAmount),
    balanceBefore,
    balanceAfter,
    {
      performedBy,
      notes: reason,
    }
  );

  return { updatedCredit, ledgerEntry };
}

/**
 * Calculate customer credit balance
 */
export function calculateCustomerBalance(
  patientName: string,
  credits: AccountCredit[]
): CustomerCreditBalance {
  const customerCredits = credits.filter(c => c.patientName === patientName);

  const totalCredits = customerCredits.reduce((sum, c) => sum + c.amount, 0);
  const redeemedCredits = customerCredits.reduce(
    (sum, c) => sum + (c.amount - c.remainingAmount),
    0
  );
  const expiredCredits = customerCredits
    .filter(c => isCreditExpired(c))
    .reduce((sum, c) => sum + c.remainingAmount, 0);
  const availableCredits = customerCredits
    .filter(c => c.isActive && !isCreditExpired(c))
    .reduce((sum, c) => sum + c.remainingAmount, 0);
  const pendingExpiry = customerCredits
    .filter(c => c.isActive && isCreditExpiringSoon(c, 30))
    .reduce((sum, c) => sum + c.remainingAmount, 0);

  return {
    patientName,
    totalCredits: Math.round(totalCredits * 100) / 100,
    availableCredits: Math.round(availableCredits * 100) / 100,
    expiredCredits: Math.round(expiredCredits * 100) / 100,
    redeemedCredits: Math.round(redeemedCredits * 100) / 100,
    pendingExpiry: Math.round(pendingExpiry * 100) / 100,
  };
}

/**
 * Get available credits for a customer (active, not expired, with balance)
 */
export function getAvailableCredits(
  patientName: string,
  credits: AccountCredit[]
): AccountCredit[] {
  return credits
    .filter(
      c =>
        c.patientName === patientName &&
        c.isActive &&
        !isCreditExpired(c) &&
        c.remainingAmount > 0
    )
    .sort((a, b) => {
      // Sort by expiry date (soonest first), then by creation date (oldest first)
      if (a.expiresAt && b.expiresAt) {
        return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      }
      if (a.expiresAt) return -1;
      if (b.expiresAt) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
}

/**
 * Process refund as credit
 */
export function processRefundAsCredit(
  appointment: Appointment,
  refundAmount: number,
  reason: string,
  reasonCategory: RefundTransaction['reasonCategory'],
  processedBy: string,
  options: {
    expiryDays?: number;
    notes?: string;
  } = {}
): {
  credit: AccountCredit;
  refund: RefundTransaction;
  ledgerEntry: CreditLedgerEntry;
} {
  const now = new Date().toISOString();
  let expiresAt: string | undefined;

  if (options.expiryDays) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + options.expiryDays);
    expiresAt = expiry.toISOString();
  }

  // Create credit
  const credit = issueCredit(
    appointment.patientName,
    refundAmount,
    'refund',
    reasonCategory,
    `Refund for appointment #${appointment.id}: ${reason}`,
    {
      createdBy: processedBy,
      expiresAt,
      sourceReference: `Appointment #${appointment.id}`,
    }
  );

  // Create refund transaction
  const refund: RefundTransaction = {
    id: generateCreditId(),
    appointmentId: appointment.id,
    patientName: appointment.patientName,
    refundType: refundAmount >= (appointment.finalTotal || 0) ? 'full' : 'partial',
    originalAmount: appointment.finalTotal || 0,
    refundAmount,
    refundMethod: 'credit',
    reason,
    reasonCategory,
    status: 'processed',
    createdAt: now,
    processedAt: now,
    processedBy,
    creditId: credit.id,
    notes: options.notes,
  };

  // Create ledger entry
  const ledgerEntry = createLedgerEntry(
    credit.id,
    'issued',
    refundAmount,
    0,
    refundAmount,
    {
      refundId: refund.id,
      performedBy: processedBy,
      notes: `Issued from refund for appointment #${appointment.id}`,
    }
  );

  return { credit, refund, ledgerEntry };
}

/**
 * Auto-apply credits at checkout
 */
export function autoApplyCredits(
  patientName: string,
  totalAmount: number,
  purchaseContext: {
    hasServices: boolean;
    hasProducts: boolean;
    hasPackages: boolean;
  },
  availableCredits: AccountCredit[]
): {
  creditsToApply: Array<{ credit: AccountCredit; amount: number }>;
  totalCreditApplied: number;
  remainingBalance: number;
} {
  let remaining = totalAmount;
  const creditsToApply: Array<{ credit: AccountCredit; amount: number }> = [];

  // Get customer's available credits (already sorted by priority)
  const customerCredits = getAvailableCredits(patientName, availableCredits);

  for (const credit of customerCredits) {
    if (remaining <= 0) break;

    // Validate credit can be used
    const validation = validateCreditForPurchase(credit, {
      ...purchaseContext,
      totalAmount: remaining,
    });

    if (!validation.valid) continue;

    // Calculate how much can be applied
    const applicable = calculateApplicableCredit(credit, remaining);

    if (applicable > 0) {
      creditsToApply.push({ credit, amount: applicable });
      remaining -= applicable;
    }
  }

  const totalCreditApplied = Math.round(
    creditsToApply.reduce((sum, c) => sum + c.amount, 0) * 100
  ) / 100;

  return {
    creditsToApply,
    totalCreditApplied,
    remainingBalance: Math.max(0, Math.round((totalAmount - totalCreditApplied) * 100) / 100),
  };
}

/**
 * Format credit source for display
 */
export function formatCreditSource(source: CreditSource): string {
  const labels: Record<CreditSource, string> = {
    manual: 'Manual Adjustment',
    refund: 'Refund',
    challenge_refund: 'Challenge Refund',
    win_back: 'Win-Back Offer',
    upgrade_incentive: 'Upgrade Incentive',
    downsell_trial: 'Trial Credit',
    compensation: 'Compensation',
    promotional: 'Promotional',
  };
  return labels[source] || source;
}

/**
 * Format ledger action for display
 */
export function formatLedgerAction(action: CreditLedgerAction): string {
  const labels: Record<CreditLedgerAction, string> = {
    issued: 'Issued',
    applied: 'Applied',
    expired: 'Expired',
    revoked: 'Revoked',
    adjusted: 'Adjusted',
  };
  return labels[action] || action;
}
