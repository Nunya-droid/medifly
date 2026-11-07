import type { InventoryItem, Product } from '@/types';

const GENERAL = 'General product information for the demo catalogue only. It is not medical advice — follow the label and ask a pharmacist or doctor about whether this product is right for you.';
const RX = 'Prescription-only in this demo. A pharmacist must review a valid prescription before this item can be supplied or dispatched. Product information is illustrative, not medical advice.';

type P = Omit<Product, 'createdAt' | 'description'> & { description?: string };

const products: P[] = [
  { id: 'prd-paracetamol', name: 'Paracetamol', strength: '500 mg', dosageForm: 'Tablets', packSize: '20 tablets', category: 'pain-fever', productType: 'medicine', requiresPrescription: false, handling: 'standard', weightKg: 0.05, droneSuitable: true, visual: 'tablet' },
  { id: 'prd-ibuprofen', name: 'Ibuprofen', strength: '200 mg', dosageForm: 'Tablets', packSize: '24 tablets', category: 'pain-fever', productType: 'medicine', requiresPrescription: false, handling: 'standard', weightKg: 0.05, droneSuitable: true, visual: 'tablet' },
  { id: 'prd-vitamin-c', name: 'Vitamin C', strength: '1000 mg', dosageForm: 'Effervescent tablets', packSize: '30 tablets', category: 'vitamins', productType: 'supplement', requiresPrescription: false, handling: 'standard', weightKg: 0.12, droneSuitable: true, visual: 'bottle' },
  { id: 'prd-multivitamin', name: 'Daily Multivitamin', dosageForm: 'Tablets', packSize: '60 tablets', category: 'vitamins', productType: 'supplement', requiresPrescription: false, handling: 'standard', weightKg: 0.15, droneSuitable: true, visual: 'bottle' },
  { id: 'prd-zinc', name: 'Zinc', strength: '20 mg', dosageForm: 'Dispersible tablets', packSize: '10 tablets', category: 'vitamins', productType: 'supplement', requiresPrescription: false, handling: 'standard', weightKg: 0.03, droneSuitable: true, visual: 'tablet' },
  { id: 'prd-ors', name: 'Oral Rehydration Salts', genericName: 'ORS', dosageForm: 'Sachets', packSize: '10 sachets', category: 'digestive', productType: 'medicine', requiresPrescription: false, handling: 'standard', weightKg: 0.2, droneSuitable: true, visual: 'sachet' },
  { id: 'prd-antacid', name: 'Antacid Suspension', dosageForm: 'Oral suspension', packSize: '200 ml', category: 'digestive', productType: 'medicine', requiresPrescription: false, handling: 'standard', weightKg: 0.3, droneSuitable: true, visual: 'bottle' },
  { id: 'prd-first-aid-kit', name: 'Home First-Aid Kit', dosageForm: 'Kit', packSize: '42 pieces', category: 'first-aid', productType: 'first-aid', requiresPrescription: false, handling: 'standard', weightKg: 0.9, droneSuitable: true, visual: 'kit' },
  { id: 'prd-bandages', name: 'Adhesive Bandages', dosageForm: 'Assorted strips', packSize: '40 strips', category: 'first-aid', productType: 'first-aid', requiresPrescription: false, handling: 'standard', weightKg: 0.06, droneSuitable: true, visual: 'box' },
  { id: 'prd-antiseptic', name: 'Antiseptic Solution', dosageForm: 'Liquid', packSize: '250 ml', category: 'first-aid', productType: 'first-aid', requiresPrescription: false, handling: 'standard', weightKg: 0.3, droneSuitable: true, visual: 'bottle' },
  { id: 'prd-thermometer', name: 'Digital Thermometer', dosageForm: 'Device', packSize: '1 unit', category: 'devices', productType: 'device', requiresPrescription: false, handling: 'standard', weightKg: 0.05, droneSuitable: true, visual: 'device' },
  { id: 'prd-bp-monitor', name: 'Upper-Arm Blood Pressure Monitor', dosageForm: 'Device', packSize: '1 unit', category: 'devices', productType: 'device', requiresPrescription: false, handling: 'fragile', weightKg: 1.3, droneSuitable: false, visual: 'device' },
  { id: 'prd-glucose-strips', name: 'Glucose Test Strips', dosageForm: 'Test strips', packSize: '50 strips', category: 'devices', productType: 'device', requiresPrescription: false, handling: 'standard', weightKg: 0.08, droneSuitable: true, visual: 'box' },
  { id: 'prd-amoxicillin', name: 'Amoxicillin', strength: '500 mg', dosageForm: 'Capsules', packSize: '21 capsules', category: 'antibiotics', productType: 'medicine', requiresPrescription: true, handling: 'standard', weightKg: 0.05, droneSuitable: false, visual: 'capsule' },
  { id: 'prd-metformin', name: 'Metformin', strength: '500 mg', dosageForm: 'Tablets', packSize: '56 tablets', category: 'chronic-care', productType: 'medicine', requiresPrescription: true, handling: 'standard', weightKg: 0.08, droneSuitable: false, visual: 'tablet' },
  { id: 'prd-amlodipine', name: 'Amlodipine', strength: '5 mg', dosageForm: 'Tablets', packSize: '28 tablets', category: 'chronic-care', productType: 'medicine', requiresPrescription: true, handling: 'standard', weightKg: 0.04, droneSuitable: false, visual: 'tablet' },
  { id: 'prd-insulin', name: 'Insulin Glargine Pen', strength: '100 units/ml', dosageForm: 'Pre-filled pen', packSize: '5 × 3 ml pens', category: 'chronic-care', productType: 'medicine', requiresPrescription: true, handling: 'cold-chain', weightKg: 0.25, droneSuitable: false, visual: 'pen' },
  { id: 'prd-salbutamol', name: 'Salbutamol Inhaler', strength: '100 mcg/dose', dosageForm: 'Inhaler', packSize: '200 doses', category: 'respiratory', productType: 'medicine', requiresPrescription: true, handling: 'standard', weightKg: 0.06, droneSuitable: false, visual: 'inhaler' },
  { id: 'prd-cough-syrup', name: 'Glycerin Cough Syrup', dosageForm: 'Syrup', packSize: '100 ml', category: 'respiratory', productType: 'medicine', requiresPrescription: false, handling: 'standard', weightKg: 0.18, droneSuitable: true, visual: 'bottle' },
  { id: 'prd-saline-spray', name: 'Saline Nasal Spray', dosageForm: 'Nasal spray', packSize: '30 ml', category: 'respiratory', productType: 'medicine', requiresPrescription: false, handling: 'standard', weightKg: 0.05, droneSuitable: true, visual: 'bottle' },
  { id: 'prd-sanitiser', name: 'Hand Sanitiser', dosageForm: 'Gel', packSize: '500 ml', category: 'personal-care', productType: 'personal-care', requiresPrescription: false, handling: 'standard', weightKg: 0.55, droneSuitable: true, visual: 'bottle' },
  { id: 'prd-masks', name: 'Disposable Face Masks', dosageForm: '3-ply masks', packSize: '50 masks', category: 'personal-care', productType: 'personal-care', requiresPrescription: false, handling: 'standard', weightKg: 0.25, droneSuitable: true, visual: 'box' },
  { id: 'prd-nappy-cream', name: 'Baby Barrier Cream', dosageForm: 'Cream', packSize: '100 g', category: 'mother-baby', productType: 'personal-care', requiresPrescription: false, handling: 'standard', weightKg: 0.12, droneSuitable: true, visual: 'tube' },
];

