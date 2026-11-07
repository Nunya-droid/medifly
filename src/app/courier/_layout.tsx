import React from 'react';
import { Slot } from 'expo-router';
import { Bell, ClipboardList, History, House, User } from '@/components/ui/icons';
import { AppShell, type NavItem } from '@/components/layout/AppShell';
import { RoleGate } from '@/components/layout/RoleGate';
import { useCurrentUser, useDb } from '@/hooks/useDb';
import { jobsForCourier } from '@/services/deliveryService';

function CourierShell() {
  const db = useDb();
  const user = useCurrentUser();
  const jobs = user?.courierId ? jobsForCourier(db, user.courierId) : { offered: [], open: [] };
  const jobCount = jobs.offered.length + jobs.open.length;
  const nav: NavItem[] = [
    { label: 'Today', href: '/courier/dashboard', icon: House, match: ['/courier/deliveries'] },
    { label: 'Jobs', href: '/courier/jobs', icon: ClipboardList, badge: jobCount || undefined },
    { label: 'History', href: '/courier/history', icon: History },
    { label: 'Alerts', href: '/courier/notifications', icon: Bell },
    { label: 'Profile', href: '/courier/profile', icon: User },
  ];
  return (
    <AppShell variant="topnav" nav={nav} mobileTabs={nav} portalLabel="Courier" notificationsHref="/courier/notifications" profileHref="/courier/profile">
      <Slot />
    </AppShell>
  );
}

export default function CourierLayout() {
  return (
    <RoleGate roles={['courier']}>
      <CourierShell />
    </RoleGate>
  );
}
