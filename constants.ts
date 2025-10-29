import { Patient, Appointment, Recall, RecallStatus, Conversation, MessageSender, MissedCall, MessageType, Product, Bundle, BXGYRule, UpsellRule, PaymentPlan, ScaledOffer, DownsellRule, UpgradeCredit } from './types';

export const mockPatients: Patient[] = [
  { id: 1, name: 'Amelia Johnson', phone: '+44 7700 900001', email: 'amelia.j@example.com', lastVisit: '2023-10-15', nextDue: '2024-10-15' },
  { id: 2, name: 'Benjamin Carter', phone: '+44 7700 900002', email: 'b.carter@example.com', lastVisit: '2024-04-20', nextDue: '2024-07-20' },
  { id: 3, name: 'Chloe Davies', phone: '+44 7700 900003', email: 'chloe.d@example.com', lastVisit: '2024-01-10', nextDue: '2025-01-10' },
  { id: 4, name: 'Daniel Smith', phone: '+44 7700 900004', email: 'dan.smith@example.com', lastVisit: '2024-06-01', nextDue: '2024-09-01' },
  { id: 5, name: 'Sophia Miller', phone: '+44 7700 900005', email: 'sophia.m@example.com', lastVisit: '2024-07-10', nextDue: '2025-01-10' },
  { id: 6, name: 'Jacob Moore', phone: '+44 7700 900006', email: 'jacob.m@example.com', lastVisit: '2024-07-12', nextDue: '2024-10-12' },
];

export const mockUpcomingAppointments: Appointment[] = [
  { id: 1, patientName: 'Olivia Williams', time: '09:00 AM', type: 'Prenatal Scan (20wk)', status: 'Confirmed', reviewStatus: 'Pending', price: 220 },
  { id: 2, patientName: 'George Brown', time: '09:30 AM', type: 'Abdominal Ultrasound', status: 'Confirmed', reviewStatus: 'Pending', price: 150 },
  { id: 3, patientName: 'Isla Taylor', time: '10:00 AM', type: 'Follow-up Scan', status: 'Pending', reviewStatus: 'Pending', price: 90 },
  { id: 4, patientName: 'Harry Wilson', time: '11:00 AM', type: 'Musculoskeletal Scan', status: 'Confirmed', reviewStatus: 'Pending', price: 180 },
];

export const mockRecentAppointments: Appointment[] = [
    { id: 5, patientName: 'Amelia Johnson', time: 'Yesterday', type: 'Annual Check-up', status: 'Completed', reviewStatus: 'Pending', price: 250 },
    { id: 6, patientName: 'Sophia Miller', time: 'Yesterday', type: 'Prenatal Scan (12wk)', status: 'Completed', reviewStatus: 'Requested', price: 120 },
    { id: 7, patientName: 'Jacob Moore', time: '2 days ago', type: 'Abdominal Scan', status: 'Completed', reviewStatus: 'Completed', price: 150 },
];

export const mockRecalls: Recall[] = [
  { id: 1, patient: mockPatients[0], status: RecallStatus.Due },
  { id: 2, patient: mockPatients[1], status: RecallStatus.Contacted },
  { id: 3, patient: mockPatients[2], status: RecallStatus.Booked },
  { id: 4, patient: mockPatients[3], status: RecallStatus.Due },
];

