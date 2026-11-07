import type { SavedAddress, User } from '@/types';
import { commit, getDb } from './db';
import { request, ServiceError } from './api';
import { authService } from './authService';
import { createId } from '@/utils/id';

const PHONE = /^(\+233|0)[\s\d]{9,13}$/;

function save(user: User) {
  const db = getDb();
  commit({ users: db.users.map((u) => (u.id === user.id ? user : u)) });
  return user;
}

export const userService = {
  updateProfile(patch: { name?: string; phone?: string }): Promise<User> {
    return request(() => {
      const user = authService.requireUser();
      if (patch.name != null && patch.name.trim().length < 2) throw new ServiceError('VALIDATION', 'Name is too short.');
      if (patch.phone != null && !PHONE.test(patch.phone.trim())) throw new ServiceError('VALIDATION', 'Enter a Ghanaian phone number.');
      return save({ ...user, name: patch.name?.trim() ?? user.name, phone: patch.phone?.trim() ?? user.phone });
    });
  },

  saveAddress(input: Omit<SavedAddress, 'id'> & { id?: string }): Promise<SavedAddress> {
    return request(() => {
      const user = authService.requireUser(['customer']);
      if (!input.recipientName.trim() || !input.area.trim()) throw new ServiceError('VALIDATION', 'Recipient and area are required.');
      if (!PHONE.test(input.phone.trim())) throw new ServiceError('VALIDATION', 'Enter a Ghanaian phone number for the recipient.');
      if (!getDb().serviceAreas.some((a) => a.id === input.serviceAreaId)) throw new ServiceError('VALIDATION', 'Choose a service area.');
      const list = user.addresses ?? [];
      const address: SavedAddress = { ...input, id: input.id ?? createId('addr'), isDefault: input.isDefault || list.length === 0 };
      let next = input.id ? list.map((a) => (a.id === input.id ? address : a)) : [...list, address];
      if (address.isDefault) next = next.map((a) => ({ ...a, isDefault: a.id === address.id }));
      save({ ...user, addresses: next });
      return address;
    }, { delay: 300 });
  },

  deleteAddress(id: string): Promise<void> {
    return request(() => {
      const user = authService.requireUser(['customer']);
      let next = (user.addresses ?? []).filter((a) => a.id !== id);
      if (next.length && !next.some((a) => a.isDefault)) next = next.map((a, i) => ({ ...a, isDefault: i === 0 }));
      save({ ...user, addresses: next });
    }, { delay: 200 });
  },
};
