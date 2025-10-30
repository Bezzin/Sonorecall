import {
  Product,
  Appointment,
  Bundle,
  BXGYRule,
  UpsellRule,
  PaymentPlan,
  ScaledOffer,
  DownsellRule,
  UpgradeCredit,
  AccountCredit,
  CreditLedgerEntry,
  RefundTransaction,
  MembershipPlan,
  MemberSubscription,
  MembershipEvent,
  ReferralProgramConfig,
  CustomerReferralCode,
  ReferralRelationship,
  ReferralEvent,
  CampaignTriggerConfig,
  CampaignMessage,
  CustomerCommunicationPreferences,
  CampaignQueueItem,
} from '../types';
import { ImportMetadata } from './productImport';

const STORAGE_KEYS = {
  PRODUCTS: 'sonorecall_products',
  APPOINTMENTS: 'sonorecall_appointments',
  BUNDLES: 'sonorecall_bundles',
  BXGY_RULES: 'sonorecall_bxgy_rules',
  UPSELL_RULES: 'sonorecall_upsell_rules',
  PAYMENT_PLANS: 'sonorecall_payment_plans',
  SCALED_OFFERS: 'sonorecall_scaled_offers',
  DOWNSELL_RULES: 'sonorecall_downsell_rules',
  UPGRADE_CREDITS: 'sonorecall_upgrade_credits',
  MEMBERSHIP_PLANS: 'sonorecall_membership_plans',
  MEMBER_SUBSCRIPTIONS: 'sonorecall_member_subscriptions',
  MEMBERSHIP_EVENTS: 'sonorecall_membership_events',
  IMPORT_HISTORY: 'sonorecall_import_history',
  ACCOUNT_CREDITS: 'sonorecall_account_credits',
  CREDIT_LEDGER: 'sonorecall_credit_ledger',
  REFUND_TRANSACTIONS: 'sonorecall_refund_transactions',
  REFERRAL_PROGRAM_CONFIG: 'sonorecall_referral_program_config',
  CUSTOMER_REFERRAL_CODES: 'sonorecall_customer_referral_codes',
  REFERRAL_RELATIONSHIPS: 'sonorecall_referral_relationships',
  REFERRAL_EVENTS: 'sonorecall_referral_events',
  CAMPAIGN_TRIGGERS: 'sonorecall_campaign_triggers',
  CAMPAIGN_MESSAGES: 'sonorecall_campaign_messages',
  CUSTOMER_PREFERENCES: 'sonorecall_customer_preferences',
  CAMPAIGN_QUEUE: 'sonorecall_campaign_queue',
} as const;

// Product storage functions
export const saveProducts = (products: Product[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  } catch (error) {
    console.error('Failed to save products to localStorage:', error);
  }
};

export const loadProducts = (defaultProducts: Product[]): Product[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load products from localStorage:', error);
  }
  return defaultProducts;
};

// Appointment storage functions
export const saveAppointments = (
  upcomingAppointments: Appointment[],
  recentAppointments: Appointment[]
): void => {
  try {
    localStorage.setItem(
      STORAGE_KEYS.APPOINTMENTS,
      JSON.stringify({ upcoming: upcomingAppointments, recent: recentAppointments })
    );
  } catch (error) {
    console.error('Failed to save appointments to localStorage:', error);
  }
};

export const loadAppointments = (
  defaultUpcoming: Appointment[],
  defaultRecent: Appointment[]
): { upcoming: Appointment[]; recent: Appointment[] } => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    if (data) {
      const parsed = JSON.parse(data);
      return {
        upcoming: parsed.upcoming || defaultUpcoming,
        recent: parsed.recent || defaultRecent,
      };
    }
  } catch (error) {
    console.error('Failed to load appointments from localStorage:', error);
  }
  return { upcoming: defaultUpcoming, recent: defaultRecent };
};

// Bundle storage functions
export const saveBundles = (bundles: Bundle[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.BUNDLES, JSON.stringify(bundles));
  } catch (error) {
    console.error('Failed to save bundles to localStorage:', error);
  }
};

export const loadBundles = (defaultBundles: Bundle[]): Bundle[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BUNDLES);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load bundles from localStorage:', error);
  }
  return defaultBundles;
};

// BXGY Rule storage functions
export const saveBXGYRules = (rules: BXGYRule[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.BXGY_RULES, JSON.stringify(rules));
  } catch (error) {
    console.error('Failed to save BXGY rules to localStorage:', error);
  }
};

export const loadBXGYRules = (defaultRules: BXGYRule[]): BXGYRule[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BXGY_RULES);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load BXGY rules from localStorage:', error);
  }
  return defaultRules;
};

