# Referral Program Implementation Guide

## ✅ Completed Components

### 1. Type Definitions (types.ts:584-691)
- `ReferralProgramConfig` - Program configuration with double-sided incentives
- `CustomerReferralCode` - Individual customer referral codes
- `ReferralRelationship` - Tracks referrer-referee relationships
- `ReferralEvent` - Event log for referral activities
- `ReferralMetrics` - Analytics and reporting metrics
- `ReferralIncentiveType` - Supports: percentage_discount, fixed_discount, account_credit, free_product, free_service

### 2. Mock Data (constants.ts:993-1196)
- `mockReferralProgramConfig` - Active program with £10 off for referee, £15 credit for referrer
- `mockCustomerReferralCodes` - 4 sample customer codes (SARAH25, EMMA2025, OLIVIA10, CHAR2024)
- `mockReferralRelationships` - 4 sample relationships showing various states
- `mockReferralEvents` - Event history for tracking

### 3. Utility Functions (utils/referrals.ts)
- `generateReferralCode()` - Creates unique codes (e.g., "SARAH25")
- `generateReferralLink()` - Builds shareable URLs
- `generateShareMessage()` - Creates WhatsApp/FB share text
- `validateReferralCode()` - Validates codes and checks expiry/limits
- `performFraudChecks()` - Prevents self-referral, duplicate use, rapid-fire abuse
- `calculateRefereeIncentive()` - Computes discount based on program config
- `calculateReferralMetrics()` - Generates analytics dashboard data
- `createReferralEvent()` - Creates event log entries
- `formatIncentiveDescription()` - Formats incentives for display

### 4. Storage Functions (utils/storage.ts:406-485)
- `saveReferralProgramConfig()` / `loadReferralProgramConfig()`
- `saveCustomerReferralCodes()` / `loadCustomerReferralCodes()`
- `saveReferralRelationships()` / `loadReferralRelationships()`
- `saveReferralEvents()` / `loadReferralEvents()`

---

## 🔧 Integration Steps

### Step 1: Update App.tsx Imports

Add to App.tsx imports section:
```typescript
import {
  // ... existing imports
  ReferralProgramConfig,
  CustomerReferralCode,
  ReferralRelationship,
  ReferralEvent,
  ReferralMetrics,
} from './types';

import {
  // ... existing imports from constants
  mockReferralProgramConfig,
  mockCustomerReferralCodes,
  mockReferralRelationships,
  mockReferralEvents,
} from './constants';

import {
  // ... existing imports from storage
  saveReferralProgramConfig,
  loadReferralProgramConfig,
  saveCustomerReferralCodes,
  loadCustomerReferralCodes,
  saveReferralRelationships,
  loadReferralRelationships,
  saveReferralEvents,
  loadReferralEvents,
} from './utils/storage';

import {
  generateReferralCode,
  validateReferralCode,
  performFraudChecks,
  calculateRefereeIncentive,
  calculateReferralMetrics,
  createReferralEvent,
} from './utils/referrals';
```

### Step 2: Add Referral State to App Component

Add state hooks after existing state declarations (around line 136):
```typescript
const [referralProgramConfig, setReferralProgramConfig] = useState<ReferralProgramConfig | null>(null);
const [customerReferralCodes, setCustomerReferralCodes] = useState<CustomerReferralCode[]>([]);
const [referralRelationships, setReferralRelationships] = useState<ReferralRelationship[]>([]);
const [referralEvents, setReferralEvents] = useState<ReferralEvent[]>([]);
```

### Step 3: Load/Save Referral Data

Add to initial data loading useEffect (around line 199):
```typescript
const loadedReferralConfig = loadReferralProgramConfig(mockReferralProgramConfig);
setReferralProgramConfig(loadedReferralConfig);

const loadedCustomerCodes = loadCustomerReferralCodes(mockCustomerReferralCodes);
setCustomerReferralCodes(loadedCustomerCodes);

const loadedReferralRelationships = loadReferralRelationships(mockReferralRelationships);
setReferralRelationships(loadedReferralRelationships);

const loadedReferralEvents = loadReferralEvents(mockReferralEvents);
setReferralEvents(loadedReferralEvents);
```

Add auto-save useEffects (around line 275):
```typescript
useEffect(() => {
  if (referralProgramConfig) {
    saveReferralProgramConfig(referralProgramConfig);
  }
}, [referralProgramConfig]);

useEffect(() => {
  saveCustomerReferralCodes(customerReferralCodes);
}, [customerReferralCodes]);

useEffect(() => {
  saveReferralRelationships(referralRelationships);
}, [referralRelationships]);

useEffect(() => {
  saveReferralEvents(referralEvents);
}, [referralEvents]);
```

