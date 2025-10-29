import { ClinicService, Product } from '../types';

/**
 * Result of a product import operation
 */
export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  inactivated: number;
  errors: string[];
}

/**
 * Pending import item for review
 */
export interface PendingImport {
  id: string; // Temporary ID for UI
  scrapedService: ClinicService;
  suggestedProduct: Partial<Product>;
  action: 'create' | 'update' | 'skip';
  existingProductId?: number;
  reason?: string;
}

/**
 * Import metadata stored with sync history
 */
export interface ImportMetadata {
  syncDate: string;
  sourceUrl: string;
  servicesCount: number;
  importResult?: ImportResult;
}

/**
 * Parse price string to number (handles £, $, €, commas)
 * Returns null if price cannot be parsed
 */
export function parsePrice(priceStr: string | undefined): number | null {
  if (!priceStr) return null;

  // Remove currency symbols, whitespace, and commas
  const cleaned = priceStr
    .replace(/[£$€\s,]/g, '')
    .trim();

  // Try to parse as float
  const parsed = parseFloat(cleaned);

  // Validate it's a valid positive number
  if (isNaN(parsed) || parsed < 0) {
    return null;
  }

  // Round to 2 decimal places
  return Math.round(parsed * 100) / 100;
}

/**
 * Generate stable key for duplicate detection
 * Format: normalized-name:price
 */
export function generateProductKey(name: string, price: number): string {
  const normalizedName = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  return `${normalizedName}:${price.toFixed(2)}`;
}

/**
 * Infer category from service name
 */
export function inferCategory(serviceName: string): string {
  const lower = serviceName.toLowerCase();

  // Scan types
  if (lower.includes('scan') || lower.includes('ultrasound') || lower.includes('sonograph')) {
    return 'Scans';
  }

  // Package indicators
  if (lower.includes('package') || lower.includes('bundle')) {
    return 'Packages';
  }

  // Photo/video products
  if (lower.includes('photo') || lower.includes('print') || lower.includes('picture')) {
    return 'Prints';
  }
  if (lower.includes('video') || lower.includes('dvd') || lower.includes('recording')) {
    return 'Video';
  }
  if (lower.includes('digital') || lower.includes('usb')) {
    return 'Digital';
  }

  // Default
  return 'Services';
}

/**
 * Generate description from service name
 */
export function generateDescription(serviceName: string): string {
  const category = inferCategory(serviceName);

  if (category === 'Scans') {
    return `Professional ${serviceName.toLowerCase()} service`;
  }
  if (category === 'Packages') {
    return `Comprehensive package including ${serviceName.toLowerCase()}`;
  }

  return `${serviceName} imported from clinic website`;
}

/**
 * Find matching product by key or name similarity
 */
export function findMatchingProduct(
  scrapedService: ClinicService,
  existingProducts: Product[]
): Product | null {
  const parsedPrice = parsePrice(scrapedService.price);
  if (parsedPrice === null) return null;

  const targetKey = generateProductKey(scrapedService.name, parsedPrice);

  // First try: exact key match
  const exactMatch = existingProducts.find(
    p => generateProductKey(p.name, p.price) === targetKey
  );
  if (exactMatch) return exactMatch;

  // Second try: exact name match (different price = update scenario)
  const nameMatch = existingProducts.find(
    p => p.name.toLowerCase() === scrapedService.name.toLowerCase()
  );
  if (nameMatch) return nameMatch;

  // No match
  return null;
}

/**
 * Convert scraped service to product
 */
export function convertServiceToProduct(
  service: ClinicService,
  nextId: number
): Partial<Product> | null {
  const price = parsePrice(service.price);

  if (price === null) {
    return null; // Invalid price
  }

  const category = inferCategory(service.name);
  const description = generateDescription(service.name);

  return {
    id: nextId,
    name: service.name,
    description,
    price,
    category,
    stockLevel: 0, // Services don't have physical stock
    reorderPoint: 0,
    active: true,
    trackStock: false, // Services don't track inventory
  };
}

/**
 * Prepare import operations for review
 */
