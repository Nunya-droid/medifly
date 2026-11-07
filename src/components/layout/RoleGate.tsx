import React from 'react';
import { Redirect, usePathname } from 'expo-router';
import type { Role } from '@/types';
import { useCurrentUser } from '@/hooks/useDb';
import { ROLE_HOME } from '@/constants/catalog';

/** Role-based route protection for each portal's layout. */
export function RoleGate({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const user = useCurrentUser();
  const pathname = usePathname();
  if (!user) return <Redirect href={`/login?redirect=${encodeURIComponent(pathname)}` as never} />;
  if (!roles.includes(user.role)) return <Redirect href={`${ROLE_HOME[user.role]}?denied=1` as never} />;
  return <>{children}</>;
}
