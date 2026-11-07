export type Role = 'customer' | 'pharmacy' | 'courier' | 'admin';

export interface SavedAddress {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  region: string;
  city: string;
  serviceAreaId: string;
  area: string;
  landmark: string;
  instructions?: string;
  isDefault?: boolean;
}

export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  phone: string;
  /** Demo-only password digest. Not production security. */
  passwordDigest: string;
  createdAt: string;
  /** Pharmacy staff: the pharmacy they manage. */
  pharmacyId?: string;
  /** Courier: their courier/partner record. */
  courierId?: string;
  /** Customer: saved delivery addresses. */
  addresses?: SavedAddress[];
  title?: string;
  isDemoAccount?: boolean;
}

export interface Session {
  userId: string;
  role: Role;
  signedInAt: string;
}