export function seedProducts(now: number): Product[] {
  const created = new Date(now - 200 * 86400000).toISOString();
  return products.map((p) => ({ ...p, description: p.description ?? (p.requiresPrescription ? RX : GENERAL), createdAt: created }));
}

/** Base demo prices in GH₵. Each pharmacy applies a small, fixed adjustment. */
export const BASE_PRICES: Record<string, number> = {
  'prd-paracetamol': 8,
  'prd-ibuprofen': 12,
  'prd-vitamin-c': 22,
  'prd-multivitamin': 45,
  'prd-zinc': 10,
  'prd-ors': 5,
  'prd-antacid': 18,
  'prd-first-aid-kit': 85,
  'prd-bandages': 15,
  'prd-antiseptic': 25,
  'prd-thermometer': 40,
  'prd-bp-monitor': 320,
  'prd-glucose-strips': 120,
  'prd-amoxicillin': 28,
  'prd-metformin': 35,
  'prd-amlodipine': 30,
  'prd-insulin': 380,
  'prd-salbutamol': 55,
  'prd-cough-syrup': 20,
  'prd-saline-spray': 26,
  'prd-sanitiser': 30,
  'prd-masks': 35,
  'prd-nappy-cream': 32,
};

/** Which products each pharmacy carries, with price multiplier and stock pattern. */
const CARRIES: Record<string, { factor: number; skip: string[]; low: string[]; out: string[] }> = {
  'ph-community': { factor: 1, skip: ['prd-bp-monitor'], low: ['prd-amoxicillin', 'prd-thermometer'], out: ['prd-saline-spray'] },
  'ph-madina-care': { factor: 1.05, skip: ['prd-insulin', 'prd-nappy-cream'], low: ['prd-ors'], out: [] },
  'ph-east-legon': { factor: 1.12, skip: [], low: ['prd-insulin'], out: ['prd-zinc'] },
  'ph-adenta': { factor: 0.97, skip: ['prd-glucose-strips', 'prd-salbutamol', 'prd-bp-monitor'], low: [], out: ['prd-multivitamin'] },
  'ph-airport': { factor: 1.15, skip: ['prd-zinc', 'prd-ors'], low: ['prd-masks'], out: [] },
  'ph-osu-wellness': { factor: 1.08, skip: ['prd-insulin', 'prd-metformin', 'prd-amlodipine'], low: [], out: [] },
};

export function seedInventory(now: number): InventoryItem[] {
  const updated = new Date(now - 2 * 86400000).toISOString();
  const items: InventoryItem[] = [];
  let i = 0;
  for (const [pharmacyId, cfg] of Object.entries(CARRIES)) {
    for (const p of products) {
      if (cfg.skip.includes(p.id)) continue;
      i++;
      const base = BASE_PRICES[p.id];
      const price = Math.round(base * cfg.factor * 2) / 2;
      const isLow = cfg.low.includes(p.id);
      const isOut = cfg.out.includes(p.id);
      // Deterministic stock between 18 and 140.
      const stock = isOut ? 0 : isLow ? 3 + (i % 3) : 18 + ((i * 37) % 120);
      items.push({ id: `inv-${pharmacyId.slice(3)}-${p.id.slice(4)}`, pharmacyId, productId: p.id, stock, price, available: !isOut, lowStockThreshold: 8, updatedAt: updated });
    }
  }
  return items;
}
