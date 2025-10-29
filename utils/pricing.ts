import { Bundle, BXGYRule, Product, ClinicService, AppliedDiscount, CartBundle, BundleItem, AppointmentProduct } from '../types';

interface CartItem {
  type: 'service' | 'product';
  id: number;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}

/**
 * Calculate the price of a bundle
 */
export const calculateBundlePrice = (
  bundle: Bundle,
  products: Product[],
  services: ClinicService[]
): { originalPrice: number; finalPrice: number; savings: number } => {
  // Calculate original total
  let originalPrice = 0;

  bundle.items.forEach(item => {
    if (item.type === 'product') {
      const product = products.find(p => p.id === item.id);
      if (product) {
        originalPrice += product.price * item.quantity;
      }
    } else if (item.type === 'service') {
      const service = services.find(s => s.name === item.name);
      if (service) {
        const servicePrice = parseFloat(service.price.replace(/[^0-9.]/g, ''));
        originalPrice += servicePrice * item.quantity;
      }
    }
  });

  // Calculate final price
  let finalPrice = originalPrice;

  if (bundle.finalPrice !== undefined) {
    // Use override price
    finalPrice = bundle.finalPrice;
  } else if (bundle.discountType === 'percentage') {
    finalPrice = originalPrice * (1 - bundle.discountValue / 100);
  } else if (bundle.discountType === 'fixed') {
    finalPrice = Math.max(0, originalPrice - bundle.discountValue);
  }

  const savings = originalPrice - finalPrice;

  return { originalPrice, finalPrice, savings };
};

/**
 * Check if a BXGY rule applies to the current cart
 */
export const checkBXGYEligibility = (
  rule: BXGYRule,
  cartItems: CartItem[]
): boolean => {
  if (!rule.active) return false;

  // Count qualifying items
  const qualifyingItems = cartItems.filter(item => {
    if (rule.buyItemType !== 'any' && item.type !== rule.buyItemType) {
      return false;
    }

    if (rule.buyItemId !== undefined && item.id !== rule.buyItemId) {
      return false;
    }

    if (rule.buyCategory && item.category !== rule.buyCategory) {
      return false;
    }

    return true;
  });

  const totalQualifyingQuantity = qualifyingItems.reduce((sum, item) => sum + item.quantity, 0);

  // For same_item, we need at least buyQuantity + getQuantity of the same item
  if (rule.targetType === 'same_item') {
    return totalQualifyingQuantity >= rule.buyQuantity + rule.getQuantity;
  }

  // For other types, just need buyQuantity
  return totalQualifyingQuantity >= rule.buyQuantity;
};

/**
 * Apply BXGY rule and calculate discount
 */
