import { storageService } from '@/services/storageService';

/** Whether a customer has seen the welcome introduction in this browser. */
const key = (userId: string) => `pref:onboarded:${userId}`;

export const onboarding = {
  seen: (userId: string) => storageService.read<boolean>(key(userId), false),
  markSeen: (userId: string) => storageService.write(key(userId), true),
};