export interface Patient {
  id: number;
  name: string;
  phone: string;
  email: string;
  lastVisit: string;
  nextDue: string;
}

export interface AppointmentProduct {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export interface Appointment {
  id: number;
  patientName: string;
  time: string;
  type: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled' | 'Completed';
  reviewStatus: 'Pending' | 'Requested' | 'Completed';
  price?: number;
  products?: AppointmentProduct[];
  productTotal?: number;
  bundles?: CartBundle[];
  appliedDiscounts?: AppliedDiscount[];
  upsellTracking?: UpsellTracking;
  downsellTracking?: DownsellTracking;
  paymentPlan?: SelectedPaymentPlan;
  originalTotal?: number;
  finalTotal?: number;
  totalSavings?: number;
  appliedCredits?: UpgradeCredit[];
  issuedCredits?: UpgradeCredit[];
  scaledOffer?: AcceptedScaledOffer;
}

export enum MessageSender {
  Clinic = 'clinic',
  Patient = 'patient',
  System = 'system',
}

export enum MessageType {
    Standard = 'standard',
    FeedbackRequest = 'feedback_request',
    PrivateNote = 'private_note',
}

export interface Message {
  id: number;
  sender: MessageSender;
  type: MessageType;
  text: string;
  timestamp: string;
  payload?: any; // Used for feedback requests, etc.
}

export interface Conversation {
  id: number;
  patientName: string;
  lastMessage: string;
  timestamp: string;
  messages: Message[];
  phoneNumber?: string;
  unread?: boolean;
}

export enum RecallStatus {
  Due = 'Due',
  Contacted = 'Contacted',
  Booked = 'Booked',
  Dismissed = 'Dismissed',
}

export interface Recall {
  id: number;
  patient: Patient;
  status: RecallStatus;
}

export interface MissedCall {
  id: number;
  callerNumber: string;
  timestamp: string;
  status: 'Pending' | 'Contacted';
}

export interface ClinicService {
  name: string;
  price: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  stockLevel: number;
  reorderPoint: number;
  active: boolean;
  trackStock: boolean;
}

export interface BundleItem {
  type: 'service' | 'product';
  id: number;
  name: string;
  quantity: number;
}

export interface Bundle {
  id: number;
  name: string;
  description: string;
  items: BundleItem[];
  discountType: 'fixed' | 'percentage';
  discountValue: number; // Fixed amount or percentage
  finalPrice?: number; // Optional: override calculated price
  active: boolean;
  category?: string;
}

export type BXGYRuleType = 'free_item' | 'percentage_discount' | 'fixed_discount';
export type BXGYTargetType = 'same_item' | 'specific_item' | 'category';

export interface BXGYRule {
  id: number;
  name: string;
  description: string;
  active: boolean;
  buyQuantity: number;
  buyItemType: 'product' | 'service' | 'any';
  buyItemId?: number; // Specific item to buy
  buyCategory?: string; // Or any from category
  ruleType: BXGYRuleType;
  getQuantity: number;
  getItemType?: 'product' | 'service';
  getItemId?: number; // For specific_item
  getCategory?: string; // For category
  discountValue?: number; // For percentage or fixed discount
  targetType: BXGYTargetType;
  maxUsesPerCustomer?: number;
  usageCount?: number; // Track total usage
}

export interface AppliedDiscount {
  type: 'bundle' | 'bxgy';
  id: number;
  name: string;
  description: string;
  discountAmount: number;
  affectedItems?: string[]; // Item names affected
}

export interface CartBundle {
  bundleId: number;
  bundleName: string;
  items: BundleItem[];
  originalPrice: number;
  finalPrice: number;
  savings: number;
}

// Upsell Engine Types
export type UpsellTriggerType = 'service_selected' | 'product_selected' | 'bundle_selected' | 'cart_value' | 'category_selected';
export type UpsellOfferType = 'upgrade' | 'addon' | 'quantity_bump' | 'bundle_upsell';
export type UpsellPlacement = 'after_service' | 'pre_payment' | 'pos_checkout';

export interface UpsellCondition {
  triggerType: UpsellTriggerType;
  serviceId?: number;
  serviceName?: string;
  productId?: number;
  productCategory?: string;
  bundleId?: number;
  minCartValue?: number;
}

export interface UpsellRule {
  id: number;
  name: string;
  description: string;
  active: boolean;
  priority: number; // Higher number = higher priority
  conditions: UpsellCondition[];
  offerType: UpsellOfferType;
  placement: UpsellPlacement[];

  // What to offer
  offeredItemType: 'service' | 'product' | 'bundle';
  offeredItemId: number;
  offeredItemName: string;

