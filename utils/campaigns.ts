import {
  CampaignTriggerConfig,
  CampaignMessage,
  CustomerCommunicationPreferences,
  CampaignQueueItem,
  CampaignMetrics,
  CampaignMergeData,
  Appointment,
  MemberSubscription,
} from '../types';

/**
 * Render email or SMS template with merge fields
 * Replaces {{fieldName}} with actual values from mergeData
 */
export function renderTemplate(template: string, mergeData: CampaignMergeData): string {
  let rendered = template;

  // Replace all merge fields
  Object.entries(mergeData).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    const stringValue = value !== undefined && value !== null ? String(value) : '';
    rendered = rendered.replace(new RegExp(placeholder, 'g'), stringValue);
  });

  return rendered;
}

/**
 * Validate if customer can receive a campaign message
 * Checks consent, suppression rules, frequency caps, quiet hours
 */
export function canSendToCustomer(
  trigger: CampaignTriggerConfig,
  preferences: CustomerCommunicationPreferences,
  recentMessages: CampaignMessage[],
  currentTime: Date = new Date()
): { allowed: boolean; reason?: string } {
  // Check if unsubscribed from all
  if (preferences.unsubscribedFromAll) {
    return { allowed: false, reason: 'Customer unsubscribed from all communications' };
  }

  // Check channel consent
  if (trigger.channel === 'email' && !preferences.emailConsent) {
    return { allowed: false, reason: 'No email consent' };
  }
  if (trigger.channel === 'sms' && !preferences.smsConsent) {
    return { allowed: false, reason: 'No SMS consent' };
  }

  // Check marketing consent for marketing campaigns
  const marketingTriggers = ['lifecycle_pregnancy', 'lifecycle_time_since_scan', 'reactivation', 'post_visit_upsell'];
  if (marketingTriggers.includes(trigger.triggerType) && !preferences.marketingConsent) {
    return { allowed: false, reason: 'No marketing consent' };
  }

  // Check if opted out of this specific campaign
  if (preferences.optOutCampaigns.includes(trigger.id)) {
    return { allowed: false, reason: 'Opted out of this campaign' };
  }

  // Check suppression rules
  if (trigger.suppressionRules.includes('unsubscribed_all') && preferences.unsubscribedFromAll) {
    return { allowed: false, reason: 'Suppression rule: unsubscribed_all' };
  }
  if (trigger.suppressionRules.includes('unsubscribed_marketing') && !preferences.marketingConsent) {
    return { allowed: false, reason: 'Suppression rule: unsubscribed_marketing' };
  }
  if (trigger.suppressionRules.includes('opted_out_campaign') && preferences.optOutCampaigns.includes(trigger.id)) {
    return { allowed: false, reason: 'Suppression rule: opted_out_campaign' };
  }
  if (trigger.suppressionRules.includes('opted_out_sms') && trigger.channel === 'sms' && !preferences.smsConsent) {
    return { allowed: false, reason: 'Suppression rule: opted_out_sms' };
  }

  // Check quiet hours
  if (trigger.respectQuietHours && preferences.quietHoursEnabled) {
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    const quietStart = preferences.quietHoursStart || trigger.quietHoursStart || '21:00';
    const quietEnd = preferences.quietHoursEnd || trigger.quietHoursEnd || '08:00';

    if (isInQuietHours(currentTimeStr, quietStart, quietEnd)) {
      return { allowed: false, reason: 'Within quiet hours' };
    }
  }

  // Check frequency cap - messages this week
  const weekAgo = new Date(currentTime.getTime() - 7 * 24 * 60 * 60 * 1000);
  const messagesThisWeek = recentMessages.filter(m => {
    const messageDate = new Date(m.queuedAt);
    return messageDate >= weekAgo && (m.status === 'delivered' || m.status === 'sent');
  });

  // Check global frequency cap
  const customerMaxPerWeek = preferences.maxMessagesPerWeek || 10;
  if (messagesThisWeek.length >= customerMaxPerWeek) {
    return { allowed: false, reason: `Frequency cap reached: ${customerMaxPerWeek}/week` };
  }

  // Check campaign-specific frequency cap
  if (trigger.maxMessagesPerWeek && messagesThisWeek.length >= trigger.maxMessagesPerWeek) {
    return { allowed: false, reason: `Campaign frequency cap: ${trigger.maxMessagesPerWeek}/week` };
  }

  // Check per-campaign message limit
  if (trigger.maxMessagesPerCampaign) {
    const campaignMessages = recentMessages.filter(m => m.campaignTriggerId === trigger.id);
    if (campaignMessages.length >= trigger.maxMessagesPerCampaign) {
      return { allowed: false, reason: `Campaign message limit reached: ${trigger.maxMessagesPerCampaign}` };
    }
  }

  return { allowed: true };
}