### Step 4: Add View Type

Update View type definition (around line 104):
```typescript
type View = 'dashboard' | 'recalls' | 'communications' | 'analytics' | 'media-studio' | 'settings' | 'products' | 'bundles-promotions' | 'memberships' | 'referrals' | 'credit-management';
```

### Step 5: Add Referral Handler Functions

Add before renderView() function (around line 700):
```typescript
// Referral handler functions
const handleUpdateReferralConfig = (config: ReferralProgramConfig) => {
  setReferralProgramConfig(config);
  setNotification({ message: 'Referral program updated successfully!', type: 'success' });
};

const handleGenerateReferralCode = (customerName: string, customerEmail?: string, customerPhone?: string) => {
  const code = generateReferralCode(customerName);
  const newReferralCode: CustomerReferralCode = {
    id: Date.now(),
    customerName,
    customerEmail,
    customerPhone,
    referralCode: code,
    createdAt: new Date().toISOString(),
    expiresAt: referralProgramConfig?.expiryDays
      ? new Date(Date.now() + referralProgramConfig.expiryDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined,
    active: true,
    totalReferrals: 0,
    totalRewardsEarned: 0,
  };

  setCustomerReferralCodes(prev => [...prev, newReferralCode]);
  setNotification({ message: `Referral code ${code} created!`, type: 'success' });
  return newReferralCode;
};

const handleApplyReferralCode = (
  code: string,
  refereeName: string,
  refereeEmail?: string,
  refereePhone?: string
): { success: boolean; discount: number; message: string } => {
  if (!referralProgramConfig?.enabled) {
    return { success: false, discount: 0, message: 'Referral program is not active' };
  }

  const validation = validateReferralCode(code, customerReferralCodes, referralProgramConfig);
  if (!validation.valid || !validation.referralCode) {
    return { success: false, discount: 0, message: validation.error || 'Invalid code' };
  }

  // Fraud checks
  const fraudCheck = performFraudChecks(
    validation.referralCode,
    refereeName,
    refereeEmail,
    refereePhone,
    referralProgramConfig,
    referralRelationships
  );

  if (!fraudCheck.passed) {
    return { success: false, discount: 0, message: fraudCheck.notes || 'Fraud check failed' };
  }

  return { success: true, discount: 0, message: 'Referral code applied successfully!' };
};

const handleCompleteReferral = (
  relationshipId: number,
  appointmentId: number,
  purchaseAmount: number
) => {
  const relationship = referralRelationships.find(r => r.id === relationshipId);
  if (!relationship || !referralProgramConfig) return;

  // Update relationship
  setReferralRelationships(prev => prev.map(r =>
    r.id === relationshipId
      ? {
          ...r,
          status: 'completed',
          appointmentId,
          purchaseAmount,
          completedAt: new Date().toISOString(),
        }
      : r
  ));

  // Create events
  const purchaseEvent = createReferralEvent(relationshipId, 'purchase_completed', {
    appointmentId,
    amount: purchaseAmount,
  });
  setReferralEvents(prev => [...prev, purchaseEvent]);

  // Issue referrer reward if configured to do so
  if (referralProgramConfig.requireCompletedPurchase) {
    handleIssueReferrerReward(relationshipId);
  }
};

const handleIssueReferrerReward = (relationshipId: number) => {
  const relationship = referralRelationships.find(r => r.id === relationshipId);
  if (!relationship || !referralProgramConfig) return;

  const referrerCode = customerReferralCodes.find(c => c.referralCode === relationship.referrerCode);
  if (!referrerCode) return;

  // Issue reward based on type
  if (referralProgramConfig.referrerRewardType === 'account_credit') {
    // Create account credit
    const creditId = Date.now();
    const { issueCredit, createLedgerEntry } = require('./utils/credits');
    const credit = issueCredit(
      referrerCode.customerName,
      referralProgramConfig.referrerRewardValue,
      'referral',
      'REFERRAL_REWARD',
      `Referral reward for ${relationship.refereeName}`,
      { createdBy: 'system' }
    );
    const ledgerEntry = createLedgerEntry(
      credit.id,
      'issued',
      credit.amount,
      0,
      credit.amount,
      { performedBy: 'system', notes: 'Referral program reward' }
    );

    handleIssueCredit(credit, ledgerEntry);

    // Update relationship
    setReferralRelationships(prev => prev.map(r =>
      r.id === relationshipId
        ? {
            ...r,
            status: 'rewarded',
            referrerRewardIssued: {
              type: referralProgramConfig.referrerRewardType,
              value: referralProgramConfig.referrerRewardValue,
              creditId: credit.id,
            },
            rewardedAt: new Date().toISOString(),
          }
        : r
    ));

    // Update referrer code stats
    setCustomerReferralCodes(prev => prev.map(c =>
      c.referralCode === relationship.referrerCode
        ? {
            ...c,
            totalReferrals: c.totalReferrals + 1,
            totalRewardsEarned: c.totalRewardsEarned + referralProgramConfig.referrerRewardValue,
          }
        : c
    ));

    // Create event
    const rewardEvent = createReferralEvent(relationshipId, 'referrer_rewarded', {
      creditId: credit.id,
      amount: referralProgramConfig.referrerRewardValue,
    });
    setReferralEvents(prev => [...prev, rewardEvent]);

    setNotification({
      message: `Referral reward of £${referralProgramConfig.referrerRewardValue} issued to ${referrerCode.customerName}`,
      type: 'success',
    });
  }
};
```

