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
} from '../types';

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

export const clearStorage = (): void => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
};
