import React from 'react';
import { Slot } from 'expo-router';
import { BarChart3, Bell, Building2, ClipboardList, CreditCard, Headphones, LayoutDashboard, Map, ScrollText, Settings, ShieldCheck, Truck } from '@/components/ui/icons';
import { AppShell, SidebarHelp, type NavItem } from '@/components/layout/AppShell';
import { RoleGate } from '@/components/layout/RoleGate';
import { useDb } from '@/hooks/useDb';
import { ACTIVE_ORDER_STATUSES } from '@/constants/status';

function AdminShell() {
  const db = useDb();
  const nav: NavItem[] = [
    { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Live orders', href: '/admin/orders', icon: ClipboardList, badge: db.orders.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status)).length || undefined },
    { label: 'Delivery monitoring', href: '/admin/deliveries', icon: Truck, badge: db.deliveries.filter((d) => d.status === 'failed' || d.delayed).length || undefined },
    { label: 'Partner verification', href: '/admin/partners', icon: ShieldCheck, badge: db.pharmacies.filter((p) => p.verification === 'pending').length + db.couriers.filter((c) => c.verification === 'pending').length || undefined },
    { label: 'Customer support', href: '/admin/support', icon: Headphones, badge: db.tickets.filter((t) => t.status === 'open').length || undefined },
    { label: 'Payments & refunds', href: '/admin/payments', icon: CreditCard, badge: db.payments.filter((p) => p.status === 'refund-requested').length || undefined },
    { label: 'Service areas', href: '/admin/service-areas', icon: Map, section: 'Platform' },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, section: 'Platform' },
    { label: 'Audit logs', href: '/admin/audit-logs', icon: ScrollText, section: 'Platform' },
    { label: 'Settings', href: '/admin/settings', icon: Settings, section: 'Platform' },
    { label: 'Notifications', href: '/admin/notifications', icon: Bell, section: 'Platform' },
    { label: 'Pharmacy portal view', href: '/pharmacy/dashboard', icon: Building2, section: 'Oversight' },
  ];
  return (
    <AppShell variant="sidebar" nav={nav} portalLabel="MediFly operations" notificationsHref="/admin/notifications" profileHref="/admin/settings" sidebarFooter={<SidebarHelp title="Demo operations" body="Every metric is computed from the shared demo dataset in this browser." />}>
      <Slot />
    </AppShell>
  );
}

export default function AdminLayout() {
  return (
    <RoleGate roles={['admin']}>
      <AdminShell />
    </RoleGate>
  );
}
