import type { Database, InventoryItem, OpeningHours, Pharmacy, Product } from '@/types';
import { commit, getDb } from './db';
import { request, ServiceError, nowIso } from './api';
import { authService } from './authService';
import { auditEntry } from './auditService';
import { createId } from '@/utils/id';
import { roadDistanceKm, round1 } from '@/utils/geo';

export interface PharmacyWithDistance {
  pharmacy: Pharmacy;
  distanceKm: number;
  inStockCount: number;
  isOpen: boolean;
}

const DAY_KEYS: OpeningHours['day'][] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function isOpenNow(p: Pharmacy, at = new Date()): boolean {
  const today = p.openingHours.find((h) => h.day === DAY_KEYS[at.getDay()]);
  if (!today || today.closed) return false;
  const mins = at.getHours() * 60 + at.getMinutes();
  const [oh, om] = today.open.split(':').map(Number);
  const [ch, cm] = today.close.split(':').map(Number);
  return mins >= oh * 60 + om && mins < ch * 60 + cm;
}

export function nearbyPharmacies(db: Database, serviceAreaId?: string): PharmacyWithDistance[] {
  const area = db.serviceAreas.find((a) => a.id === serviceAreaId) ?? db.serviceAreas[0];
  return db.pharmacies
    .filter((p) => p.verification === 'verified')
    .map((pharmacy) => ({
      pharmacy,
      distanceKm: round1(roadDistanceKm(pharmacy, area)),
      inStockCount: db.inventory.filter((i) => i.pharmacyId === pharmacy.id && i.available && i.stock > 0).length,
      isOpen: isOpenNow(pharmacy),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

function assertCanManage(pharmacyId: string) {
  const user = authService.requireUser(['pharmacy', 'admin']);
  if (user.role === 'pharmacy' && user.pharmacyId !== pharmacyId) {
    throw new ServiceError('FORBIDDEN', 'You can only manage your assigned pharmacy.');
  }
  return user;
}

export const pharmacyService = {
  getPharmacies(): Promise<Pharmacy[]> {
    return request(() => getDb().pharmacies);
  },

  /** Stock check for one product at one pharmacy. */
  checkAvailability(productId: string, pharmacyId: string, quantity = 1): Promise<{ available: boolean; stock: number; price: number | null; message: string }> {
    return request(() => {
      const inv = getDb().inventory.find((i) => i.productId === productId && i.pharmacyId === pharmacyId);
      if (!inv) return { available: false, stock: 0, price: null, message: 'Not carried by this pharmacy.' };
      if (!inv.available || inv.stock <= 0) return { available: false, stock: 0, price: inv.price, message: 'Currently unavailable.' };
      if (inv.stock < quantity) return { available: false, stock: inv.stock, price: inv.price, message: `Only ${inv.stock} in stock.` };
      return { available: true, stock: inv.stock, price: inv.price, message: 'In stock (pending pharmacy confirmation).' };
    });
  },

  updateInventory(itemId: string, patch: Partial<Pick<InventoryItem, 'stock' | 'price' | 'available' | 'lowStockThreshold'>>): Promise<InventoryItem> {
    return request(() => {
      const db = getDb();
      const item = db.inventory.find((i) => i.id === itemId);
      if (!item) throw new ServiceError('NOT_FOUND', 'Inventory item not found.');
      const user = assertCanManage(item.pharmacyId);
      if (patch.stock != null && (patch.stock < 0 || !Number.isFinite(patch.stock))) throw new ServiceError('VALIDATION', 'Stock must be zero or more.');
      if (patch.price != null && (patch.price <= 0 || !Number.isFinite(patch.price))) throw new ServiceError('VALIDATION', 'Price must be greater than zero.');
      const next: InventoryItem = { ...item, ...patch, updatedAt: nowIso() };
      if (patch.stock === 0 && patch.available === undefined) next.available = item.available; // keep explicit availability
      const product = db.products.find((p) => p.id === item.productId);
      const changes = [
        patch.stock != null && patch.stock !== item.stock ? `stock ${item.stock} → ${patch.stock}` : null,
        patch.price != null && patch.price !== item.price ? `price ${item.price} → ${patch.price}` : null,
        patch.available != null && patch.available !== item.available ? (patch.available ? 'marked available' : 'marked unavailable') : null,
      ].filter(Boolean);
      commit({
        inventory: db.inventory.map((i) => (i.id === itemId ? next : i)),
        auditLogs: [auditEntry(user, 'stock.updated', 'inventory', itemId, `${product?.name ?? 'Product'}: ${changes.join(', ') || 'updated'}`), ...db.auditLogs],
      });
      return next;
    });
  },

  /** Add a catalogue product (new or existing) to a pharmacy's inventory. */
  addProduct(
    pharmacyId: string,
    input: { existingProductId?: string; product?: Omit<Product, 'id' | 'createdAt' | 'createdByPharmacyId'>; stock: number; price: number }
  ): Promise<InventoryItem> {
    return request(() => {
      const user = assertCanManage(pharmacyId);
      const db = getDb();
      let productId = input.existingProductId;
      let products = db.products;
      if (!productId) {
        if (!input.product) throw new ServiceError('VALIDATION', 'Product details are required.');
        const product: Product = { ...input.product, id: createId('prd'), createdAt: nowIso(), createdByPharmacyId: pharmacyId };
        products = [...products, product];
        productId = product.id;
      }
      if (db.inventory.some((i) => i.pharmacyId === pharmacyId && i.productId === productId)) {
        throw new ServiceError('CONFLICT', 'This product is already in your inventory.');
      }
      const item: InventoryItem = { id: createId('inv'), pharmacyId, productId, stock: input.stock, price: input.price, available: input.stock > 0, lowStockThreshold: 8, updatedAt: nowIso() };
      const name = products.find((p) => p.id === productId)?.name;
      commit({
        products,
        inventory: [...db.inventory, item],
        auditLogs: [auditEntry(user, 'product.created', 'inventory', item.id, `Added ${name} to inventory (stock ${item.stock})`), ...db.auditLogs],
      });
      return item;
    });
  },

  updateProduct(productId: string, pharmacyId: string, patch: Partial<Pick<Product, 'name' | 'strength' | 'dosageForm' | 'packSize' | 'category' | 'requiresPrescription' | 'description'>>): Promise<Product> {
    return request(() => {
      const user = assertCanManage(pharmacyId);
      const db = getDb();
      const product = db.products.find((p) => p.id === productId);
      if (!product) throw new ServiceError('NOT_FOUND', 'Product not found.');
      const next = { ...product, ...patch };
      commit({
        products: db.products.map((p) => (p.id === productId ? next : p)),
        auditLogs: [auditEntry(user, 'product.updated', 'product', productId, `Updated product details for ${next.name}`), ...db.auditLogs],
      });
      return next;
    });
  },

  updateProfile(pharmacyId: string, patch: Partial<Pick<Pharmacy, 'phone' | 'email' | 'address' | 'landmark' | 'prepMinutes' | 'openingHours' | 'acceptingOrders'>>): Promise<Pharmacy> {
    return request(() => {
      const user = assertCanManage(pharmacyId);
      const db = getDb();
      const ph = db.pharmacies.find((p) => p.id === pharmacyId);
      if (!ph) throw new ServiceError('NOT_FOUND', 'Pharmacy not found.');
      const next = { ...ph, ...patch };
      commit({
        pharmacies: db.pharmacies.map((p) => (p.id === pharmacyId ? next : p)),
        auditLogs: [auditEntry(user, 'settings.updated', 'pharmacy', pharmacyId, `Updated ${ph.name} profile`), ...db.auditLogs],
      });
      return next;
    });
  },
};
