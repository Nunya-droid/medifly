import React from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import { Bell, BarChart3, Boxes, Building2, ClipboardList, FileText, History, LayoutDashboard, Truck } from '@/components/ui/icons';
import { space } from '@/theme';
import { AppShell, type NavItem } from '@/components/layout/AppShell';
import { RoleGate } from '@/components/layout/RoleGate';
import { PharmacyScopeProvider, usePharmacyScope } from '@/contexts/PharmacyScope';
import { useDb } from '@/hooks/useDb';
import { Select, Text } from '@/components/ui';

function ScopeSwitcher() {
  const { pharmacyId, setPharmacyId, canSwitch, pharmacy } = usePharmacyScope();
  const db = useDb();
  if (!canSwitch) {
    return (
      <View style={{ gap: 2 }}>
        <Text variant="caption" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Signed in to
        </Text>
        <Text variant="label" style={{ color: '#fff' }}>
          {pharmacy.name}
        </Text>
      </View>
    );
  }
  return (
    <View style={{ gap: space[2] }}>
      <Text variant="caption" style={{ color: 'rgba(255,255,255,0.65)' }}>
        Admin view — pharmacy
      </Text>
      <Select compact value={pharmacyId} onChange={setPharmacyId} options={db.pharmacies.map((p) => ({ value: p.id, label: p.name }))} width={240} />
    </View>
  );
}

function PharmacyShell() {
  const db = useDb();
  const { pharmacyId } = usePharmacyScope();
  const orders = db.orders.filter((o) => o.pharmacyId === pharmacyId);
  const nav: NavItem[] = [
    { label: 'Overview', href: '/pharmacy/dashboard', icon: LayoutDashboard },
    { label: 'Orders', href: '/pharmacy/orders', icon: ClipboardList, badge: orders.filter((o) => o.status === 'awaiting-pharmacy').length || undefined },
    { label: 'Prescriptions', href: '/pharmacy/prescriptions', icon: FileText, badge: db.prescriptions.filter((p) => p.pharmacyId === pharmacyId && p.status === 'pending').length || undefined },
    { label: 'Inventory', href: '/pharmacy/inventory', icon: Boxes, badge: db.inventory.filter((i) => i.pharmacyId === pharmacyId && i.stock <= i.lowStockThreshold).length || undefined },
    { label: 'Dispatch', href: '/pharmacy/dispatch', icon: Truck, badge: orders.filter((o) => o.status === 'ready-for-collection').length || undefined },
    { label: 'Order history', href: '/pharmacy/history', icon: History, section: 'Records' },
    { label: 'Reports', href: '/pharmacy/reports', icon: BarChart3, section: 'Records' },
    { label: 'Profile & hours', href: '/pharmacy/profile', icon: Building2, section: 'Pharmacy' },
    { label: 'Notifications', href: '/pharmacy/notifications', icon: Bell, section: 'Pharmacy' },
  ];
  return (
    <AppShell variant="sidebar" nav={nav} portalLabel="Pharmacy portal" notificationsHref="/pharmacy/notifications" profileHref="/pharmacy/profile" sidebarFooter={<ScopeSwitcher />}>
      <Slot />
    </AppShell>
  );
}

export default function PharmacyLayout() {
  return (
    <RoleGate roles={['pharmacy', 'admin']}>
      <PharmacyScopeProvider>
        <PharmacyShell />
      </PharmacyScopeProvider>
    </RoleGate>
  );
}