export const mockConversations: Conversation[] = [
  {
    id: 1,
    patientName: 'Benjamin Carter',
    lastMessage: 'Great, see you then!',
    timestamp: '10:32 AM',
    unread: false,
    messages: [
      { id: 1, sender: MessageSender.System, type: MessageType.Standard, text: 'Hi Benjamin, this is SonoClinic. We noticed you are due for your follow-up scan. Please let us know when you would like to book.', timestamp: 'Yesterday 09:00 AM' },
      { id: 2, sender: MessageSender.Patient, type: MessageType.Standard, text: 'Hi, can I book for next Tuesday morning?', timestamp: 'Yesterday 09:05 AM' },
      { id: 3, sender: MessageSender.Clinic, type: MessageType.Standard, text: 'Certainly, we have an opening at 9:30 AM on Tuesday. Does that work for you?', timestamp: 'Yesterday 09:10 AM' },
      { id: 4, sender: MessageSender.Patient, type: MessageType.Standard, text: 'Perfect, please book me in.', timestamp: '10:30 AM' },
      { id: 5, sender: MessageSender.Clinic, type: MessageType.Standard, text: 'You are all set. We have sent a confirmation to your email. Great, see you then!', timestamp: '10:32 AM' },
    ],
  },
  {
    id: 2,
    patientName: 'Isla Taylor',
    lastMessage: 'Can I reschedule for Friday?',
    timestamp: '02:15 PM',
    unread: true,
    messages: [
      { id: 1, sender: MessageSender.System, type: MessageType.Standard, text: 'Reminder: Your appointment is tomorrow at 10:00 AM.', timestamp: '11:00 AM' },
      { id: 2, sender: MessageSender.Patient, type: MessageType.Standard, text: 'Hi, something came up. Can I reschedule for Friday?', timestamp: '02:15 PM' },
    ],
  },
    {
    id: 3,
    patientName: 'Sophia Miller',
    lastMessage: 'Thank you for your feedback request.',
    timestamp: 'Yesterday',
    unread: false,
    messages: [
        { id: 1, sender: MessageSender.System, type: MessageType.FeedbackRequest, text: 'Hi Sophia, thank you for visiting SonoClinic today! We\'d love to hear about your experience. Please share your feedback here.', payload: { appointmentId: 6 }, timestamp: 'Yesterday 03:00 PM' },
    ]
  }
];

export const mockMissedCalls: MissedCall[] = [
    { id: 1, callerNumber: '+44 7700 900111', timestamp: '2 hours ago', status: 'Pending' }
];

export const analyticsData = {
  noShowRate: [
    { name: 'Jan', rate: 12 }, { name: 'Feb', rate: 11 }, { name: 'Mar', rate: 9 },
    { name: 'Apr', rate: 7 }, { name: 'May', rate: 6 }, { name: 'Jun', rate: 5 },
  ],
  recallEffectiveness: [
    { name: 'Sent', value: 250 },
    { name: 'Booked', value: 180 },
  ],
  reviewRatings: [
    { name: '5 Stars', value: 85 }, { name: '4 Stars', value: 25 },
    { name: '3 Stars', value: 5 }, { name: '1-2 Stars', value: 2 },
  ],
};

export const mockProducts: Product[] = [
  {
    id: 1,
    name: 'Printed Scan Photos (4x6)',
    description: 'High-quality printed ultrasound images',
    price: 5,
    category: 'Prints',
    stockLevel: 50,
    reorderPoint: 20,
    active: true,
    trackStock: true,
  },
  {
    id: 2,
    name: 'Digital Scan Package',
    description: 'Digital copies of all scan images delivered via email',
    price: 15,
    category: 'Digital',
    stockLevel: 0,
    reorderPoint: 0,
    active: true,
    trackStock: false,
  },
  {
    id: 3,
    name: 'Premium Photo Frame',
    description: 'Elegant frame for your baby scan photos',
    price: 25,
    category: 'Keepsakes',
    stockLevel: 15,
    reorderPoint: 5,
    active: true,
    trackStock: true,
  },
  {
    id: 4,
    name: 'USB Drive with Scans',
    description: '16GB USB drive preloaded with your scan images and videos',
    price: 20,
    category: 'Digital',
    stockLevel: 30,
    reorderPoint: 10,
    active: true,
    trackStock: true,
  },
  {
    id: 5,
    name: 'Baby Heartbeat Recording',
    description: 'Audio recording of your baby\'s heartbeat',
    price: 10,
    category: 'Keepsakes',
    stockLevel: 0,
    reorderPoint: 0,
    active: true,
    trackStock: false,
  },
  {
    id: 6,
    name: 'Scan Video Recording',
    description: 'Full video recording of your ultrasound session',
    price: 35,
    category: 'Video',
    stockLevel: 0,
    reorderPoint: 0,
    active: true,
    trackStock: false,
  },
  {
    id: 7,
    name: 'Gender Reveal Package',
    description: 'Sealed envelope with gender reveal photo',
    price: 12,
    category: 'Keepsakes',
    stockLevel: 25,
    reorderPoint: 10,
    active: true,
    trackStock: true,
  },
  {
    id: 8,
    name: 'Legacy Product (Discontinued)',
    description: 'Old product no longer available',
    price: 50,
    category: 'Other',
    stockLevel: 0,
    reorderPoint: 0,
    active: false,
    trackStock: false,
  },
];

