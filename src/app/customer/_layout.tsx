import React from 'react';
import { router, Slot } from 'expo-router';
import { FileText, Headphones, House, Package, Search, ShoppingCart, User } from '@/components/ui/icons';
import { AppShell, type NavItem } from '@/components/layout/AppShell';
import { RoleGate } from '@/components/layout/RoleGate';
import { IconButton } from '@/components/ui';
import { useCustomer } from '@/hooks/useCustomer';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { ACTIVE_ORDER_STATUSES } from '@/constants/status';

function CustomerShell() {
  const { cartCount, db, user } = useCustomer();
  const { isMobile } = useBreakpoint();
  const active = db.orders.filter((o) => o.customerId === user?.id && ACTIVE_ORDER_STATUSES.includes(o.status)).length;
  const nav: NavItem[] = [
    { label: 'Home', href: '/customer/dashboard', icon: House },
    { label: 'Search', href: '/customer/search', icon: Search, match: ['/customer/product'] },
    { label: 'My orders', href: '/customer/orders', icon: Package, badge: active || undefined },
    { label: 'Prescriptions', href: '/customer/prescription', icon: FileText },
    { label: 'Support', href: '/customer/support', icon: Headphones },
  ];
  const tabs: NavItem[] = [
    { label: 'Home', href: '/customer/dashboard', icon: House },
    { label: 'Search', href: '/customer/search', icon: Search, match: ['/customer/product'] },
    { label: 'Cart', href: '/customer/cart', icon: ShoppingCart, badge: cartCount || undefined, match: ['/customer/checkout'] },
    { label: 'Orders', href: '/customer/orders', icon: Package },
    { label: 'Profile', href: '/customer/profile', icon: User, match: ['/customer/addresses', '/customer/notifications', '/customer/support', '/customer/prescription'] },
  ];
  return (
    <AppShell
      variant="topnav"
      nav={nav}
      mobileTabs={tabs}
      portalLabel="Customer"
      notificationsHref="/customer/notifications"
      profileHref="/customer/profile"
      headerExtra={!isMobile ? <IconButton icon={ShoppingCart} label={`Cart, ${cartCount} items`} badge={cartCount} onPress={() => router.push('/customer/cart')} /> : null}
    >
      <Slot />
    </AppShell>
  );
}

export default function CustomerLayout() {
  return (
    <RoleGate roles={['customer']}>
      <CustomerShell />
    </RoleGate>
  );
}