/**
 * Check if current time is within quiet hours
 */
function isInQuietHours(currentTime: string, quietStart: string, quietEnd: string): boolean {
  // Convert times to minutes since midnight for comparison
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const current = timeToMinutes(currentTime);
  const start = timeToMinutes(quietStart);
  const end = timeToMinutes(quietEnd);

  // Handle cases where quiet hours span midnight
  if (start > end) {
    return current >= start || current < end;
  } else {
    return current >= start && current < end;
  }
}

/**
 * Check if current time is within send window
 */
export function isInSendWindow(
  currentTime: Date,
  sendWindowStart: string,
  sendWindowEnd: string
): boolean {
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const current = timeToMinutes(currentTimeStr);
  const start = timeToMinutes(sendWindowStart);
  const end = timeToMinutes(sendWindowEnd);

  return current >= start && current <= end;
}

/**
 * Calculate when a message should be scheduled
 * Takes into account delay, send window, and quiet hours
 */
export function calculateScheduledTime(
  trigger: CampaignTriggerConfig,
  triggerTime: Date,
  preferences?: CustomerCommunicationPreferences
): Date {
  // Add delay minutes
  const scheduledTime = new Date(triggerTime.getTime() + trigger.delayMinutes * 60 * 1000);

  // If not in send window, move to next available window
  if (!isInSendWindow(scheduledTime, trigger.sendWindowStart, trigger.sendWindowEnd)) {
    const [startHour, startMinute] = trigger.sendWindowStart.split(':').map(Number);

    // Set to start of next send window
    const nextWindow = new Date(scheduledTime);
    nextWindow.setHours(startHour, startMinute, 0, 0);

    // If the window already passed today, schedule for tomorrow
    if (nextWindow <= scheduledTime) {
      nextWindow.setDate(nextWindow.getDate() + 1);
    }

    return nextWindow;
  }

  // Check quiet hours if applicable
  if (trigger.respectQuietHours && preferences?.quietHoursEnabled) {
    const quietStart = preferences.quietHoursStart || trigger.quietHoursStart || '21:00';
    const quietEnd = preferences.quietHoursEnd || trigger.quietHoursEnd || '08:00';

    const currentHour = scheduledTime.getHours();
    const currentMinute = scheduledTime.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    if (isInQuietHours(currentTimeStr, quietStart, quietEnd)) {
      // Move to end of quiet hours
      const [endHour, endMinute] = quietEnd.split(':').map(Number);
      const afterQuietHours = new Date(scheduledTime);
      afterQuietHours.setHours(endHour, endMinute, 0, 0);

      // If quiet hours end is earlier than current time (spans midnight), add a day
      if (afterQuietHours <= scheduledTime) {
        afterQuietHours.setDate(afterQuietHours.getDate() + 1);
      }

      return afterQuietHours;
    }
  }

  return scheduledTime;
}

/**
 * Evaluate if a booking abandonment trigger should fire
 */
export function shouldTriggerBookingAbandonment(
  trigger: CampaignTriggerConfig,
  cartValue: number,
  abandonedAt: Date,
  currentTime: Date = new Date()
): boolean {
  if (trigger.triggerType !== 'booking_abandonment' || !trigger.enabled) {
    return false;
  }

  // Check minimum cart value
  if (trigger.conditions?.minCartValue && cartValue < trigger.conditions.minCartValue) {
    return false;
  }

  // Check if enough time has passed
  const minutesSinceAbandonment = (currentTime.getTime() - abandonedAt.getTime()) / (1000 * 60);
  if (trigger.conditions?.abandonedForMinutes && minutesSinceAbandonment < trigger.conditions.abandonedForMinutes) {
    return false;
  }

  return true;
}

/**
 * Evaluate if a lifecycle pregnancy trigger should fire
 */
export function shouldTriggerLifecyclePregnancy(
  trigger: CampaignTriggerConfig,
  pregnancyWeek: number
): boolean {
  if (trigger.triggerType !== 'lifecycle_pregnancy' || !trigger.enabled) {
    return false;
  }

  // Check if current pregnancy week matches trigger conditions
  if (trigger.conditions?.pregnancyWeeks) {
    return trigger.conditions.pregnancyWeeks.includes(pregnancyWeek);
  }

  return false;
}

/**
 * Evaluate if a time-since-scan trigger should fire
 */
export function shouldTriggerTimeSinceScan(
  trigger: CampaignTriggerConfig,
  lastVisitDate: Date,
  currentTime: Date = new Date()
): boolean {
  if (trigger.triggerType !== 'lifecycle_time_since_scan' || !trigger.enabled) {
    return false;
  }

  const daysSinceVisit = Math.floor((currentTime.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));

  if (trigger.conditions?.daysSinceLastVisit && daysSinceVisit >= trigger.conditions.daysSinceLastVisit) {
    return true;
  }

  return false;
}