export const mockBundles: Bundle[] = [
  {
    id: 1,
    name: 'Complete Prenatal Package',
    description: 'Includes 12-week scan, 20-week scan, digital photos, and printed keepsake',
    items: [
      { type: 'service', id: 2, name: 'Prenatal Scan (12wk)', quantity: 1 },
      { type: 'service', id: 1, name: 'Prenatal Scan (20wk)', quantity: 1 },
      { type: 'product', id: 2, name: 'Digital Scan Package', quantity: 1 },
      { type: 'product', id: 1, name: 'Printed Scan Photos (4x6)', quantity: 1 },
    ],
    discountType: 'percentage',
    discountValue: 15, // 15% off
    active: true,
    category: 'Prenatal',
  },
  {
    id: 2,
    name: 'Memory Bundle',
    description: 'Premium frame, printed photos, and USB drive with all your scan images',
    items: [
      { type: 'product', id: 3, name: 'Premium Photo Frame', quantity: 1 },
      { type: 'product', id: 1, name: 'Printed Scan Photos (4x6)', quantity: 2 },
      { type: 'product', id: 4, name: 'USB Drive with Scans', quantity: 1 },
    ],
    discountType: 'fixed',
    discountValue: 10, // £10 off
    active: true,
    category: 'Keepsakes',
  },
  {
    id: 3,
    name: 'Digital Premium Package',
    description: 'All digital content: scan package, video recording, and heartbeat audio',
    items: [
      { type: 'product', id: 2, name: 'Digital Scan Package', quantity: 1 },
      { type: 'product', id: 6, name: 'Scan Video Recording', quantity: 1 },
      { type: 'product', id: 5, name: 'Baby Heartbeat Recording', quantity: 1 },
    ],
    discountType: 'percentage',
    discountValue: 20, // 20% off
    active: true,
    category: 'Digital',
  },
  {
    id: 4,
    name: 'Family Scan Special',
    description: 'Two scans plus gender reveal package',
    items: [
      { type: 'service', id: 1, name: 'Follow-up Scan', quantity: 2 },
      { type: 'product', id: 7, name: 'Gender Reveal Package', quantity: 1 },
    ],
    discountType: 'fixed',
    discountValue: 25,
    finalPrice: 175, // Override: normally would be £205, special price £175
    active: true,
    category: 'Special Offers',
  },
  {
    id: 5,
    name: 'Inactive Bundle Example',
    description: 'This bundle is not active',
    items: [
      { type: 'product', id: 1, name: 'Printed Scan Photos (4x6)', quantity: 1 },
    ],
    discountType: 'percentage',
    discountValue: 10,
    active: false,
  },
];

export const mockBXGYRules: BXGYRule[] = [
  {
    id: 1,
    name: 'Buy 3 Photo Products, Get 1 Free',
    description: 'Add any 3 photo products to your cart and get the cheapest one free',
    active: true,
    buyQuantity: 3,
    buyItemType: 'product',
    buyCategory: 'Prints',
    ruleType: 'free_item',
    getQuantity: 1,
    targetType: 'category',
    getCategory: 'Prints',
  },
  {
    id: 2,
    name: 'Buy 2 Scans, Get 20% Off 3rd',
    description: 'Book 3 scans and get 20% off the cheapest one',
    active: true,
    buyQuantity: 2,
    buyItemType: 'service',
    ruleType: 'percentage_discount',
    getQuantity: 1,
    discountValue: 20,
    targetType: 'same_item',
  },
  {
    id: 3,
    name: 'Buy Frame, Get 50% Off USB Drive',
    description: 'Purchase a premium photo frame and get 50% off a USB drive',
    active: true,
    buyQuantity: 1,
    buyItemType: 'product',
    buyItemId: 3, // Premium Photo Frame
    ruleType: 'percentage_discount',
    getQuantity: 1,
    getItemType: 'product',
    getItemId: 4, // USB Drive
    discountValue: 50,
    targetType: 'specific_item',
  },
  {
    id: 4,
    name: 'Buy 2 Keepsakes, Get £5 Off Each',
    description: 'Add any 2 keepsake products and save £5 on each',
    active: true,
    buyQuantity: 2,
    buyItemType: 'product',
    buyCategory: 'Keepsakes',
    ruleType: 'fixed_discount',
    getQuantity: 2,
    discountValue: 5,
    targetType: 'category',
    getCategory: 'Keepsakes',
  },
  {
    id: 5,
    name: 'Inactive BXGY Rule',
    description: 'This rule is not active',
    active: false,
    buyQuantity: 1,
    buyItemType: 'any',
    ruleType: 'percentage_discount',
    getQuantity: 1,
    discountValue: 10,
    targetType: 'same_item',
  },
];

