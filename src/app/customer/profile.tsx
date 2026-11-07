import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Bell, ChevronRight, FileText, Headphones, Heart, MapPin, Package, ScanLine, type LucideIcon } from '@/components/ui/icons';
import { colors, space } from '@/theme';
import { useCustomer } from '@/hooks/useCustomer';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Card, PageHeader, Text } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { DemoControls, ProfileCard } from '@/components/shared/ProfileBasics';

function Link({ icon: Icon, title, sub, href }: { icon: LucideIcon; title: string; sub: string; href: string }) {
  return (
    <Card onPress={() => router.push(href as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }} accessibilityLabel={title}>
      <Icon size={20} color={colors.blue} />
      <View style={{ flex: 1 }}>
        <Text variant="title">{title}</Text>
        <Text variant="caption" tone="secondary">
          {sub}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.textMuted} />
    </Card>
  );
}

export default function CustomerProfile() {
  const { db, user, addresses } = useCustomer();
  const { isDesktop } = useBreakpoint();
  const orders = db.orders.filter((o) => o.customerId === user?.id);
  const rx = db.prescriptions.filter((p) => p.customerId === user?.id);
  const tickets = db.tickets.filter((t) => t.customerId === user?.id && !['resolved', 'closed'].includes(t.status));
  return (
    <Page maxWidth={1000}>
      <PageHeader title="Profile" subtitle="Manage your details, addresses, privacy and demo settings." />
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space[6] }}>
        <View style={{ flex: 1.3, gap: space[5] }}>
          <ProfileCard />
          <Card style={{ gap: space[2] }}>
            <Text variant="h3">Privacy</Text>
            <Text variant="bodySm" tone="secondary">
              MediFly collects only what is needed to fulfil an order. In this demo, all data is fictional and stays in your browser. Prescription previews are stored locally and can be removed with “Reset demo data”.
            </Text>
          </Card>
        </View>
        <View style={{ flex: 1, gap: space[3] }}>
          <Link icon={MapPin} title="Saved addresses" sub={`${addresses.length} saved`} href="/customer/addresses" />
          <Link icon={Heart} title="Favourites" sub={`${db.favorites?.[user?.id ?? '']?.length ?? 0} saved products`} href="/customer/favorites" />
          <Link icon={ScanLine} title="Scan prescription" sub="Use your camera for pharmacist review" href="/customer/scan" />
          <Link icon={Package} title="Order history" sub={`${orders.length} orders`} href="/customer/orders" />
          <Link icon={FileText} title="Prescriptions" sub={`${rx.length} submitted`} href="/customer/prescription" />
          <Link icon={Bell} title="Notifications" sub="Order and delivery updates" href="/customer/notifications" />
          <Link icon={Headphones} title="Support" sub={tickets.length ? `${tickets.length} open request(s)` : 'Get help with an order'} href="/customer/support" />
          <DemoControls />
        </View>
      </View>
    </Page>
  );
}