// Upsell Rule storage functions
export const saveUpsellRules = (rules: UpsellRule[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.UPSELL_RULES, JSON.stringify(rules));
  } catch (error) {
    console.error('Failed to save upsell rules to localStorage:', error);
  }
};

export const loadUpsellRules = (defaultRules: UpsellRule[]): UpsellRule[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.UPSELL_RULES);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load upsell rules from localStorage:', error);
  }
  return defaultRules;
};

// Payment plan storage functions
export const savePaymentPlans = (plans: PaymentPlan[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.PAYMENT_PLANS, JSON.stringify(plans));
  } catch (error) {
    console.error('Failed to save payment plans to localStorage:', error);
  }
};

export const loadPaymentPlans = (defaultPlans: PaymentPlan[]): PaymentPlan[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PAYMENT_PLANS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load payment plans from localStorage:', error);
  }
  return defaultPlans;
};

// Scaled offer storage functions
export const saveScaledOffers = (offers: ScaledOffer[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SCALED_OFFERS, JSON.stringify(offers));
  } catch (error) {
    console.error('Failed to save scaled offers to localStorage:', error);
  }
};

export const loadScaledOffers = (defaultOffers: ScaledOffer[]): ScaledOffer[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SCALED_OFFERS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load scaled offers from localStorage:', error);
  }
  return defaultOffers;
};

// Downsell rule storage functions
export const saveDownsellRules = (rules: DownsellRule[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.DOWNSELL_RULES, JSON.stringify(rules));
  } catch (error) {
    console.error('Failed to save downsell rules to localStorage:', error);
  }
};

export const loadDownsellRules = (defaultRules: DownsellRule[]): DownsellRule[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DOWNSELL_RULES);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load downsell rules from localStorage:', error);
  }
  return defaultRules;
};

// Upgrade credit storage functions
export const saveUpgradeCredits = (credits: UpgradeCredit[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.UPGRADE_CREDITS, JSON.stringify(credits));
  } catch (error) {
    console.error('Failed to save upgrade credits to localStorage:', error);
  }
};

export const loadUpgradeCredits = (defaultCredits: UpgradeCredit[] = []): UpgradeCredit[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.UPGRADE_CREDITS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load upgrade credits from localStorage:', error);
  }
  return defaultCredits;
};

// Membership storage functions
export const saveMembershipPlans = (plans: MembershipPlan[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.MEMBERSHIP_PLANS, JSON.stringify(plans));
  } catch (error) {
    console.error('Failed to save membership plans to localStorage:', error);
  }
};

export const loadMembershipPlans = (defaultPlans: MembershipPlan[]): MembershipPlan[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MEMBERSHIP_PLANS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load membership plans from localStorage:', error);
  }
  return defaultPlans;
};

export const saveMemberSubscriptions = (memberships: MemberSubscription[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.MEMBER_SUBSCRIPTIONS, JSON.stringify(memberships));
  } catch (error) {
    console.error('Failed to save member subscriptions to localStorage:', error);
  }
};

export const loadMemberSubscriptions = (defaultMemberships: MemberSubscription[] = []): MemberSubscription[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MEMBER_SUBSCRIPTIONS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load member subscriptions from localStorage:', error);
  }
  return defaultMemberships;
};

export const saveMembershipEvents = (events: MembershipEvent[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.MEMBERSHIP_EVENTS, JSON.stringify(events));
  } catch (error) {
    console.error('Failed to save membership events to localStorage:', error);
  }
};

export const loadMembershipEvents = (defaultEvents: MembershipEvent[] = []): MembershipEvent[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MEMBERSHIP_EVENTS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load membership events from localStorage:', error);
  }
  return defaultEvents;
};

// Import history storage functions
export const saveImportHistory = (history: ImportMetadata[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.IMPORT_HISTORY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save import history to localStorage:', error);
  }
};

export const loadImportHistory = (): ImportMetadata[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.IMPORT_HISTORY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load import history from localStorage:', error);
  }
  return [];
};

export const addImportRecord = (metadata: ImportMetadata): void => {
  try {
    const history = loadImportHistory();
    history.unshift(metadata); // Add to beginning
    // Keep only last 10 imports
    const trimmed = history.slice(0, 10);
    saveImportHistory(trimmed);
  } catch (error) {
    console.error('Failed to add import record:', error);
  }
};

// Account credit storage functions
export const saveAccountCredits = (credits: AccountCredit[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.ACCOUNT_CREDITS, JSON.stringify(credits));
  } catch (error) {
    console.error('Failed to save account credits to localStorage:', error);
  }
};