export const mockUpsellRules: UpsellRule[] = [
  {
    id: 1,
    name: 'Gender Reveal Upsell',
    description: 'Suggest Gender Reveal Package when prenatal scan is selected',
    active: true,
    priority: 10,
    conditions: [
      {
        triggerType: 'service_selected',
        serviceName: 'Prenatal Scan (20wk)',
      },
    ],
    offerType: 'addon',
    placement: ['after_service', 'pre_payment'],
    offeredItemType: 'product',
    offeredItemId: 7,
    offeredItemName: 'Gender Reveal Package',
    originalPrice: 12,
    discountedPrice: 10,
    incrementalPrice: 10,
    headline: 'Add Gender Reveal Package',
    subheadline: 'Sealed envelope with gender reveal photo - Just £10',
    badge: 'POPULAR',
    onlyShowOnce: true,
  },
  {
    id: 2,
    name: 'Digital Package Upgrade',
    description: 'Offer digital package to any scan customer',
    active: true,
    priority: 8,
    conditions: [
      {
        triggerType: 'service_selected',
      },
    ],
    offerType: 'addon',
    placement: ['after_service', 'pre_payment'],
    offeredItemType: 'product',
    offeredItemId: 2,
    offeredItemName: 'Digital Scan Package',
    originalPrice: 15,
    headline: 'Add Digital Photos Package',
    subheadline: 'All scan images delivered via email for £15',
    badge: 'RECOMMENDED',
  },
  {
    id: 3,
    name: 'Memory Bundle Upsell',
    description: 'Suggest Memory Bundle when customer adds printed photos',
    active: true,
    priority: 9,
    conditions: [
      {
        triggerType: 'product_selected',
        productId: 1, // Printed Photos
      },
    ],
    offerType: 'bundle_upsell',
    placement: ['pre_payment'],
    offeredItemType: 'bundle',
    offeredItemId: 2,
    offeredItemName: 'Memory Bundle',
    originalPrice: 55,
    discountedPrice: 45,
    incrementalPrice: 35,
    headline: 'Upgrade to Memory Bundle',
    subheadline: 'Save £10 - Get frame, extra prints, and USB drive',
    badge: 'SAVE £10',
  },
  {
    id: 4,
    name: 'Heartbeat Recording Add-on',
    description: 'Offer heartbeat recording for prenatal scans',
    active: true,
    priority: 7,
    conditions: [
      {
        triggerType: 'category_selected',
        productCategory: 'Keepsakes',
      },
    ],
    offerType: 'addon',
    placement: ['pre_payment', 'pos_checkout'],
    offeredItemType: 'product',
    offeredItemId: 5,
    offeredItemName: 'Baby Heartbeat Recording',
    originalPrice: 10,
    headline: 'Capture Baby\'s Heartbeat',
    subheadline: 'Audio recording of your baby\'s heartbeat - £10',
  },
  {
    id: 5,
    name: 'Video Recording Upsell',
    description: 'Suggest video recording for high-value bookings',
    active: true,
    priority: 6,
    conditions: [
      {
        triggerType: 'cart_value',
        minCartValue: 150,
      },
    ],
    offerType: 'addon',
    placement: ['pre_payment'],
    offeredItemType: 'product',
    offeredItemId: 6,
    offeredItemName: 'Scan Video Recording',
    originalPrice: 35,
    discountedPrice: 30,
    headline: 'Add Full Video Recording',
    subheadline: 'Complete ultrasound session video for £30 (usually £35)',
    badge: 'SAVE £5',
  },
  {
    id: 6,
    name: 'Frame Quantity Bump',
    description: 'Offer second frame at discount when one is added',
    active: true,
    priority: 5,
    conditions: [
      {
        triggerType: 'product_selected',
        productId: 3, // Premium Photo Frame
      },
    ],
    offerType: 'quantity_bump',
    placement: ['pre_payment'],
    offeredItemType: 'product',
    offeredItemId: 3,
    offeredItemName: 'Premium Photo Frame',
    originalPrice: 25,
    discountedPrice: 20,
    discountPercentage: 20,
    headline: 'Add Another Frame for 20% Off',
    subheadline: 'Second frame just £20 (save £5)',
    badge: '20% OFF',
    maxDisplaysPerSession: 1,
  },
  {
    id: 7,
    name: 'Complete Prenatal Bundle',
    description: 'Upsell complete prenatal package for prenatal customers',
    active: true,
    priority: 10,
    conditions: [
      {
        triggerType: 'service_selected',
        serviceName: 'Prenatal Scan (12wk)',
      },
    ],
    offerType: 'bundle_upsell',
    placement: ['after_service'],
    offeredItemType: 'bundle',
    offeredItemId: 1,
    offeredItemName: 'Complete Prenatal Package',
    originalPrice: 340,
    discountedPrice: 289,
    incrementalPrice: 169, // From single 12wk scan at £120
    headline: 'Upgrade to Complete Prenatal Package',
    subheadline: 'Save 15% - Includes both scans plus digital and printed keepsakes',
    badge: 'BEST VALUE',
    onlyShowOnce: true,
  },
  {
    id: 8,
    name: 'USB Drive Cross-sell',
    description: 'Suggest USB when digital package is selected',
    active: true,
    priority: 4,
    conditions: [
      {
        triggerType: 'product_selected',
        productId: 2, // Digital Scan Package
      },
    ],
    offerType: 'addon',
    placement: ['pre_payment'],
    offeredItemType: 'product',
    offeredItemId: 4,
    offeredItemName: 'USB Drive with Scans',
    originalPrice: 20,
    headline: 'Get Your Scans on USB Too',
    subheadline: '16GB USB drive with all images and videos - £20',
  },
  {
    id: 9,
    name: 'Inactive Upsell Example',
    description: 'This upsell is not active',
    active: false,
    priority: 1,
    conditions: [
      {
        triggerType: 'service_selected',
      },
    ],
    offerType: 'addon',
    placement: ['pre_payment'],
    offeredItemType: 'product',
    offeredItemId: 1,
    offeredItemName: 'Test Product',
    headline: 'Inactive Upsell',
  },
];