export function prepareImportReview(
  scrapedServices: ClinicService[],
  existingProducts: Product[],
  nextId: number
): PendingImport[] {
  const pending: PendingImport[] = [];
  let currentId = nextId;

  for (const service of scrapedServices) {
    const parsedPrice = parsePrice(service.price);

    // Skip if price is invalid
    if (parsedPrice === null) {
      pending.push({
        id: `skip-${Date.now()}-${Math.random()}`,
        scrapedService: service,
        suggestedProduct: {},
        action: 'skip',
        reason: 'Invalid or missing price',
      });
      continue;
    }

    // Check for existing product
    const existing = findMatchingProduct(service, existingProducts);

    if (existing) {
      // Update scenario: name matches but details differ
      const priceChanged = Math.abs(existing.price - parsedPrice) > 0.01;

      pending.push({
        id: `update-${existing.id}`,
        scrapedService: service,
        suggestedProduct: {
          ...existing,
          price: parsedPrice,
          description: existing.description, // Keep existing description
        },
        action: 'update',
        existingProductId: existing.id,
        reason: priceChanged ? 'Price updated' : 'Already exists',
      });
    } else {
      // Create scenario: new product
      const suggested = convertServiceToProduct(service, currentId);

      if (suggested) {
        pending.push({
          id: `create-${currentId}`,
          scrapedService: service,
          suggestedProduct: suggested,
          action: 'create',
        });
        currentId++;
      }
    }
  }

  return pending;
}

/**
 * Execute approved imports and return result summary
 */
export function executeImports(
  approvedImports: PendingImport[],
  existingProducts: Product[],
  scrapedServiceNames: Set<string>
): { products: Product[]; result: ImportResult } {
  const result: ImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    inactivated: 0,
    errors: [],
  };

  // Clone existing products
  let products = [...existingProducts];

  // Track which existing products are still in scraped data
  const activeScrapedKeys = new Set<string>();

  // Process approved imports
  for (const item of approvedImports) {
    try {
      if (item.action === 'create' && item.suggestedProduct) {
        const newProduct = item.suggestedProduct as Product;
        products.push(newProduct);
        result.created++;

        // Track this product
        activeScrapedKeys.add(generateProductKey(newProduct.name, newProduct.price));
      } else if (item.action === 'update' && item.existingProductId) {
        products = products.map(p => {
          if (p.id === item.existingProductId) {
            const updated = { ...p, ...item.suggestedProduct };
            activeScrapedKeys.add(generateProductKey(updated.name, updated.price));
            return updated;
          }
          return p;
        });
        result.updated++;
      } else if (item.action === 'skip') {
        result.skipped++;
      }
    } catch (error) {
      result.errors.push(
        `Failed to import ${item.scrapedService.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Mark products as inactive if they were previously scraped but not in current sync
  // (Only for products that came from scraping - check category = Services, Scans, or Packages)
  const scrapedCategories = ['Services', 'Scans', 'Packages'];

  products = products.map(p => {
    if (
      p.active &&
      scrapedCategories.includes(p.category) &&
      !activeScrapedKeys.has(generateProductKey(p.name, p.price)) &&
      scrapedServiceNames.has(p.name.toLowerCase())
    ) {
      result.inactivated++;
      return { ...p, active: false };
    }
    return p;
  });

  return { products, result };
}

/**
 * Format import result as summary message
 */
export function formatImportSummary(result: ImportResult): string {
  const parts: string[] = [];

  if (result.created > 0) {
    parts.push(`${result.created} created`);
  }
  if (result.updated > 0) {
    parts.push(`${result.updated} updated`);
  }
  if (result.inactivated > 0) {
    parts.push(`${result.inactivated} inactivated`);
  }
  if (result.skipped > 0) {
    parts.push(`${result.skipped} skipped`);
  }

  if (parts.length === 0) {
    return 'No changes made';
  }

  let summary = parts.join(', ');

  if (result.errors.length > 0) {
    summary += ` (${result.errors.length} errors)`;
  }

  return summary;
}