/**
 * Evaluate if a membership renewal trigger should fire
 */
export function shouldTriggerMembershipRenewal(
  trigger: CampaignTriggerConfig,
  renewalDate: Date,
  currentTime: Date = new Date()
): boolean {
  if (trigger.triggerType !== 'membership_renewal' || !trigger.enabled) {
    return false;
  }

  const daysUntilRenewal = Math.floor((renewalDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24));

  if (trigger.conditions?.daysBeforeRenewal && daysUntilRenewal === trigger.conditions.daysBeforeRenewal) {
    return true;
  }

  return false;
}

/**
 * Evaluate if a reactivation trigger should fire
 */
export function shouldTriggerReactivation(
  trigger: CampaignTriggerConfig,
  lastVisitDate: Date,
  currentTime: Date = new Date()
): boolean {
  if (trigger.triggerType !== 'reactivation' || !trigger.enabled) {
    return false;
  }

  const daysSinceVisit = Math.floor((currentTime.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));

  const minDays = trigger.conditions?.minDaysSinceLastVisit || trigger.conditions?.daysSinceLastVisit || 0;
  const maxDays = trigger.conditions?.maxDaysSinceLastVisit || Infinity;

  return daysSinceVisit >= minDays && daysSinceVisit <= maxDays;
}

/**
 * Evaluate if a post-visit upsell trigger should fire
 */
export function shouldTriggerPostVisitUpsell(
  trigger: CampaignTriggerConfig,
  visitDate: Date,
  purchaseAmount: number,
  currentTime: Date = new Date()
): boolean {
  if (trigger.triggerType !== 'post_visit_upsell' || !trigger.enabled) {
    return false;
  }

  // Check minimum purchase amount
  if (trigger.conditions?.minPurchaseAmount && purchaseAmount < trigger.conditions.minPurchaseAmount) {
    return false;
  }

  // Check if enough time has passed
  const hoursSinceVisit = (currentTime.getTime() - visitDate.getTime()) / (1000 * 60 * 60);
  if (trigger.conditions?.hoursAfterVisit && hoursSinceVisit >= trigger.conditions.hoursAfterVisit) {
    return true;
  }

  return false;
}

/**
 * Create a campaign queue item from trigger and merge data
 */
export function createQueueItem(
  trigger: CampaignTriggerConfig,
  patientName: string,
  patientEmail: string | undefined,
  patientPhone: string | undefined,
  mergeData: CampaignMergeData,
  preferences?: CustomerCommunicationPreferences
): CampaignQueueItem {
  const now = new Date();
  const scheduledFor = calculateScheduledTime(trigger, now, preferences);

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    campaignTriggerId: trigger.id,
    patientName,
    patientEmail,
    patientPhone,
    channel: trigger.channel,
    scheduledFor: scheduledFor.toISOString(),
    priority: trigger.priority,
    status: 'pending',
    attempts: 0,
    mergeData,
    createdAt: now.toISOString(),
  };
}

/**
 * Create a campaign message from queue item
 */
export function createCampaignMessage(
  queueItem: CampaignQueueItem,
  trigger: CampaignTriggerConfig
): CampaignMessage {
  const template = trigger.channel === 'email' ? trigger.emailTemplate : trigger.smsTemplate || '';
  const content = renderTemplate(template, queueItem.mergeData);

  // For email, extract subject from template if present (look for <title> or first heading)
  let subject: string | undefined;
  if (trigger.channel === 'email') {
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    const h1Match = content.match(/<h1>(.*?)<\/h1>/i);
    const h2Match = content.match(/<h2>(.*?)<\/h2>/i);

    if (titleMatch) {
      subject = titleMatch[1];
    } else if (h1Match) {
      subject = h1Match[1].replace(/<[^>]*>/g, ''); // Strip HTML tags
    } else if (h2Match) {
      subject = h2Match[1].replace(/<[^>]*>/g, '');
    } else {
      subject = `Message from SonoRecall Clinic`;
    }
  }

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    campaignTriggerId: trigger.id,
    campaignName: trigger.name,
    patientName: queueItem.patientName,
    patientEmail: queueItem.patientEmail,
    patientPhone: queueItem.patientPhone,
    channel: queueItem.channel,
    subject,
    content,
    status: 'queued',
    queuedAt: new Date().toISOString(),
    scheduledFor: queueItem.scheduledFor,
    mergeData: queueItem.mergeData,
  };
}

/**
 * Calculate comprehensive campaign metrics
 */
