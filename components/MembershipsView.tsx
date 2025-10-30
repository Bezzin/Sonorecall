import React, { useEffect, useMemo, useState } from "react";
import {
  MembershipPlan,
  MemberSubscription,
  MembershipEvent,
  MembershipCreditBalance,
  MembershipStatus,
  MembershipEventType,
  PaymentMethod,
  CarryoverRule,
  BillingInterval,
} from "../types";
import {
  BILLING_INTERVAL_LABELS,
  calculatePrepayTotal,
  calculatePrepaidUntil,
  calculateNextRenewalDate,
  getIntervalsPerYear,
} from "../utils/memberships";
import {
  MembershipPlanInput,
  MembershipEnrollmentPayload,
  MembershipPaymentAttemptOptions,
  MembershipCancellationPayload,
} from "../types";

const formatCurrency = (value: number): string => `A£${value.toFixed(2)}`;

const carryoverLabels: Record<CarryoverRule, string> = {
  none: "Expires each period",
  one_period: "Carry into next period",
  unlimited: "Unlimited carryover",
};

const membershipStatusClasses: Record<MembershipStatus, string> = {
  active: "bg-green-100 text-green-700",
  past_due: "bg-red-100 text-red-700",
  cancelled: "bg-gray-200 text-gray-600",
  expired: "bg-gray-200 text-gray-600",
  pending: "bg-yellow-100 text-yellow-700",
};

const membershipStatusText: Record<MembershipStatus, string> = {
  active: "Active",
  past_due: "Past Due",
  cancelled: "Cancelled",
  expired: "Expired",
  pending: "Pending",
};

const formatMembershipDate = (iso?: string): string =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

interface StatCard {
  label: string;
  value: string;
  helper?: string;
  className?: string;
}

type PlanFormState = {
  name: string;
  description: string;
  price: string;
  billingInterval: BillingInterval;
  minimumTermMonths: string;
  signupFee: string;
  cancellationFee: string;
  includedCredits: string;
  creditCarryoverRule: CarryoverRule;
  signupBonus: string;
  perks: string;
  prepayDiscountPercentage: string;
  memberPriceDiscountPercentage: string;
  active: boolean;
};

type EnrollmentFormState = {
  patientName: string;
  planId: number | null;
  memberId: string;
  commitToMinimumTerm: boolean;
  prepayPeriods: string;
  primaryMethodType: PaymentMethod["type"];
  primaryLast4: string;
  primaryExpiryMonth: string;
  primaryExpiryYear: string;
  addBackupMethod: boolean;
  backupMethodType: PaymentMethod["type"];
  backupLast4: string;
  backupExpiryMonth: string;
  backupExpiryYear: string;
  notes: string;
  tags: string;
};