// Payment Plans
export const mockPaymentPlans: PaymentPlan[] = [
  {
    id: 1,
    name: 'Pay in 2 (Half Now, Half Later)',
    type: 'half_now_half_later',
    description: 'Split your payment into 2 equal installments',
    installmentCount: 2,
    minCartValue: 100,
    active: true,
  },
  {
    id: 2,
    name: '3-Month Payment Plan',
    type: 'three_pay',
    description: 'Spread your payment over 3 months',
    installmentCount: 3,
    minCartValue: 150,
    processingFeePercentage: 3,
    active: true,
  },
  {
    id: 3,
    name: '6-Month Payment Plan',
    type: 'six_pay',
    description: 'Spread your payment over 6 months with a small processing fee',
    installmentCount: 6,
    minCartValue: 300,
    processingFeePercentage: 5,
    active: true,
  },
  {
    id: 4,
    name: 'Inactive Plan Example',
    type: 'custom',
    description: 'This plan is inactive',
    installmentCount: 4,
    active: false,
  },
];

// Scaled Offers (Lite Versions)
export const mockScaledOffers: ScaledOffer[] = [
  {
    id: 1,
    name: 'Essential Prenatal Scan',
    description: 'Basic prenatal scan with essential measurements',
    originalItemType: 'service',
    originalItemId: 0,
    originalItemName: 'Prenatal Scan (20wk)',
    reducedPrice: 85,
    removedFeatures: [
      '4D imaging',
      'Gender reveal ceremony',
      'Printed photos (reduced to 2)',
      'Video recording',
    ],
    active: true,
  },
  {
    id: 2,
    name: 'Basic Print Package',
    description: 'Essential printed photos without extras',
    originalItemType: 'bundle',
    originalItemId: 1,
    originalItemName: 'Premium Print Bundle',
    reducedPrice: 20,
    removedFeatures: [
      'Photo album',
      'Canvas print',
      'Digital copies',
    ],
    active: true,
  },
  {
    id: 3,
    name: 'Standard Ultrasound',
    description: 'Standard ultrasound without premium features',
    originalItemType: 'service',
    originalItemId: 1,
    originalItemName: 'Premium Ultrasound Package',
    reducedPrice: 95,
    removedFeatures: [
      'Extended session time',
      'Multiple angle views',
      'HD video recording',
      'Same-day digital delivery',
    ],
    active: true,
  },
];