export function calculateCampaignMetrics(
  messages: CampaignMessage[],
  triggers: CampaignTriggerConfig[],
  startDate?: Date,
  endDate?: Date
): CampaignMetrics {
  // Filter messages by date range if provided
  let filteredMessages = messages;
  if (startDate || endDate) {
    filteredMessages = messages.filter(m => {
      const messageDate = new Date(m.queuedAt);
      if (startDate && messageDate < startDate) return false;
      if (endDate && messageDate > endDate) return false;
      return true;
    });
  }

  const totalMessagesSent = filteredMessages.filter(m => m.status === 'sent' || m.status === 'delivered').length;
  const totalMessagesDelivered = filteredMessages.filter(m => m.status === 'delivered').length;
  const totalOpens = filteredMessages.filter(m => m.opened).length;
  const totalClicks = filteredMessages.filter(m => m.clicked).length;
  const totalConversions = filteredMessages.filter(m => m.converted).length;
  const totalRevenue = filteredMessages.reduce((sum, m) => sum + (m.conversionValue || 0), 0);

  const openRate = totalMessagesDelivered > 0 ? (totalOpens / totalMessagesDelivered) * 100 : 0;
  const clickRate = totalOpens > 0 ? (totalClicks / totalOpens) * 100 : 0;
  const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
  const revenuePerMessage = totalMessagesSent > 0 ? totalRevenue / totalMessagesSent : 0;
  const averageOrderValue = totalConversions > 0 ? totalRevenue / totalConversions : 0;

  // Estimate cost (£0.01 per SMS, £0.003 per email)
  const emailCount = filteredMessages.filter(m => m.channel === 'email' && m.status === 'sent').length;
  const smsCount = filteredMessages.filter(m => m.channel === 'sms' && m.status === 'sent').length;
  const totalCost = (emailCount * 0.003) + (smsCount * 0.01);

  const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

  // Calculate per-campaign breakdown
  const campaignBreakdown = triggers.map(trigger => {
    const campaignMessages = filteredMessages.filter(m => m.campaignTriggerId === trigger.id);
    const sent = campaignMessages.filter(m => m.status === 'sent' || m.status === 'delivered').length;
    const delivered = campaignMessages.filter(m => m.status === 'delivered').length;
    const opens = campaignMessages.filter(m => m.opened).length;
    const clicks = campaignMessages.filter(m => m.clicked).length;
    const conversions = campaignMessages.filter(m => m.converted).length;
    const revenue = campaignMessages.reduce((sum, m) => sum + (m.conversionValue || 0), 0);

    return {
      campaignId: trigger.id,
      campaignName: trigger.name,
      messagesSent: sent,
      messagesDelivered: delivered,
      opens,
      clicks,
      conversions,
      revenue,
      openRate: delivered > 0 ? (opens / delivered) * 100 : 0,
      clickRate: opens > 0 ? (clicks / opens) * 100 : 0,
      conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
    };
  }).filter(breakdown => breakdown.messagesSent > 0);

  return {
    totalMessagesSent,
    totalMessagesDelivered,
    totalOpens,
    totalClicks,
    totalConversions,
    totalRevenue,
    openRate: parseFloat(openRate.toFixed(1)),
    clickRate: parseFloat(clickRate.toFixed(1)),
    conversionRate: parseFloat(conversionRate.toFixed(1)),
    revenuePerMessage: parseFloat(revenuePerMessage.toFixed(2)),
    averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
    totalCost: parseFloat(totalCost.toFixed(2)),
    roi: parseFloat(roi.toFixed(1)),
    campaignBreakdown,
    periodStart: startDate?.toISOString() || filteredMessages[0]?.queuedAt,
    periodEnd: endDate?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Build merge data for booking abandonment
 */
export function buildBookingAbandonmentMergeData(
  patientName: string,
  serviceName: string,
  cartTotal: number,
  bookingUrl: string
): CampaignMergeData {
  return {
    patientName,
    serviceName,
    cartTotal: cartTotal.toString(),
    bookingUrl,
  };
}

/**
 * Build merge data for membership renewal
 */
export function buildMembershipRenewalMergeData(
  subscription: MemberSubscription,
  planName: string,
  renewalDate: string,
  availableCredits: number
): CampaignMergeData {
  const cardLast4 = subscription.paymentMethods.find(pm => pm.isPrimary)?.last4 || '****';

  return {
    patientName: subscription.patientName,
    membershipPlan: planName,
    renewalDate,
    renewalAmount: subscription.price.toString(),
    includedCredits: subscription.currentPeriodCredits.toString(),
    billingInterval: subscription.billingInterval === 'every_4_weeks' ? '4 weeks' : subscription.billingInterval,
    availableCredits: availableCredits.toString(),
    cardLast4,
    accountUrl: 'https://sonorecall.com/account',
  };
}

/**
 * Build merge data for post-visit upsell
 */
export function buildPostVisitUpsellMergeData(
  patientName: string,
  appointmentDate: string,
  upsellUrl: string
): CampaignMergeData {
  return {
    patientName,
    appointmentDate,
    upsellUrl,
  };
}