### Step 6: Update BookingModal

In BookingModal props (around line 1002), add:
```typescript
referralProgramConfig={referralProgramConfig}
customerReferralCodes={customerReferralCodes}
onApplyReferralCode={handleApplyReferralCode}
```

Inside BookingModal component, add referral code input:
```typescript
const [referralCode, setReferralCode] = useState('');
const [appliedReferralCode, setAppliedReferralCode] = useState<string | null>(null);
const [referralDiscount, setReferralDiscount] = useState(0);

const handleApplyCode = () => {
  const result = onApplyReferralCode(referralCode, patientName);
  if (result.success) {
    setAppliedReferralCode(referralCode);
    const incentive = calculateRefereeIncentive(cartTotal, referralProgramConfig);
    setReferralDiscount(incentive.discount);
    setNotification({ message: result.message, type: 'success' });
  } else {
    setNotification({ message: result.message, type: 'error' });
  }
};
```

### Step 7: Add Sidebar Navigation Item

In Sidebar component navItems array (around line 1059):
```typescript
{ id: 'referrals', label: 'Referrals', icon: <GiftIcon /> },
```

### Step 8: Create Minimal ReferralsView Component

Create `components/ReferralsView.tsx` with admin panel showing:
- Program configuration toggle
- Referral code generation
- Relationship list with metrics
- Top referrers dashboard

---

## 📊 Key Features Implemented

✅ **Referral Identity**
- Unique code generation per customer
- Shareable links with tracking
- WhatsApp/FB share integration ready

✅ **Double-Sided Rewards**
- Configurable referee incentives (discount, credit, free items)
- Configurable referrer rewards
- Minimum purchase requirements

✅ **Fraud Prevention**
- Self-referral detection (name, email, phone)
- Duplicate referee prevention
- Rapid-fire referral blocking
- Unique email/phone enforcement

✅ **Tracking & Attribution**
- Full event logging
- Relationship status tracking
- Reward issuance tracking
- Analytics metrics calculation

✅ **Admin Controls**
- Program enable/disable
- Configurable incentive types and amounts
- Usage limits per referee/referrer
- Expiry date management

---

## 🧪 Testing Checklist

- [ ] Generate referral code for existing customer
- [ ] Apply code during booking (new customer)
- [ ] Verify referee gets discount
- [ ] Complete purchase and verify referrer reward
- [ ] Test self-referral prevention
- [ ] Test duplicate referee prevention
- [ ] Test code expiry
- [ ] View referral metrics
- [ ] Share code via generated link
- [ ] Test with minimum purchase requirement

---

## 📈 Metrics Available

The `calculateReferralMetrics()` function provides:
- Total referrals count
- Completed vs pending
- Conversion rate %
- Total revenue from referred customers
- Total cost of rewards
- ROI calculation
- Average order value
- Top 10 referrers list

---

## 🔗 Integration Points

1. **BookingModal** - Apply referral codes during checkout
2. **Appointment Completion** - Trigger reward issuance
3. **Credit System** - Issue referrer rewards as account credits
4. **Communications** - Send referral links to customers
5. **Analytics** - Show referral performance metrics

---

## Next Steps

1. Create ReferralsView component with UI for all features
2. Add referral code input to BookingModal
3. Update handleBookAppointment to track relationships
4. Add share buttons for WhatsApp/Facebook
5. Create customer-facing referral dashboard
6. Add referral code to email/SMS confirmations