interface MembershipsViewProps {
  membershipPlans: MembershipPlan[];
  memberSubscriptions: MemberSubscription[];
  membershipEvents: MembershipEvent[];
  creditBalances: MembershipCreditBalance[];
  onSavePlan: (planInput: MembershipPlanInput) => void;
  onTogglePlanStatus: (planId: number) => void;
  onEnrollMember: (payload: MembershipEnrollmentPayload) => void;
  onProcessPaymentAttempt: (options: MembershipPaymentAttemptOptions) => void;
  onCancelMembership: (payload: MembershipCancellationPayload) => void;
}
const MembershipsView: React.FC<MembershipsViewProps> = ({
  membershipPlans,
  memberSubscriptions,
  membershipEvents,
  creditBalances,
  onSavePlan,
  onTogglePlanStatus,
  onEnrollMember,
  onProcessPaymentAttempt,
  onCancelMembership,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'plans' | 'members' | 'ledger'>('catalog');
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planFormState, setPlanFormState] = useState<PlanFormState>({
    name: '',
    description: '',
    price: '',
    billingInterval: 'monthly',
    minimumTermMonths: '',
    signupFee: '',
    cancellationFee: '',
    includedCredits: '',
    creditCarryoverRule: 'none',
    signupBonus: '',
    perks: '',
    prepayDiscountPercentage: '',
    memberPriceDiscountPercentage: '',
    active: true,
  });
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [enrollmentFormState, setEnrollmentFormState] = useState<EnrollmentFormState>(() => {
    const firstPlan = membershipPlans[0];
    return {
      patientName: '',
      planId: firstPlan ? firstPlan.id : null,
      memberId: '',
      commitToMinimumTerm: firstPlan ? !!firstPlan.minimumTermMonths : false,
      prepayPeriods: '1',
      primaryMethodType: 'card',
      primaryLast4: '',
      primaryExpiryMonth: '',
      primaryExpiryYear: '',
      addBackupMethod: false,
      backupMethodType: 'card',
      backupLast4: '',
      backupExpiryMonth: '',
      backupExpiryYear: '',
      notes: '',
      tags: '',
    };
  });
  const [expandedMemberId, setExpandedMemberId] = useState<number | null>(null);
  const [cancellationFormVisibleFor, setCancellationFormVisibleFor] = useState<number | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [waiveCancellationFee, setWaiveCancellationFee] = useState(false);
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | MembershipEventType>('all');
  const [planFilter, setPlanFilter] = useState<'all' | number>('all');

  useEffect(() => {
    if (enrollmentFormState.planId === null && membershipPlans.length > 0) {
      setEnrollmentFormState(prev => ({
        ...prev,
        planId: membershipPlans[0].id,
        commitToMinimumTerm: !!membershipPlans[0].minimumTermMonths,
      }));
    }
  }, [membershipPlans]);

  const planMap = useMemo(() => {
    const map = new Map<number, MembershipPlan>();
    membershipPlans.forEach(plan => map.set(plan.id, plan));
    return map;
  }, [membershipPlans]);

  const selectedEnrollmentPlan = enrollmentFormState.planId
    ? planMap.get(enrollmentFormState.planId)
    : undefined;

  const activePlans = useMemo(() => membershipPlans.filter(plan => plan.active), [membershipPlans]);

  const totalMembers = memberSubscriptions.length;
  const activeMembers = memberSubscriptions.filter(sub => sub.status === 'active').length;
  const pastDueMembers = memberSubscriptions.filter(sub => sub.status === 'past_due').length;

  const upcomingRenewals = useMemo(() => {
    const now = new Date();
    const inSevenDays = new Date();
    inSevenDays.setDate(now.getDate() + 7);
    return memberSubscriptions.filter(sub => {
      if (sub.status === 'cancelled' || sub.status === 'expired') return false;
      const nextDate = new Date(sub.nextRenewalDate);
      return nextDate >= now && nextDate <= inSevenDays;
    }).length;
  }, [memberSubscriptions]);

  const continuityMRR = useMemo(() => {
    return memberSubscriptions.reduce((sum, sub) => {
      if (sub.status !== 'active') return sum;
      const annualised = sub.price * getIntervalsPerYear(sub.billingInterval);
      return sum + annualised / 12;
    }, 0);
  }, [memberSubscriptions]);

  const eventsForExpandedMember = useMemo(() => {
    if (expandedMemberId === null) return [];
    return membershipEvents.filter(event => event.subscriptionId === expandedMemberId);
  }, [membershipEvents, expandedMemberId]);

  const filteredLedgerEvents = useMemo(() => {
    return membershipEvents.filter(event => {
      if (eventTypeFilter !== 'all' && event.eventType !== eventTypeFilter) return false;
      if (planFilter !== 'all') {
        const subscription = memberSubscriptions.find(sub => sub.id === event.subscriptionId);
        if (!subscription || subscription.planId !== planFilter) return false;
      }
      return true;
    });
  }, [membershipEvents, eventTypeFilter, planFilter, memberSubscriptions]);

  const handlePlanFormChange = (field: keyof PlanFormState, value: string | boolean) => {
    setPlanFormState(prev => ({
      ...prev,
      [field]: value,
    }) as PlanFormState);
  };

  const resetPlanForm = () => {
    setPlanFormState({
      name: '',
      description: '',
      price: '',
      billingInterval: 'monthly',
      minimumTermMonths: '',
      signupFee: '',
      cancellationFee: '',
      includedCredits: '',
      creditCarryoverRule: 'none',
      signupBonus: '',
      perks: '',
      prepayDiscountPercentage: '',
      memberPriceDiscountPercentage: '',
      active: true,
    });
    setEditingPlanId(null);
    setShowPlanForm(false);
  };

  const handlePlanFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!planFormState.name.trim()) return;

    const planInput: MembershipPlanInput = {
      id: editingPlanId ?? undefined,
      name: planFormState.name.trim(),
      description: planFormState.description.trim(),
      price: parseFloat(planFormState.price || '0') || 0,
      billingInterval: planFormState.billingInterval,
      minimumTermMonths: planFormState.minimumTermMonths
        ? parseInt(planFormState.minimumTermMonths, 10)
        : undefined,
      signupFee: parseFloat(planFormState.signupFee || '0') || 0,
      cancellationFee: parseFloat(planFormState.cancellationFee || '0') || 0,
      includedCredits: parseInt(planFormState.includedCredits || '0', 10) || 0,
      creditCarryoverRule: planFormState.creditCarryoverRule,
      signupBonus: planFormState.signupBonus ? parseInt(planFormState.signupBonus, 10) || 0 : 0,
      perks: planFormState.perks
        .split("\n")
        .map(perk => perk.trim())
        .filter(Boolean),
      prepayDiscountPercentage: planFormState.prepayDiscountPercentage
        ? parseFloat(planFormState.prepayDiscountPercentage)
        : undefined,
      memberPriceDiscountPercentage: planFormState.memberPriceDiscountPercentage
        ? parseFloat(planFormState.memberPriceDiscountPercentage)
        : undefined,
      active: planFormState.active,
    };

    onSavePlan(planInput);
    resetPlanForm();
  };

  const startEditingPlan = (plan: MembershipPlan) => {
    setPlanFormState({
      name: plan.name,
      description: plan.description,
      price: plan.price.toString(),
      billingInterval: plan.billingInterval,
      minimumTermMonths: plan.minimumTermMonths ? plan.minimumTermMonths.toString() : '',
      signupFee: plan.signupFee.toString(),
      cancellationFee: plan.cancellationFee.toString(),
      includedCredits: plan.includedCredits.toString(),
      creditCarryoverRule: plan.creditCarryoverRule,
      signupBonus: plan.signupBonus ? plan.signupBonus.toString() : '',
      perks: plan.perks.join("\n"),
      prepayDiscountPercentage: plan.prepayDiscountPercentage
        ? plan.prepayDiscountPercentage.toString()
        : '',
      memberPriceDiscountPercentage: plan.memberPriceDiscountPercentage
        ? plan.memberPriceDiscountPercentage.toString()
        : '',
      active: plan.active,
    });
    setEditingPlanId(plan.id);
    setShowPlanForm(true);
  };

  const handleEnrollmentChange = (field: keyof EnrollmentFormState, value: string | boolean) => {
    setEnrollmentFormState(prev => {
      if (field === 'planId') {
        const planId = Number(value);
        const plan = planMap.get(planId) ?? null;
        return {
          ...prev,
          planId: plan ? plan.id : null,
          commitToMinimumTerm: plan ? !!plan.minimumTermMonths : false,
        };
      }

      if (field === 'commitToMinimumTerm' || field === 'addBackupMethod') {
        return {
          ...prev,
          [field]: Boolean(value),
        } as EnrollmentFormState;
      }

      return {
        ...prev,
        [field]: value,
      } as EnrollmentFormState;
    });
  };

  const resetEnrollmentForm = (fallbackPlan?: MembershipPlan) => {
    const plan = fallbackPlan ?? (membershipPlans.length > 0 ? membershipPlans[0] : undefined);
    setEnrollmentFormState({
      patientName: '',
      planId: plan ? plan.id : null,
      memberId: '',
      commitToMinimumTerm: plan ? !!plan.minimumTermMonths : false,
      prepayPeriods: '1',
      primaryMethodType: 'card',
      primaryLast4: '',
      primaryExpiryMonth: '',
      primaryExpiryYear: '',
      addBackupMethod: false,
      backupMethodType: 'card',
      backupLast4: '',
      backupExpiryMonth: '',
      backupExpiryYear: '',
      notes: '',
      tags: '',
    });
  };

  const handleEnrollmentSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!enrollmentFormState.patientName.trim()) return;
    if (!selectedEnrollmentPlan) return;

    const prepayPeriods = Math.max(1, parseInt(enrollmentFormState.prepayPeriods || '1', 10) || 1);

    const primaryMethod: PaymentMethod = {
      id: `${enrollmentFormState.primaryMethodType}_${enrollmentFormState.primaryLast4 || '0000'}_${Date.now()}`,
      type: enrollmentFormState.primaryMethodType,
      last4: enrollmentFormState.primaryLast4 || '0000',
      isPrimary: true,
      expiryMonth:
        enrollmentFormState.primaryMethodType === 'card'
          ? parseInt(enrollmentFormState.primaryExpiryMonth || '0', 10) || undefined
          : undefined,
      expiryYear:
        enrollmentFormState.primaryMethodType === 'card'
          ? parseInt(enrollmentFormState.primaryExpiryYear || '0', 10) || undefined
          : undefined,
    };

    const secondaryMethod: PaymentMethod | undefined = enrollmentFormState.addBackupMethod
      ? {
          id: `${enrollmentFormState.backupMethodType}_${enrollmentFormState.backupLast4 || '0000'}_${Date.now() + 1}`,
          type: enrollmentFormState.backupMethodType,
          last4: enrollmentFormState.backupLast4 || '0000',
          isPrimary: false,
          expiryMonth:
            enrollmentFormState.backupMethodType === 'card'
              ? parseInt(enrollmentFormState.backupExpiryMonth || '0', 10) || undefined
              : undefined,
          expiryYear:
            enrollmentFormState.backupMethodType === 'card'
              ? parseInt(enrollmentFormState.backupExpiryYear || '0', 10) || undefined
              : undefined,
        }
      : undefined;

    onEnrollMember({
      patientName: enrollmentFormState.patientName.trim(),
      planId: selectedEnrollmentPlan.id,
      memberId: enrollmentFormState.memberId.trim() || undefined,
      primaryPaymentMethod: primaryMethod,
      secondaryPaymentMethod: secondaryMethod,
      commitToMinimumTerm: enrollmentFormState.commitToMinimumTerm,
      prepayPeriods,
      notes: enrollmentFormState.notes.trim() || undefined,
      tags: enrollmentFormState.tags
        ? enrollmentFormState.tags
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean)
        : undefined,
      performedBy: 'admin.portal',
    });

    resetEnrollmentForm(selectedEnrollmentPlan);
    setShowEnrollmentForm(false);
  };

  const triggerPaymentAttempt = (
    subscription: MemberSubscription,
    outcome: 'success' | 'failed',
    options?: { retry?: boolean; paymentMethodId?: string; notes?: string }
  ) => {
    onProcessPaymentAttempt({
      subscriptionId: subscription.id,
      outcome,
      retry: options?.retry,
      paymentMethodId: options?.paymentMethodId,
      notes: options?.notes,
      performedBy: 'admin.portal',
    });
  };

  const primaryPaymentMethod = (subscription: MemberSubscription): PaymentMethod | undefined =>
    subscription.paymentMethods.find(method => method.isPrimary) ?? subscription.paymentMethods[0];

  const backupPaymentMethod = (subscription: MemberSubscription): PaymentMethod | undefined =>
    subscription.paymentMethods.find(method => !method.isPrimary);

  const membershipTabs: Array<{ id: 'catalog' | 'plans' | 'members' | 'ledger'; label: string; helper: string }> = [
    { id: 'catalog', label: 'Catalog & Member Portal', helper: 'Customer-facing plans and current member balances.' },
    { id: 'plans', label: 'Plan Management', helper: 'Create, edit, and activate membership plans.' },
    { id: 'members', label: 'Members', helper: 'Manage subscriptions, billing, and cancellations.' },
    { id: 'ledger', label: 'Membership Ledger', helper: 'Audit trail of enrollments, renewals, and credits.' },
  ];

  const formatEventType = (type: MembershipEventType) =>
    type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const prepayPeriodsValue = Math.max(1, parseInt(enrollmentFormState.prepayPeriods || '1', 10) || 1);
  const prepayDiscountEligible =
    selectedEnrollmentPlan?.prepayDiscountPercentage && prepayPeriodsValue > 1
      ? selectedEnrollmentPlan.prepayDiscountPercentage
      : undefined;
  const prepaySummary = selectedEnrollmentPlan
    ? calculatePrepayTotal(selectedEnrollmentPlan.price, prepayPeriodsValue, prepayDiscountEligible)
    : null;
  const signupFeeWaived =
    selectedEnrollmentPlan && selectedEnrollmentPlan.minimumTermMonths
      ? enrollmentFormState.commitToMinimumTerm
      : false;
  const signupFeePreview = selectedEnrollmentPlan
    ? signupFeeWaived
      ? 0
      : selectedEnrollmentPlan.signupFee
    : 0;
  const prepaidThrough =
    selectedEnrollmentPlan && prepayPeriodsValue > 1
      ? calculatePrepaidUntil(new Date().toISOString(), selectedEnrollmentPlan.billingInterval, prepayPeriodsValue)
      : undefined;
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Membership & Continuity</h2>
            <p className="text-sm text-gray-500">
              Configure plans, monitor billing health, and surface member perks to keep patients returning.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              { label: 'Active Members', value: activeMembers.toString(), className: 'bg-blue-50 text-blue-800' },
              { label: 'Past Due', value: pastDueMembers.toString(), className: 'bg-red-50 text-red-800' },
              { label: 'MRR (equiv)', value: formatCurrency(continuityMRR), className: 'bg-emerald-50 text-emerald-800' },
              { label: 'Renewals (7 days)', value: upcomingRenewals.toString(), className: 'bg-yellow-50 text-yellow-800' },
            ].map(stat => (
              <div key={stat.label} className={`${stat.className} rounded-lg p-3`}>
                <p className="text-xs uppercase tracking-wide">{stat.label}</p>
                <p className="text-lg font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-b border-gray-200 pb-3">
          {membershipTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500">
          {membershipTabs.find(tab => tab.id === activeTab)?.helper}
        </p>
      </div>

      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Active membership catalog</h3>
              <p className="text-sm text-gray-500">
                Showcased to patients with clear pricing, terms, and bonuses.
              </p>
            </div>
            {activePlans.length === 0 ? (
              <div className="text-sm text-gray-500">
                No active membership plans. Activate or create a plan to populate the catalog.
              </div>
            ) : (
              <div className="space-y-4">
                {activePlans.map(plan => (
                  <div
                    key={plan.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex flex-wrap items-baseline gap-3">
                      <h4 className="text-lg font-semibold text-gray-800">{plan.name}</h4>
                      <span className="text-sm font-semibold text-blue-600">
                        {formatCurrency(plan.price)} {BILLING_INTERVAL_LABELS[plan.billingInterval]}
                      </span>
                      {plan.billingInterval === 'every_4_weeks' && (
                        <span className="text-xs uppercase tracking-wide text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                          13 renewals / year
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        Includes {plan.includedCredits} credit{plan.includedCredits === 1 ? '' : 's'} per period
                      </div>
                      <div>{carryoverLabels[plan.creditCarryoverRule]}</div>
                      <div>
                        {plan.minimumTermMonths
                          ? `${plan.minimumTermMonths}-month commitment unlocks waived signup fee`
                          : 'No minimum commitment'}
                      </div>
                      <div>
                        {plan.signupBonus
                          ? `Signup bonus: ${plan.signupBonus} extra credit${plan.signupBonus === 1 ? '' : 's'}`
                          : 'Signup bonus available'}
                      </div>
                    </div>
                    {plan.perks.length > 0 && (
                      <ul className="mt-3 list-disc list-inside text-sm text-gray-600 space-y-1">
                        {plan.perks.map((perk, idx) => (
                          <li key={idx}>{perk}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Member portal snapshot</h3>
              <p className="text-sm text-gray-500">
                Credits remaining, renewal dates, and carryover rules for each member.
              </p>
            </div>
            {creditBalances.length === 0 ? (
              <p className="text-sm text-gray-500">No active memberships with credits yet.</p>
            ) : (
              <div className="space-y-4">
                {creditBalances.map(balance => (
                  <div key={balance.subscriptionId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{balance.patientName}</p>
                        <p className="text-xs text-gray-500">{balance.planName}</p>
                      </div>
                      <span className="text-sm font-semibold text-blue-600">
                        {balance.totalAvailableCredits} credits
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <p>Current period: {balance.currentPeriodCredits}</p>
                      <p>Carryover: {balance.carriedOverCredits}</p>
                      <p>Next renewal: {formatMembershipDate(balance.nextRenewalDate)}</p>
                      <p>
                        {balance.creditsWillExpire
                          ? `${balance.creditsWillExpire} credits set to expire`
                          : 'No credits expiring'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {editingPlanId ? 'Edit membership plan' : 'Create membership plan'}
                </h3>
                <p className="text-sm text-gray-500">
                  Capture pricing, billing interval (including every 4 weeks), credits, and bonuses.
                </p>
              </div>
              <button
                onClick={() => {
                  if (showPlanForm) {
                    resetPlanForm();
                  } else {
                    setShowPlanForm(true);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                {showPlanForm ? 'Close form' : 'New plan'}
              </button>
            </div>
            {showPlanForm && (
              <form onSubmit={handlePlanFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan name</label>
                  <input
                    type="text"
                    value={planFormState.name}
                    onChange={e => handlePlanFormChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Pregnancy Journey VIP"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing interval</label>
                  <select
                    value={planFormState.billingInterval}
                    onChange={e => handlePlanFormChange('billingInterval', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="every_4_weeks">Every 4 Weeks (13x)</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price per interval</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={planFormState.price}
                    onChange={e => handlePlanFormChange('price', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="129"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Included credits per period</label>
                  <input
                    type="number"
                    min="0"
                    value={planFormState.includedCredits}
                    onChange={e => handlePlanFormChange('includedCredits', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Signup bonus credits</label>
                  <input
                    type="number"
                    min="0"
                    value={planFormState.signupBonus}
                    onChange={e => handlePlanFormChange('signupBonus', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Carryover rule</label>
                  <select
                    value={planFormState.creditCarryoverRule}
                    onChange={e => handlePlanFormChange('creditCarryoverRule', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">Expires each period</option>
                    <option value="one_period">Carry into next period</option>
                    <option value="unlimited">Unlimited carryover</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum term (months)</label>
                  <input
                    type="number"
                    min="0"
                    value={planFormState.minimumTermMonths}
                    onChange={e => handlePlanFormChange('minimumTermMonths', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="6"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Signup fee</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={planFormState.signupFee}
                    onChange={e => handlePlanFormChange('signupFee', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="49"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation fee</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={planFormState.cancellationFee}
                    onChange={e => handlePlanFormChange('cancellationFee', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="79"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prepay discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={planFormState.prepayDiscountPercentage}
                    onChange={e => handlePlanFormChange('prepayDiscountPercentage', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="8"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Member price discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={planFormState.memberPriceDiscountPercentage}
                    onChange={e => handlePlanFormChange('memberPriceDiscountPercentage', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="10"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan description</label>
                  <textarea
                    value={planFormState.description}
                    onChange={e => handlePlanFormChange('description', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Monthly continuity plan with HD keepsakes and priority booking."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Perks (one per line)</label>
                  <textarea
                    value={planFormState.perks}
                    onChange={e => handlePlanFormChange('perks', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Priority scheduling window\nComplimentary HD keepsake video"
                  />
                </div>
                <label className="flex items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={planFormState.active}
                    onChange={e => handlePlanFormChange('active', e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  Plan active and visible for enrollment
                </label>
                <div className="md:col-span-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetPlanForm}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                  >
                    {editingPlanId ? 'Update plan' : 'Create plan'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {membershipPlans.map(plan => (
              <div key={plan.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{plan.name}</h3>
                    <p className="text-sm text-gray-500">{plan.description}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      plan.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {plan.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline gap-3 text-gray-800">
                  <span className="text-2xl font-bold">{formatCurrency(plan.price)}</span>
                  <span className="text-sm uppercase tracking-wide text-gray-500">
                    {BILLING_INTERVAL_LABELS[plan.billingInterval]}
                    {plan.billingInterval === 'every_4_weeks' && ' • 13 renewals/yr'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                  <div>
                    <p className="font-semibold text-gray-700">Credits</p>
                    <p>{plan.includedCredits} пер period</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Carryover</p>
                    <p>{carryoverLabels[plan.creditCarryoverRule]}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Signup Fee</p>
                    <p>{plan.signupFee > 0 ? formatCurrency(plan.signupFee) : 'Waived'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Cancellation Fee</p>
                    <p>{plan.cancellationFee > 0 ? formatCurrency(plan.cancellationFee) : 'None'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Minimum Term</p>
                    <p>{plan.minimumTermMonths ? `${plan.minimumTermMonths} months` : 'No commitment'}</p>
                  </div>
                  {plan.signupBonus ? (
                    <div>
                      <p className="font-semibold text-gray-700">Signup Bonus</p>
                      <p>
                        {plan.signupBonus} extra credit{plan.signupBonus === 1 ? '' : 's'}
                      </p>
                    </div>
                  ) : null}
                  {plan.prepayDiscountPercentage ? (
                    <div>
                      <p className="font-semibold text-gray-700">Prepay Discount</p>
                      <p>{plan.prepayDiscountPercentage}% when prepaying</p>
                    </div>
                  ) : null}
                  {plan.memberPriceDiscountPercentage ? (
                    <div>
                      <p className="font-semibold text-gray-700">Member Pricing</p>
                      <p>{plan.memberPriceDiscountPercentage}% off add-ons</p>
                    </div>
                  ) : null}
                </div>

                {plan.perks.length > 0 && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 space-y-2">
                    <p className="font-semibold text-blue-900">Perks</p>
                    <ul className="list-disc list-inside space-y-1">
                      {plan.perks.map((perk, idx) => (
                        <li key={idx}>{perk}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => startEditingPlan(plan)}
                    className="px-4 py-2 bg-white border border-blue-500 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onTogglePlanStatus(plan.id)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      plan.active
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {plan.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Member enrollment</h3>
                <p className="text-sm text-gray-500">
                  Start new memberships with signup bonuses and prepay discounts.
                </p>
              </div>
              <button
                onClick={() => {
                  if (showEnrollmentForm) {
                    resetEnrollmentForm();
                    setShowEnrollmentForm(false);
                  } else {
                    resetEnrollmentForm(selectedEnrollmentPlan);
                    setShowEnrollmentForm(true);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                {showEnrollmentForm ? 'Close enrollment form' : 'Enroll member'}
              </button>
            </div>
            {showEnrollmentForm && (
              <form onSubmit={handleEnrollmentSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Patient name</label>
                    <input
                      type="text"
                      value={enrollmentFormState.patientName}
                      onChange={e => handleEnrollmentChange('patientName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Amelia Johnson"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                    <select
                      value={enrollmentFormState.planId ?? ''}
                      onChange={e => handleEnrollmentChange('planId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" disabled>
                        Select plan
                      </option>
                      {membershipPlans.map(plan => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} ({formatCurrency(plan.price)} {BILLING_INTERVAL_LABELS[plan.billingInterval]})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Membership ID (optional)</label>
                    <input
                      type="text"
                      value={enrollmentFormState.memberId}
                      onChange={e => handleEnrollmentChange('memberId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="MBR-0001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prepay periods</label>
                    <input
                      type="number"
                      min="1"
                      value={enrollmentFormState.prepayPeriods}
                      onChange={e => handleEnrollmentChange('prepayPeriods', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <label className="flex items-center gap-3 text-sm text-gray-700 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={enrollmentFormState.commitToMinimumTerm}
                      onChange={e => handleEnrollmentChange('commitToMinimumTerm', e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    Commit to minimum term (waives signup fee when plan requires it)
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Primary payment method</h4>
                    <label className="block text-xs uppercase text-gray-500 mb-1">Type</label>
                    <select
                      value={enrollmentFormState.primaryMethodType}
                      onChange={e => handleEnrollmentChange('primaryMethodType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="card">Card</option>
                      <option value="bank_account">Bank account</option>
                    </select>
                    <label className="block text-xs uppercase text-gray-500 mt-3 mb-1">Last 4</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={enrollmentFormState.primaryLast4}
                      onChange={e => handleEnrollmentChange('primaryLast4', e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="4242"
                    />
                    {enrollmentFormState.primaryMethodType === 'card' && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs uppercase text-gray-500 mb-1">Expiry month</label>
                          <input
                            type="number"
                            min="1"
                            max="12"
                            value={enrollmentFormState.primaryExpiryMonth}
                            onChange={e => handleEnrollmentChange('primaryExpiryMonth', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="07"
                          />
                        </div>
                        <div>
                          <label className="block text-xs uppercase text-gray-500 mb-1">Expiry year</label>
                          <input
                            type="number"
                            min="2024"
                            value={enrollmentFormState.primaryExpiryYear}
                            onChange={e => handleEnrollmentChange('primaryExpiryYear', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="2028"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700">Backup payment method</h4>
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={enrollmentFormState.addBackupMethod}
                          onChange={e => handleEnrollmentChange('addBackupMethod', e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        Add secondary method
                      </label>
                    </div>
                    {enrollmentFormState.addBackupMethod && (
                      <>
                        <label className="block text-xs uppercase text-gray-500 mb-1 mt-2">Type</label>
                        <select
                          value={enrollmentFormState.backupMethodType}
                          onChange={e => handleEnrollmentChange('backupMethodType', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="card">Card</option>
                          <option value="bank_account">Bank account</option>
                        </select>
                        <label className="block text-xs uppercase text-gray-500 mt-3 mb-1">Last 4</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={enrollmentFormState.backupLast4}
                          onChange={e => handleEnrollmentChange('backupLast4', e.target.value.replace(/\D/g, ''))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="1881"
                        />
                        {enrollmentFormState.backupMethodType === 'card' && (
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs uppercase text-gray-500 mb-1">Expiry month</label>
                              <input
                                type="number"
                                min="1"
                                max="12"
                                value={enrollmentFormState.backupExpiryMonth}
                                onChange={e => handleEnrollmentChange('backupExpiryMonth', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="03"
                              />
                            </div>
                            <div>
                              <label className="block text-xs uppercase text-gray-500 mb-1">Expiry year</label>
                              <input
                                type="number"
                                min="2024"
                                value={enrollmentFormState.backupExpiryYear}
                                onChange={e => handleEnrollmentChange('backupExpiryYear', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="2027"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                    <textarea
                      value={enrollmentFormState.notes}
                      onChange={e => handleEnrollmentChange('notes', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Prefers Tuesday morning scans, follow-up via SMS."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                    <input
                      type="text"
                      value={enrollmentFormState.tags}
                      onChange={e => handleEnrollmentChange('tags', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="VIP, High LTV"
                    />
                  </div>
                </div>

                {selectedEnrollmentPlan && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 space-y-2">
                    <p className="font-semibold text-blue-900">Enrollment summary</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <p>Plan: {selectedEnrollmentPlan.name}</p>
                      <p>Billing: {BILLING_INTERVAL_LABELS[selectedEnrollmentPlan.billingInterval]}</p>
                      <p>Prepay periods: {prepayPeriodsValue}</p>
                      {prepaySummary && (
                        <p>
                          Membership subtotal: {formatCurrency(prepaySummary.subtotal)}
                          {prepaySummary.discountAmount > 0 && (
                            <span className="ml-2 text-xs">(-{formatCurrency(prepaySummary.discountAmount)} prepay discount)</span>
                          )}
                        </p>
                      )}
                      <p>
                        Signup fee:{' '}
                        {signupFeePreview > 0
                          ? formatCurrency(signupFeePreview)
                          : signupFeeWaived
                          ? 'Waived'
                          : formatCurrency(0)}
                      </p>
                      <p>
                        Total due today:{' '}
                        {formatCurrency((prepaySummary ? prepaySummary.totalDue : 0) + signupFeePreview)}
                      </p>
                      <p>
                        Next renewal:{' '}
                        {formatMembershipDate(
                          calculateNextRenewalDate(
                            new Date().toISOString(),
                            selectedEnrollmentPlan.billingInterval
                          )
                        )}
                      </p>
                      {prepaidThrough && <p>Prepaid through: {formatMembershipDate(prepaidThrough)}</p>}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      resetEnrollmentForm();
                      setShowEnrollmentForm(false);
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Enroll member
                  </button>
                </div>
              </form>
            )}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <span className="text-sm font-semibold text-gray-600">Total members: {totalMembers}</span>
              <span className="text-sm font-semibold text-green-600">Active: {activeMembers}</span>
              <span className="text-sm font-semibold text-red-600">Past due: {pastDueMembers}</span>
              <span className="text-sm font-semibold text-blue-600">MRR (equiv): {formatCurrency(continuityMRR)}</span>
              <span className="text-sm font-semibold text-yellow-600">Renewals (7 days): {upcomingRenewals}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    <th className="py-3">Member</th>
                    <th className="py-3">Plan</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Next renewal</th>
                    <th className="py-3">Credits</th>
                    <th className="py-3">Payment methods</th>
                    <th className="py-3 text-center">Failed</th>
                    <th className="py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {memberSubscriptions.map(subscription => {
                    const plan = planMap.get(subscription.planId);
                    const balance = creditBalances.find(b => b.subscriptionId === subscription.id);
                    const primary = primaryPaymentMethod(subscription);
                    const backup = backupPaymentMethod(subscription);
                    const canBill = subscription.status === 'active' || subscription.status === 'past_due';

                    return (
                      <React.Fragment key={subscription.id}>
                        <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-800">{subscription.patientName}</span>
                              <span className="text-xs text-gray-500">{subscription.memberId || 'No member ID'}</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-col">
                              <span className="text-gray-800 font-medium">{plan?.name ?? 'Plan removed'}</span>
                              <span className="text-xs text-gray-500">{BILLING_INTERVAL_LABELS[subscription.billingInterval]}</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${membershipStatusClasses[subscription.status]}`}>
                              {membershipStatusText[subscription.status]}
                            </span>
                          </td>
                          <td className="py-3 text-gray-700">{formatMembershipDate(subscription.nextRenewalDate)}</td>
                          <td className="py-3 text-gray-700">
                            {balance ? (
                              <div className="flex flex-col">
                                <span>{balance.totalAvailableCredits} credits</span>
                                <span className="text-xs text-gray-500">
                                  {balance.currentPeriodCredits} current • {balance.carriedOverCredits} carryover
                                </span>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3 text-gray-700">
                            {primary ? (
                              <div className="flex flex-col">
                                <span>
                                  {primary.type === 'card'
                                    ? `Card •••• ${primary.last4}`
                                    : `Bank •••• ${primary.last4}`}
                                </span>
                                {backup && (
                                  <span className="text-xs text-gray-500">
                                    Backup: {backup.type === 'card' ? `Card •••• ${backup.last4}` : `Bank •••• ${backup.last4}`}
                                  </span>
                                )}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3 text-gray-700 text-center">{subscription.failedPaymentCount}</td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() =>
                                  primary &&
                                  triggerPaymentAttempt(subscription, 'success', {
                                    paymentMethodId: primary.id,
                                  })
                                }
                                disabled={!canBill || !primary}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                  canBill && primary
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                Charge renewal
                              </button>
                              <button
                                onClick={() =>
                                  primary &&
                                  triggerPaymentAttempt(subscription, 'failed', {
                                    paymentMethodId: primary.id,
                                    notes: 'Marked failed from admin portal.',
                                  })
                                }
                                disabled={!primary}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                              >
                                Mark failed
                              </button>
                              {backup && (
                                <button
                                  onClick={() =>
                                    triggerPaymentAttempt(subscription, 'success', {
                                      paymentMethodId: backup.id,
                                      retry: true,
                                      notes: 'Retry via backup method',
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                >
                                  Retry backup
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  setExpandedMemberId(expandedMemberId === subscription.id ? null : subscription.id)
                                }
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                              >
                                {expandedMemberId === subscription.id ? 'Hide timeline' : 'Timeline'}
                              </button>
                              <button
                                onClick={() => {
                                  setCancellationFormVisibleFor(
                                    cancellationFormVisibleFor === subscription.id ? null : subscription.id
                                  );
                                  setCancellationReason('');
                                  setWaiveCancellationFee(false);
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                        {cancellationFormVisibleFor === subscription.id && (
                          <tr className="bg-red-50 border-b border-red-100">
                            <td colSpan={8} className="p-4">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="text-sm text-red-800 space-y-1">
                                  <p className="font-semibold text-red-900">
                                    Cancel {subscription.patientName}'s membership?
                                  </p>
                                  <p>
                                    {plan?.cancellationFee
                                      ? `Early exit fee: ${formatCurrency(plan.cancellationFee)}`
                                      : 'No cancellation fee specified.'}
                                  </p>
                                  {subscription.minimumTermEndDate && (
                                    <p>Minimum term ends on {formatMembershipDate(subscription.minimumTermEndDate)}.</p>
                                  )}
                                </div>
                                <div className="flex-1 flex flex-col md:flex-row gap-3 md:items-center">
                                  <label className="flex items-center gap-2 text-sm text-red-800">
                                    <input
                                      type="checkbox"
                                      checked={waiveCancellationFee}
                                      onChange={e => setWaiveCancellationFee(e.target.checked)}
                                    />
                                    Waive cancellation fee
                                  </label>
                                  <input
                                    type="text"
                                    value={cancellationReason}
                                    onChange={e => setCancellationReason(e.target.value)}
                                    placeholder="Reason (optional)"
                                    className="flex-1 px-3 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setCancellationFormVisibleFor(null)}
                                      className="px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-100 transition-colors"
                                    >
                                      Keep membership
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onCancelMembership({
                                          subscriptionId: subscription.id,
                                          waiveFee: waiveCancellationFee,
                                          reason: cancellationReason.trim() || undefined,
                                          performedBy: 'admin.portal',
                                        });
                                        setCancellationFormVisibleFor(null);
                                        setCancellationReason('');
                                        setWaiveCancellationFee(false);
                                      }}
                                      className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                                    >
                                      Confirm cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {expandedMemberId && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Membership timeline</h3>
              <div className="space-y-3">
                {eventsForExpandedMember.length === 0 ? (
                  <p className="text-sm text-gray-500">No membership events recorded yet.</p>
                ) : (
                  eventsForExpandedMember.map(event => (
                    <div key={event.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span className="font-semibold text-gray-800">{formatEventType(event.eventType)}</span>
                        <span>
                          {formatMembershipDate(event.timestamp)} •{' '}
                          {new Date(event.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                        {event.amount !== undefined && <span>Amount: {formatCurrency(event.amount)}</span>}
                        {event.creditsChanged !== undefined && (
                          <span>Credits: {event.creditsChanged > 0 ? '+' : ''}{event.creditsChanged}</span>
                        )}
                        {event.paymentStatus && <span>Payment {event.paymentStatus}</span>}
                        {event.notes && <span>Note: {event.notes}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab === 'ledger' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Membership ledger</h3>
              <p className="text-sm text-gray-500">
                Audit enrollments, renewals, payment retries, and bonus credit grants.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                value={eventTypeFilter}
                onChange={e => setEventTypeFilter(e.target.value as MembershipEventType | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All event types</option>
                <option value="enrolled">Enrolled</option>
                <option value="renewed">Renewed</option>
                <option value="payment_failed">Payment failed</option>
                <option value="payment_retry">Payment retry</option>
                <option value="credits_granted">Credits granted</option>
                <option value="bonus_granted">Bonus granted</option>
                <option value="credits_redeemed">Credits redeemed</option>
                <option value="fee_charged">Fee charged</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={planFilter}
                onChange={e => setPlanFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All plans</option>
                {membershipPlans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="py-3">Timestamp</th>
                  <th className="py-3">Member</th>
                  <th className="py-3">Event</th>
                  <th className="py-3">Amount</th>
                  <th className="py-3">Credits</th>
                  <th className="py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedgerEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-gray-500">
                      No ledger events match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredLedgerEvents.map(event => {
                    const subscription = memberSubscriptions.find(sub => sub.id === event.subscriptionId);
                    const plan = subscription ? planMap.get(subscription.planId) : undefined;
                    return (
                      <tr
                        key={event.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 text-gray-700">
                          {formatMembershipDate(event.timestamp)}{' '}
                          {new Date(event.timestamp).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">{event.patientName}</span>
                            <span className="text-xs text-gray-500">{plan ? plan.name : 'Plan removed'}</span>
                          </div>
                        </td>
                        <td className="py-3 text-gray-700">{formatEventType(event.eventType)}</td>
                        <td className="py-3 text-gray-700">
                          {event.amount !== undefined ? formatCurrency(event.amount) : '—'}
                        </td>
                        <td className="py-3 text-gray-700">
                          {event.creditsChanged !== undefined
                            ? `${event.creditsChanged > 0 ? '+' : ''}${event.creditsChanged} credits`
                            : '—'}
                        </td>
                        <td className="py-3 text-gray-600">
                          <div className="flex flex-col">
                            <span>{event.description}</span>
                            {event.paymentStatus && (
                              <span className="text-xs text-gray-500">
                                Payment {event.paymentStatus}
                                {event.paymentMethodId ? ` via ${event.paymentMethodId}` : ''}
                              </span>
                            )}
                            {event.notes && (
                              <span className="text-xs text-gray-500">Note: {event.notes}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembershipsView;
