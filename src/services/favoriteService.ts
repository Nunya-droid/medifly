import { commit, getDb } from './db';
import { request, ServiceError } from './api';
import { authService } from './authService';

/** Customer favourites ("saved products"), persisted per user. */
export const favoriteService = {
  toggle(productId: string): Promise<boolean> {
    return request(() => {
      const user = authService.requireUser(['customer']);
      const db = getDb();
      if (!db.products.some((p) => p.id === productId)) throw new ServiceError('NOT_FOUND', 'Product not found.');
      const current = db.favorites[user.id] ?? [];
      const saved = !current.includes(productId);
      commit({ favorites: { ...db.favorites, [user.id]: saved ? [productId, ...current] : current.filter((id) => id !== productId) } });
      return saved;
    }, { delay: 0 });
  },
};
