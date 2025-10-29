import { UpsellRule, UpsellSuggestion, UpsellPlacement, Product, Bundle, ClinicService } from '../types';

interface CartContext {
  selectedService?: {
    id: number;
    name: string;
    price: number;
  };
  selectedProducts: Map<number, number>; // productId -> quantity
  selectedBundles: number[]; // bundle IDs
  cartValue: number;
}

/**
 * Check if a condition matches the current cart context
 */
const checkCondition = (
  condition: UpsellRule['conditions'][0],
  context: CartContext,
  products: Product[]
): boolean => {
  switch (condition.triggerType) {
    case 'service_selected':
      if (!context.selectedService) return false;
      if (condition.serviceId && context.selectedService.id !== condition.serviceId) {
        return false;
      }
      if (condition.serviceName && context.selectedService.name !== condition.serviceName) {
        return false;
      }
      return true;

    case 'product_selected':
      if (condition.productId) {
        return context.selectedProducts.has(condition.productId);
      }
      return context.selectedProducts.size > 0;

    case 'category_selected':
      if (!condition.productCategory) return false;
      // Check if any selected product is in the category
      for (const [productId] of context.selectedProducts) {
        const product = products.find(p => p.id === productId);
        if (product && product.category === condition.productCategory) {
          return true;
        }
      }
      return false;

    case 'bundle_selected':
      if (condition.bundleId) {
        return context.selectedBundles.includes(condition.bundleId);
      }
      return context.selectedBundles.length > 0;

    case 'cart_value':
      if (condition.minCartValue) {
        return context.cartValue >= condition.minCartValue;
      }
      return true;

    default:
      return false;
  }
};

/**
 * Check if an upsell rule is eligible given the current context
 */
const isRuleEligible = (
  rule: UpsellRule,
  context: CartContext,
  placement: UpsellPlacement,
  products: Product[],
  shownRulesInSession: Map<number, number> // ruleId -> show count
): boolean => {
  // Must be active
  if (!rule.active) return false;

  // Must be appropriate for current placement
  if (!rule.placement.includes(placement)) return false;

  // Check max displays
  if (rule.maxDisplaysPerSession) {
    const showCount = shownRulesInSession.get(rule.id) || 0;
    if (showCount >= rule.maxDisplaysPerSession) return false;
  }

  // Check only show once
  if (rule.onlyShowOnce && shownRulesInSession.has(rule.id)) {
    return false;
  }

  // Check if item is already in cart
  if (rule.offeredItemType === 'product') {
    if (context.selectedProducts.has(rule.offeredItemId)) {
      // For quantity bump, allow if they have less than 2
      if (rule.offerType === 'quantity_bump') {
        const quantity = context.selectedProducts.get(rule.offeredItemId) || 0;
        if (quantity >= 2) return false;
      } else {
        return false; // Don't suggest items already in cart
      }
    }
  } else if (rule.offeredItemType === 'bundle') {
    if (context.selectedBundles.includes(rule.offeredItemId)) {
      return false; // Don't suggest bundles already selected
    }
  }

  // All conditions must match (AND logic)
  return rule.conditions.every(condition => checkCondition(condition, context, products));
};

/**
 * Calculate upsell price
 */
const calculateUpsellPrice = (
  rule: UpsellRule,
  products: Product[],
  bundles: Bundle[],
  services: ClinicService[]
): { originalPrice: number; finalPrice: number; savings?: number; incrementalPrice?: number } => {
  let originalPrice = rule.originalPrice || 0;
  let finalPrice = originalPrice;

  // Get actual item price if not specified
  if (rule.offeredItemType === 'product') {
    const product = products.find(p => p.id === rule.offeredItemId);
    if (product && !rule.originalPrice) {
      originalPrice = product.price;
      finalPrice = product.price;
    }
  } else if (rule.offeredItemType === 'bundle') {
    const bundle = bundles.find(b => b.id === rule.offeredItemId);
    if (bundle) {
      // Calculate bundle price
      let bundleOriginal = 0;
      bundle.items.forEach(item => {
        if (item.type === 'product') {
          const product = products.find(p => p.id === item.id);
          if (product) bundleOriginal += product.price * item.quantity;
        } else if (item.type === 'service') {
          const service = services.find(s => s.name === item.name);
          if (service) {
            const price = parseFloat(service.price.replace(/[^0-9.]/g, ''));
            bundleOriginal += price * item.quantity;
          }
        }
      });

      if (bundle.finalPrice !== undefined) {
        originalPrice = bundleOriginal;
        finalPrice = bundle.finalPrice;
      } else if (bundle.discountType === 'percentage') {
        originalPrice = bundleOriginal;
        finalPrice = bundleOriginal * (1 - bundle.discountValue / 100);
      } else if (bundle.discountType === 'fixed') {
        originalPrice = bundleOriginal;
        finalPrice = Math.max(0, bundleOriginal - bundle.discountValue);
      }
    }
  }

  // Apply upsell-specific discount
  if (rule.discountedPrice !== undefined) {
    finalPrice = rule.discountedPrice;
  } else if (rule.discountPercentage) {
    finalPrice = originalPrice * (1 - rule.discountPercentage / 100);
  }

  const savings = originalPrice > finalPrice ? originalPrice - finalPrice : undefined;

  return {
    originalPrice,
    finalPrice,
    savings,
    incrementalPrice: rule.incrementalPrice,
  };
};

/**
 * Evaluate all upsell rules and return eligible suggestions
 */
export const evaluateUpsells = (
  rules: UpsellRule[],
  context: CartContext,
  placement: UpsellPlacement,
  products: Product[],
  bundles: Bundle[],
  services: ClinicService[],
  shownRulesInSession: Map<number, number> = new Map()
): UpsellSuggestion[] => {
  // Filter eligible rules
  const eligibleRules = rules.filter(rule =>
    isRuleEligible(rule, context, placement, products, shownRulesInSession)
  );

  // Sort by priority (higher first)
  eligibleRules.sort((a, b) => b.priority - a.priority);

  // Limit to top 2 suggestions to avoid overwhelming
  const topRules = eligibleRules.slice(0, 2);

  // Convert to suggestions
  return topRules.map(rule => {
    const pricing = calculateUpsellPrice(rule, products, bundles, services);

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      itemType: rule.offeredItemType,
      itemId: rule.offeredItemId,
      itemName: rule.offeredItemName,
      headline: rule.headline,
      subheadline: rule.subheadline,
      badge: rule.badge,
      originalPrice: pricing.originalPrice,
      finalPrice: pricing.finalPrice,
      savings: pricing.savings,
      incrementalPrice: pricing.incrementalPrice,
      placement,
    };
  });
};

/**
 * Build cart context from booking modal state
 */
export const buildCartContext = (
  selectedService: { id: number; name: string; price: number } | null,
  selectedProducts: Map<number, number>,
  selectedBundles: number[],
  products: Product[]
): CartContext => {
  let cartValue = 0;

  // Add service price
  if (selectedService) {
    cartValue += selectedService.price;
  }

  // Add product prices
  selectedProducts.forEach((quantity, productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      cartValue += product.price * quantity;
    }
  });

  // Note: We're not calculating bundle prices here for simplicity
  // In a real implementation, you'd include bundle discounted prices

  return {
    selectedService: selectedService || undefined,
    selectedProducts,
    selectedBundles,
    cartValue,
  };
};
