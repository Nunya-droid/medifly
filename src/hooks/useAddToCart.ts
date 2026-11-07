import { useState } from 'react';
import { router } from 'expo-router';
import { cartService } from '@/services/cartService';
import { getErrorMessage } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useCurrentUser } from './useDb';

export function useAddToCart() {
  const user = useCurrentUser();
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const add = async (productId: string, pharmacyId: string, name: string, opts: { quantity?: number; requiresPrescription?: boolean } = {}) => {
    if (!user) return router.push('/login');
    const key = `${productId}:${pharmacyId}`;
    setPending(key);
    try {
      await cartService.addItem(user.id, productId, pharmacyId, opts.quantity ?? 1);
      toast.show({
        tone: 'success',
        title: `${name} added to cart`,
        message: opts.requiresPrescription ? 'Prescription item: you will attach a prescription at checkout for pharmacist review.' : undefined,
      });
    } catch (e) {
      toast.show({ tone: 'danger', title: 'Could not add to cart', message: getErrorMessage(e) });
    } finally {
      setPending(null);
    }
  };
  return { add, pending };
}