export const applyBXGYRule = (
  rule: BXGYRule,
  cartItems: CartItem[]
): AppliedDiscount | null => {
  if (!checkBXGYEligibility(rule, cartItems)) {
    return null;
  }

  let discountAmount = 0;
  const affectedItems: string[] = [];

  if (rule.targetType === 'same_item') {
    // Apply discount to the cheapest qualifying items
    const qualifyingItems = cartItems.filter(item => {
      if (rule.buyItemType !== 'any' && item.type !== rule.buyItemType) return false;
      if (rule.buyItemId !== undefined && item.id !== rule.buyItemId) return false;
      if (rule.buyCategory && item.category !== rule.buyCategory) return false;
      return true;
    });

    // Sort by price (cheapest first)
    const sortedItems = [...qualifyingItems].sort((a, b) => a.price - b.price);

    let remainingGetQuantity = rule.getQuantity;
    for (const item of sortedItems) {
      if (remainingGetQuantity <= 0) break;

      const quantityToDiscount = Math.min(remainingGetQuantity, item.quantity);

      if (rule.ruleType === 'free_item') {
        discountAmount += item.price * quantityToDiscount;
      } else if (rule.ruleType === 'percentage_discount' && rule.discountValue) {
        discountAmount += item.price * quantityToDiscount * (rule.discountValue / 100);
      } else if (rule.ruleType === 'fixed_discount' && rule.discountValue) {
        discountAmount += rule.discountValue * quantityToDiscount;
      }

      affectedItems.push(`${item.name} (×${quantityToDiscount})`);
      remainingGetQuantity -= quantityToDiscount;
    }
  } else if (rule.targetType === 'specific_item') {
    // Find the specific item to discount
    const targetItem = cartItems.find(item =>
      item.type === rule.getItemType && item.id === rule.getItemId
    );

    if (targetItem) {
      const quantityToDiscount = Math.min(rule.getQuantity, targetItem.quantity);

      if (rule.ruleType === 'free_item') {
        discountAmount = targetItem.price * quantityToDiscount;
      } else if (rule.ruleType === 'percentage_discount' && rule.discountValue) {
        discountAmount = targetItem.price * quantityToDiscount * (rule.discountValue / 100);
      } else if (rule.ruleType === 'fixed_discount' && rule.discountValue) {
        discountAmount = rule.discountValue * quantityToDiscount;
      }

      affectedItems.push(`${targetItem.name} (×${quantityToDiscount})`);
    }
  } else if (rule.targetType === 'category') {
    // Apply to items in the category
    const categoryItems = cartItems.filter(item =>
      item.category === rule.getCategory
    ).sort((a, b) => a.price - b.price); // Cheapest first

    let remainingGetQuantity = rule.getQuantity;
    for (const item of categoryItems) {
      if (remainingGetQuantity <= 0) break;

      const quantityToDiscount = Math.min(remainingGetQuantity, item.quantity);

      if (rule.ruleType === 'free_item') {
        discountAmount += item.price * quantityToDiscount;
      } else if (rule.ruleType === 'percentage_discount' && rule.discountValue) {
        discountAmount += item.price * quantityToDiscount * (rule.discountValue / 100);
      } else if (rule.ruleType === 'fixed_discount' && rule.discountValue) {
        discountAmount += rule.discountValue * quantityToDiscount;
      }

      affectedItems.push(`${item.name} (×${quantityToDiscount})`);
      remainingGetQuantity -= quantityToDiscount;
    }
  }

  if (discountAmount <= 0) return null;

  return {
    type: 'bxgy',
    id: rule.id,
    name: rule.name,
    description: rule.description,
    discountAmount,
    affectedItems,
  };
};

/**
 * Calculate all applicable BXGY discounts for a cart
 */
export const calculateBXGYDiscounts = (
  cartItems: CartItem[],
  rules: BXGYRule[]
): AppliedDiscount[] => {
  const appliedDiscounts: AppliedDiscount[] = [];

  // Only apply active rules
  const activeRules = rules.filter(r => r.active);

  for (const rule of activeRules) {
    const discount = applyBXGYRule(rule, cartItems);
    if (discount) {
      appliedDiscounts.push(discount);
    }
  }

  return appliedDiscounts;
};

/**
 * Convert selected products to cart items
 */
export const convertProductsToCartItems = (
  products: Product[],
  selectedProducts: Map<number, number>
): CartItem[] => {
  const cartItems: CartItem[] = [];

  selectedProducts.forEach((quantity, productId) => {
    const product = products.find(p => p.id === productId);
    if (product && quantity > 0) {
      cartItems.push({
        type: 'product',
        id: product.id,
        name: product.name,
        price: product.price,
        quantity,
        category: product.category,
      });
    }
  });

  return cartItems;
};

/**
 * Add service to cart items
 */
export const addServiceToCartItems = (
  cartItems: CartItem[],
  service: ClinicService,
  serviceId: number
): CartItem[] => {
  const servicePrice = parseFloat(service.price.replace(/[^0-9.]/g, ''));

  return [
    ...cartItems,
    {
      type: 'service',
      id: serviceId,
      name: service.name,
      price: servicePrice,
      quantity: 1,
      category: 'Services',
    },
  ];
};
