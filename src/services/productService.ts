import type { Database, InventoryItem, Product, ProductCategory, ProductListing, ProductType } from '@/types';
import { getDb } from './db';
import { request, ServiceError } from './api';
import { roadDistanceKm, round1 } from '@/utils/geo';

export interface ProductSearchFilters {
  query?: string;
  category?: ProductCategory | 'all';
  productType?: ProductType | 'all';
  pharmacyId?: string | 'all';
  availability?: 'all' | 'in-stock';
  prescription?: 'all' | 'otc' | 'rx';
  maxPrice?: number;
  sort?: 'relevance' | 'price-asc' | 'price-desc' | 'distance';
  serviceAreaId?: string;
}

/** A product with its best marketplace listing (lowest price in stock) and all listings. */
export interface ProductSummary {
  product: Product;
  listings: ProductListing[];
  best: ProductListing | null;
  minPrice: number | null;
  inStock: boolean;
  relevance: number;
}

function activePharmacyIds(db: Database) {
  return new Set(db.pharmacies.filter((p) => p.verification === 'verified' && p.acceptingOrders).map((p) => p.id));
}

export function listingsFor(db: Database, productId: string, serviceAreaId?: string): ProductListing[] {
  const product = db.products.find((p) => p.id === productId);
  if (!product) return [];
  const active = activePharmacyIds(db);
  const area = serviceAreaId ? db.serviceAreas.find((a) => a.id === serviceAreaId) : undefined;
  return db.inventory
    .filter((i) => i.productId === productId && active.has(i.pharmacyId))
    .map((inventory) => {
      const ph = db.pharmacies.find((p) => p.id === inventory.pharmacyId)!;
      return { product, inventory, pharmacyName: ph.name, distanceKm: area ? round1(roadDistanceKm(ph, area)) : undefined };
    })
    .sort((a, b) => Number(isListingInStock(b.inventory)) - Number(isListingInStock(a.inventory)) || (a.distanceKm ?? 0) - (b.distanceKm ?? 0) || a.inventory.price - b.inventory.price);
}

export function isListingInStock(inv: InventoryItem) {
  return inv.available && inv.stock > 0;
}

function relevanceScore(p: Product, q: string): number {
  if (!q) return 0;
  const name = p.name.toLowerCase();
  const hay = [p.name, p.genericName, p.strength, p.dosageForm, p.category, p.productType].filter(Boolean).join(' ').toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  const terms = q.split(/\s+/).filter(Boolean);
  const hits = terms.filter((t) => hay.includes(t)).length;
  return hits === terms.length ? 40 + hits : hits > 0 ? 10 + hits : 0;
}

export function searchProductsSync(db: Database, filters: ProductSearchFilters = {}): ProductSummary[] {
  const q = (filters.query ?? '').trim().toLowerCase();
  const results: ProductSummary[] = [];
  for (const product of db.products) {
    if (filters.category && filters.category !== 'all' && product.category !== filters.category) continue;
    if (filters.productType && filters.productType !== 'all' && product.productType !== filters.productType) continue;
    if (filters.prescription === 'otc' && product.requiresPrescription) continue;
    if (filters.prescription === 'rx' && !product.requiresPrescription) continue;
    const relevance = relevanceScore(product, q);
    if (q && relevance === 0) continue;
    let listings = listingsFor(db, product.id, filters.serviceAreaId);
    if (filters.pharmacyId && filters.pharmacyId !== 'all') listings = listings.filter((l) => l.inventory.pharmacyId === filters.pharmacyId);
    if (listings.length === 0) continue;
    const inStockListings = listings.filter((l) => isListingInStock(l.inventory));
    if (filters.availability === 'in-stock' && inStockListings.length === 0) continue;
    const pool = inStockListings.length ? inStockListings : listings;
    const best = [...pool].sort((a, b) => a.inventory.price - b.inventory.price)[0] ?? null;
    const minPrice = best?.inventory.price ?? null;
    if (filters.maxPrice != null && minPrice != null && minPrice > filters.maxPrice) continue;
    results.push({ product, listings, best, minPrice, inStock: inStockListings.length > 0, relevance });
  }
  const sort = filters.sort ?? 'relevance';
  results.sort((a, b) => {
    if (sort === 'price-asc') return (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity);
    if (sort === 'price-desc') return (b.minPrice ?? 0) - (a.minPrice ?? 0);
    if (sort === 'distance') return (a.best?.distanceKm ?? 99) - (b.best?.distanceKm ?? 99);
    return b.relevance - a.relevance || Number(b.inStock) - Number(a.inStock) || a.product.name.localeCompare(b.product.name);
  });
  return results;
}

export const productService = {
  getProducts(): Promise<Product[]> {
    return request(() => getDb().products);
  },
  searchProducts(filters: ProductSearchFilters): Promise<ProductSummary[]> {
    return request(() => searchProductsSync(getDb(), filters), { delay: 250 });
  },
  getProduct(id: string, serviceAreaId?: string): Promise<{ product: Product; listings: ProductListing[] }> {
    return request(() => {
      const db = getDb();
      const product = db.products.find((p) => p.id === id);
      if (!product) throw new ServiceError('NOT_FOUND', 'This product could not be found.');
      return { product, listings: listingsFor(db, id, serviceAreaId) };
    });
  },
};