// Downsell Rules
export const mockDownsellRules: DownsellRule[] = [
  {
    id: 1,
    name: 'Payment Plan for High Cart Values',
    description: 'Offer payment plan when cart is over £150',
    active: true,
    priority: 10,
    conditions: [
      {
        triggerType: 'checkout_hesitation',
        minCartValue: 150,
      },
    ],
    offerType: 'payment_plan',
    paymentPlanId: 2, // 3-Month Payment Plan
    headline: 'Spread the cost over 3 months',
    subheadline: 'Pay in comfortable installments with no interest',
  },
  {
    id: 2,
    name: 'Essential Scan After Premium Decline',
    description: 'Offer essential scan when premium prenatal is declined',
    active: true,
    priority: 9,
    conditions: [
      {
        triggerType: 'upsell_declined',
        declinedItemType: 'service',
      },
    ],
    offerType: 'scaled_offer',
    scaledOfferId: 1, // Essential Prenatal Scan
    headline: 'Still want essential measurements?',
    subheadline: 'Get the basics at a lower price',
    onlyShowOnce: true,
  },
  {
    id: 3,
    name: 'Half Now Half Later for Medium Carts',
    description: 'Offer split payment for carts £100-£200',
    active: true,
    priority: 8,
    conditions: [
      {
        triggerType: 'checkout_hesitation',
        minCartValue: 100,
      },
    ],
    offerType: 'payment_plan',
    paymentPlanId: 1, // Half Now Half Later
    headline: 'Pay half now, half in 30 days',
    subheadline: 'Make it easier with our split payment option',
  },
  {
    id: 4,
    name: 'Basic Print Package After Bundle Decline',
    description: 'Offer basic prints when premium bundle is declined',
    active: true,
    priority: 7,
    conditions: [
      {
        triggerType: 'upsell_declined',
        declinedItemType: 'bundle',
      },
    ],
    offerType: 'scaled_offer',
    scaledOfferId: 2, // Basic Print Package
    headline: 'How about essential prints?',
    subheadline: 'Get beautiful photos without the extras',
    onlyShowOnce: true,
  },
  {
    id: 5,
    name: 'Trial Credit for Future Upgrade',
    description: 'Offer credit toward future package upgrade',
    active: true,
    priority: 6,
    conditions: [
      {
        triggerType: 'upsell_declined',
        declinedItemType: 'bundle',
      },
    ],
    offerType: 'trial_credit',
    trialCreditAmount: 20,
    trialCreditDescription: 'Book a single scan now and get £20 credit toward any package upgrade within 3 months',
    headline: 'Get £20 credit for future upgrades',
    subheadline: 'Try a single scan today, upgrade to a package later with credit applied',
  },
  {
    id: 6,
    name: '6-Month Plan for Large Purchases',
    description: 'Offer extended payment plan for carts over £300',
    active: true,
    priority: 9,
    conditions: [
      {
        triggerType: 'cart_value_threshold',
        minCartValue: 300,
      },
    ],
    offerType: 'payment_plan',
    paymentPlanId: 3, // 6-Month Payment Plan
    headline: 'Spread payments over 6 months',
    subheadline: 'Small monthly payments make it more affordable',
  },
];

export const mockUpgradeCredits: UpgradeCredit[] = [];