  // Pricing
  originalPrice?: number;
  discountedPrice?: number;
  discountPercentage?: number;
  incrementalPrice?: number; // "Just £X more"

  // Display
  headline: string;
  subheadline?: string;
  badge?: string; // e.g., "POPULAR", "SAVE 20%"

  // Limits
  maxDisplaysPerSession?: number;
  onlyShowOnce?: boolean;
}

export interface UpsellSuggestion {
  ruleId: number;
  ruleName: string;
  itemType: 'service' | 'product' | 'bundle';
  itemId: number;
  itemName: string;
  headline: string;
  subheadline?: string;
  badge?: string;
  originalPrice: number;
  finalPrice: number;
  savings?: number;
  incrementalPrice?: number;
  placement: UpsellPlacement;
}

export interface UpsellTracking {
  shown: UpsellSuggestion[];
  accepted: UpsellSuggestion[];
  declined: UpsellSuggestion[];
}

// Downsell Engine Types
export type PaymentPlanType = 'half_now_half_later' | 'three_pay' | 'six_pay' | 'custom';
export type DownsellOfferType = 'payment_plan' | 'scaled_offer' | 'trial_credit';
export type DownsellTrigger = 'upsell_declined' | 'checkout_hesitation' | 'cart_value_threshold';

export interface PaymentSchedule {
  installments: {
    dueDate: string; // e.g., "Today", "In 30 days", "In 60 days"
    amount: number;
    description: string;
  }[];
  totalAmount: number;
  dueToday: number;
  processingFee?: number;
}

export interface PaymentPlan {
  id: number;
  name: string;
  type: PaymentPlanType;
  description: string;
  installmentCount: number;
  minCartValue?: number;
  processingFeePercentage?: number; // e.g., 3% processing fee
  active: boolean;
}

export interface ScaledOffer {
  id: number;
  name: string;
  description: string;
  originalItemType: 'service' | 'bundle';
  originalItemId: number;
  originalItemName: string;
  reducedPrice: number;
  removedFeatures: string[];
  active: boolean;
}

export interface DownsellCondition {
  triggerType: DownsellTrigger;
  declinedItemType?: 'service' | 'product' | 'bundle' | 'upsell';
  declinedItemId?: number;
  minCartValue?: number;
}

export interface DownsellRule {
  id: number;
  name: string;
  description: string;
  active: boolean;
  priority: number;
  conditions: DownsellCondition[];
  offerType: DownsellOfferType;

  // Payment plan specific
  paymentPlanId?: number;

  // Scaled offer specific
  scaledOfferId?: number;

  // Trial/credit specific
  trialCreditAmount?: number;
  trialCreditDescription?: string;

  // Display
  headline: string;
  subheadline?: string;

  // Limits
  onlyShowOnce?: boolean;
}

export interface DownsellSuggestion {
  ruleId: number;
  ruleName: string;
  offerType: DownsellOfferType;
  headline: string;
  subheadline?: string;
  trigger?: DownsellTrigger;

  // Payment plan suggestion
  paymentPlan?: PaymentPlan;
  paymentSchedule?: PaymentSchedule;

  // Scaled offer suggestion
  scaledOffer?: ScaledOffer;
  originalPrice?: number;
  newPrice?: number;
  savings?: number;

