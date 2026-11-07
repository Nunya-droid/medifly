import type { CartItem, Database, InventoryItem, Product } from '@/types';
import { commit, getDb } from './db';
import { request, ServiceError, nowIso } from './api';

export interface CartLine {
  item: CartItem;
  product: Product;
  inventory: InventoryItem | undefined;
  unitPrice: number;
  lineTotal: number;
  issue?: string;
}

export interface CartGroup {
  pharmacyId: string;
  pharmacyName: string;
  lines: CartLine[];
  subtotal: number;
  requiresPrescription: boolean;
  hasIssues: boolean;
}

export function selectCart(db: Database, userId: string | undefined): CartGroup[] {
  if (!userId) return [];
  const items = db.carts[userId] ?? [];
  const groups = new Map<string, CartGroup>();
  for (const item of items) {
    const product = db.products.find((p) => p.id === item.productId);
    if (!product) continue;
    const inventory = db.inventory.find((i) => i.productId === item.productId && i.pharmacyId === item.pharmacyId);
    const pharmacy = db.pharmacies.find((p) => p.id === item.pharmacyId);
    const unitPrice = inventory?.price ?? 0;
    let issue: string | undefined;
    if (!inventory || !inventory.available || inventory.stock <= 0) issue = 'No longer available at this pharmacy';
    else if (inventory.stock < item.quantity) issue = `Only ${inventory.stock} in stock`;
    const line: CartLine = { item, product, inventory, unitPrice, lineTotal: unitPrice * item.quantity, issue };
    const g = groups.get(item.pharmacyId) ?? { pharmacyId: item.pharmacyId, pharmacyName: pharmacy?.name ?? 'Pharmacy', lines: [], subtotal: 0, requiresPrescription: false, hasIssues: false };
    g.lines.push(line);
    g.subtotal += line.lineTotal;
    g.requiresPrescription ||= product.requiresPrescription;
    g.hasIssues ||= !!issue;
    groups.set(item.pharmacyId, g);
  }
  return [...groups.values()];
}

export function cartCount(db: Database, userId: string | undefined) {
  if (!userId) return 0;
  return (db.carts[userId] ?? []).reduce((s, i) => s + i.quantity, 0);
}

function writeCart(userId: string, items: CartItem[]) {
  const db = getDb();
  commit({ carts: { ...db.carts, [userId]: items } });
}

export const cartService = {
  addItem(userId: string, productId: string, pharmacyId: string, quantity = 1): Promise<void> {
    return request(() => {
      const db = getDb();
      const inv = db.inventory.find((i) => i.productId === productId && i.pharmacyId === pharmacyId);
      if (!inv || !inv.available || inv.stock <= 0) throw new ServiceError('OUT_OF_STOCK', 'This item is currently unavailable at the selected pharmacy.');
      const items = [...(db.carts[userId] ?? [])];
      const existing = items.find((i) => i.productId === productId && i.pharmacyId === pharmacyId);
      const nextQty = (existing?.quantity ?? 0) + quantity;
      if (nextQty > inv.stock) throw new ServiceError('OUT_OF_STOCK', `Only ${inv.stock} available at this pharmacy.`);
      if (nextQty > 10) throw new ServiceError('VALIDATION', 'A maximum of 10 of each item can be ordered in the demo.');
      const next = existing
        ? items.map((i) => (i === existing ? { ...i, quantity: nextQty } : i))
        : [...items, { productId, pharmacyId, quantity, addedAt: nowIso() }];
      writeCart(userId, next);
    }, { delay: 200 });
  },

  setQuantity(userId: string, productId: string, pharmacyId: string, quantity: number): Promise<void> {
    return request(() => {
      const db = getDb();
      const items = db.carts[userId] ?? [];
      if (quantity <= 0) {
        writeCart(userId, items.filter((i) => !(i.productId === productId && i.pharmacyId === pharmacyId)));
        return;
      }
      const inv = db.inventory.find((i) => i.productId === productId && i.pharmacyId === pharmacyId);
      if (inv && quantity > inv.stock) throw new ServiceError('OUT_OF_STOCK', `Only ${inv.stock} available.`);
      if (quantity > 10) throw new ServiceError('VALIDATION', 'A maximum of 10 of each item can be ordered in the demo.');
      writeCart(userId, items.map((i) => (i.productId === productId && i.pharmacyId === pharmacyId ? { ...i, quantity } : i)));
    }, { delay: 80 });
  },

  removeItem(userId: string, productId: string, pharmacyId: string): Promise<void> {
    return this.setQuantity(userId, productId, pharmacyId, 0);
  },

  clearPharmacy(userId: string, pharmacyId: string) {
    const db = getDb();
    writeCart(userId, (db.carts[userId] ?? []).filter((i) => i.pharmacyId !== pharmacyId));
  },
};
