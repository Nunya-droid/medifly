export type ProductCategory =
  | 'pain-fever'
  | 'vitamins'
  | 'digestive'
  | 'first-aid'
  | 'devices'
  | 'chronic-care'
  | 'antibiotics'
  | 'respiratory'
  | 'personal-care'
  | 'mother-baby';

export type ProductType = 'medicine' | 'supplement' | 'device' | 'first-aid' | 'personal-care';

/** Handling requirement used by the delivery engine. */
export type HandlingRequirement = 'standard' | 'cold-chain' | 'fragile';

export interface Product {
  id: string;
  name: string;
  genericName?: string;
  strength?: string;
  dosageForm: string;
  packSize: string;
  category: ProductCategory;
  productType: ProductType;
  requiresPrescription: boolean;
  handling: HandlingRequirement;
  weightKg: number;
  /** Whether the product passes the simulated drone payload/suitability rules. */
  droneSuitable: boolean;
  description: string;
  /** Illustration hint for the placeholder image. */
  visual: 'tablet' | 'capsule' | 'bottle' | 'sachet' | 'device' | 'kit' | 'tube' | 'inhaler' | 'pen' | 'box';
  createdAt: string;
  /** Created by a pharmacy through inventory management. */
  createdByPharmacyId?: string;
}

export interface InventoryItem {
  id: string;
  pharmacyId: string;
  productId: string;
  stock: number;
  price: number;
  available: boolean;
  lowStockThreshold: number;
  updatedAt: string;
}

/** A product as it appears in the marketplace for one pharmacy. */
export interface ProductListing {
  product: Product;
  inventory: InventoryItem;
  pharmacyName: string;
  distanceKm?: number;
}

export interface CartItem {
  productId: string;
  pharmacyId: string;
  quantity: number;
  addedAt: string;
}