  // Trial/credit suggestion
  trialCreditAmount?: number;
  trialCreditDescription?: string;
}

export interface DownsellTracking {
  shown: DownsellSuggestion[];
  accepted: DownsellSuggestion[];
  declined: DownsellSuggestion[];
}

export interface SelectedPaymentPlan {
  planId: number;
  planName: string;
  schedule: PaymentSchedule;
}

export interface UpgradeCredit {
  id: number;
  patientName: string;
  amount: number;
  description?: string;
  createdAt: string;
  expiresAt?: string;
  redeemed: boolean;
  sourceRuleId?: number;
  appliedAppointmentId?: number;
}

// Extended credit system types
export type CreditSource = 'manual' | 'refund' | 'challenge_refund' | 'win_back' | 'upgrade_incentive' | 'downsell_trial' | 'compensation' | 'promotional';
export type CreditCategory = 'all' | 'services_only' | 'products_only' | 'packages_only';
export type CreditLedgerAction = 'issued' | 'applied' | 'expired' | 'revoked' | 'adjusted';

export interface AccountCredit {
  id: number;
  patientName: string;
  amount: number;
  remainingAmount: number;
  description: string;
  source: CreditSource;
  sourceReference?: string; // e.g., "Appointment #123" or "Refund #456"
  createdAt: string;
  createdBy?: string; // Staff member name
  expiresAt?: string;
  isActive: boolean;
  allowedCategories: CreditCategory[];
  maxPerOrder?: number; // Max amount that can be used per transaction
  reasonCode: string;
}

export interface CreditLedgerEntry {
  id: number;
  creditId: number;
  action: CreditLedgerAction;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  appointmentId?: number;
  refundId?: number;
  timestamp: string;
  performedBy?: string; // Staff member or 'system'
  notes?: string;
}

export interface RefundTransaction {
  id: number;
  appointmentId: number;
  patientName: string;
  refundType: 'full' | 'partial';
  originalAmount: number;
  refundAmount: number;
  refundMethod: 'credit' | 'original_payment';
  reason: string;
  reasonCategory: 'cancellation' | 'no_show' | 'service_issue' | 'customer_request' | 'clinic_error' | 'other';
  status: 'pending' | 'processed' | 'cancelled';
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  creditId?: number; // If refunded as credit
  notes?: string;
}

export interface CustomerCreditBalance {
  patientName: string;
  totalCredits: number;
  availableCredits: number;
  expiredCredits: number;
  redeemedCredits: number;
  pendingExpiry: number; // Amount expiring soon (within 30 days)
}

export interface AcceptedScaledOffer {
  scaledOfferId: number;
  name: string;
  description: string;
  originalItemName: string;
  removedFeatures: string[];
  originalPrice: number;
  newPrice: number;
}

// Membership/Subscription System Types
export type BillingInterval = 'monthly' | 'quarterly' | 'annually' | 'every_4_weeks';
export type MembershipStatus = 'active' | 'past_due' | 'cancelled' | 'expired' | 'pending';
export type MembershipEventType = 'enrolled' | 'renewed' | 'payment_failed' | 'payment_retry' | 'cancelled' | 'fee_charged' | 'bonus_granted' | 'credits_granted' | 'credits_redeemed';
export type CarryoverRule = 'none' | 'one_period' | 'unlimited';

export interface MembershipPlan {
  id: number;
  name: string;
  description: string;
  price: number; // Per billing period
  billingInterval: BillingInterval;
  minimumTermMonths?: number; // Optional commitment period
  signupFee: number;
  cancellationFee: number;

  // Credits & Perks
  includedCredits: number; // Service credits per period
  creditCarryoverRule: CarryoverRule;
  signupBonus?: number; // One-time bonus credits on enrollment
  perks: string[]; // Array of perk descriptions

  // Discounts
  prepayDiscountPercentage?: number; // Discount for prepaying full term
  memberPriceDiscountPercentage?: number; // Discount on services/products

  // Admin
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  last4: string;
  isPrimary: boolean;
  expiryMonth?: number;
  expiryYear?: number;
}

export interface MemberSubscription {
  id: number;
  memberId: string; // Unique member identifier
  patientName: string;
  planId: number;
  planName: string;
  status: MembershipStatus;

  // Billing
  price: number; // Locked-in price at enrollment
  billingInterval: BillingInterval;
  nextRenewalDate: string;
  enrolledAt: string;
  cancelledAt?: string;
  expiresAt?: string; // For cancelled memberships

  // Term & Fees
  minimumTermMonths?: number;
  minimumTermEndDate?: string;
  signupFeePaid: number;
  signupFeeWaived: boolean;
  prepaidUntil?: string; // If prepaid

  // Credits
  currentPeriodCredits: number; // Remaining credits this period
  totalCreditsGranted: number; // Lifetime total
  totalCreditsRedeemed: number; // Lifetime redeemed
  carriedOverCredits: number; // Credits carried from previous period

  // Payment
  paymentMethods: PaymentMethod[];
  failedPaymentCount: number;
  lastPaymentDate?: string;
  lastPaymentStatus?: 'success' | 'failed' | 'pending';

  // Metadata
  notes?: string;
  tags?: string[];
}

export interface MembershipEvent {
  id: number;
  subscriptionId: number;
  memberId: string;
  patientName: string;
  eventType: MembershipEventType;

  // Event details
  timestamp: string;
  amount?: number;
  creditsChanged?: number;
  description: string;

  // Payment details
  paymentMethodId?: string;
  paymentStatus?: 'success' | 'failed' | 'pending';
  failureReason?: string;
  retryCount?: number;

  // Metadata
  performedBy?: string; // Staff member or 'system'
  notes?: string;
  metadata?: Record<string, any>;
}

export interface MembershipCreditBalance {
  memberId: string;
  patientName: string;
  planName: string;
  currentPeriodCredits: number;
  carriedOverCredits: number;
  totalAvailableCredits: number;
  nextRenewalDate: string;
  creditsWillExpire?: number; // Credits that will expire if not used
}