export const loadAccountCredits = (): AccountCredit[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ACCOUNT_CREDITS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load account credits from localStorage:', error);
  }
  return [];
};

// Credit ledger storage functions
export const saveCreditLedger = (ledger: CreditLedgerEntry[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CREDIT_LEDGER, JSON.stringify(ledger));
  } catch (error) {
    console.error('Failed to save credit ledger to localStorage:', error);
  }
};

export const loadCreditLedger = (): CreditLedgerEntry[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CREDIT_LEDGER);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load credit ledger from localStorage:', error);
  }
  return [];
};

// Refund transaction storage functions
export const saveRefundTransactions = (refunds: RefundTransaction[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.REFUND_TRANSACTIONS, JSON.stringify(refunds));
  } catch (error) {
    console.error('Failed to save refund transactions to localStorage:', error);
  }
};

export const loadRefundTransactions = (): RefundTransaction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REFUND_TRANSACTIONS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load refund transactions from localStorage:', error);
  }
  return [];
};

// Referral program storage functions
export const saveReferralProgramConfig = (config: ReferralProgramConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.REFERRAL_PROGRAM_CONFIG, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save referral program config to localStorage:', error);
  }
};

export const loadReferralProgramConfig = (defaultConfig: ReferralProgramConfig): ReferralProgramConfig => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REFERRAL_PROGRAM_CONFIG);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load referral program config from localStorage:', error);
  }
  return defaultConfig;
};

export const saveCustomerReferralCodes = (codes: CustomerReferralCode[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOMER_REFERRAL_CODES, JSON.stringify(codes));
  } catch (error) {
    console.error('Failed to save customer referral codes to localStorage:', error);
  }
};

export const loadCustomerReferralCodes = (defaultCodes: CustomerReferralCode[] = []): CustomerReferralCode[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMER_REFERRAL_CODES);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load customer referral codes from localStorage:', error);
  }
  return defaultCodes;
};

export const saveReferralRelationships = (relationships: ReferralRelationship[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.REFERRAL_RELATIONSHIPS, JSON.stringify(relationships));
  } catch (error) {
    console.error('Failed to save referral relationships to localStorage:', error);
  }
};

export const loadReferralRelationships = (defaultRelationships: ReferralRelationship[] = []): ReferralRelationship[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REFERRAL_RELATIONSHIPS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load referral relationships from localStorage:', error);
  }
  return defaultRelationships;
};

export const saveReferralEvents = (events: ReferralEvent[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.REFERRAL_EVENTS, JSON.stringify(events));
  } catch (error) {
    console.error('Failed to save referral events to localStorage:', error);
  }
};

export const loadReferralEvents = (defaultEvents: ReferralEvent[] = []): ReferralEvent[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REFERRAL_EVENTS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load referral events from localStorage:', error);
  }
  return defaultEvents;
};

// CRM Campaign storage functions
export const saveCampaignTriggers = (triggers: CampaignTriggerConfig[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CAMPAIGN_TRIGGERS, JSON.stringify(triggers));
  } catch (error) {
    console.error('Failed to save campaign triggers to localStorage:', error);
  }
};

export const loadCampaignTriggers = (defaultTriggers: CampaignTriggerConfig[] = []): CampaignTriggerConfig[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CAMPAIGN_TRIGGERS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load campaign triggers from localStorage:', error);
  }
  return defaultTriggers;
};

export const saveCampaignMessages = (messages: CampaignMessage[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CAMPAIGN_MESSAGES, JSON.stringify(messages));
  } catch (error) {
    console.error('Failed to save campaign messages to localStorage:', error);
  }
};

export const loadCampaignMessages = (defaultMessages: CampaignMessage[] = []): CampaignMessage[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CAMPAIGN_MESSAGES);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load campaign messages from localStorage:', error);
  }
  return defaultMessages;
};

export const saveCustomerPreferences = (preferences: CustomerCommunicationPreferences[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOMER_PREFERENCES, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save customer preferences to localStorage:', error);
  }
};

export const loadCustomerPreferences = (defaultPreferences: CustomerCommunicationPreferences[] = []): CustomerCommunicationPreferences[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMER_PREFERENCES);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load customer preferences from localStorage:', error);
  }
  return defaultPreferences;
};

export const saveCampaignQueue = (queue: CampaignQueueItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CAMPAIGN_QUEUE, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to save campaign queue to localStorage:', error);
  }
};

export const loadCampaignQueue = (defaultQueue: CampaignQueueItem[] = []): CampaignQueueItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CAMPAIGN_QUEUE);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load campaign queue from localStorage:', error);
  }
  return defaultQueue;
};

export const clearStorage = (): void => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
};
