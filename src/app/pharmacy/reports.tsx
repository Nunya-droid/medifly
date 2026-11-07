import React, { useMemo } from 'react';
import { View } from 'react-native';
import { CircleCheck, ClipboardList, Wallet, XCircle } from '@/components/ui/icons';
import { space } from '@/theme';
import { useDb } from '@/hooks/useDb';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { usePharmacyScope } from '@/contexts/PharmacyScope';
import { getPharmacyAnalytics } from '@/services/analyticsService';
import { formatGHS } from '@/utils/format';
import { AreaChart, BarList, Card, CardHeader, EmptyState, PageHeader, StatCard, Text } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';

export default function PharmacyReports() {
  const db = useDb();
  const { pharmacyId, pharmacy } = usePharmacyScope();
  const { isDesktop } = useBreakpoint();
  const a = useMemo(() => getPharmacyAnalytics(db, pharmacyId), [db, pharmacyId]);
  const fulfilment = a.totalOrders ? Math.round(((a.totalOrders - a.rejected) / a.totalOrders) * 100) : 0;
  return (
    <Page>
      <PageHeader title="Reports" subtitle={`${pharmacy.name} — derived from orders in this demo dataset. Revenue figures are illustrative.`} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3], marginBottom: space[6] }}>
        <StatCard label="Total orders" value={a.totalOrders} icon={ClipboardList} />
        <StatCard label="Delivered" value={a.delivered} icon={CircleCheck} tone="success" />
        <StatCard label="Rejected" value={a.rejected} icon={XCircle} tone="danger" />
        <StatCard label="Fulfilment rate" value={`${fulfilment}%`} tone="teal" hint="Orders not rejected" />
        <StatCard label="Delivered sales (illustrative)" value={formatGHS(a.revenueTotal, { decimals: false })} icon={Wallet} tone="neutral" />
      </View>
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space[6] }}>
        <Card style={{ flex: 1.6 }}>
          <CardHeader title="Order value by day" subtitle="Last 14 days · non-cancelled orders incl. delivery (GH₵)" />
          <AreaChart ariaLabel="Order value by day for the last 14 days" seriesLabel="Order value" labels={a.byDay14.map((d) => d.label)} values={a.byDay14.map((d) => Math.round(d.revenue))} format={(v) => `₵${Math.round(v)}`} height={230} />
        </Card>
        <Card style={{ flex: 1 }}>
          <CardHeader title="Top products" subtitle="Delivered sales (illustrative)" />
          {a.topProducts.length ? <BarList data={a.topProducts.map((p) => ({ label: p.name, value: Math.round(p.revenue), hint: `${p.units} units` }))} format={(v) => formatGHS(v, { decimals: false })} /> : <EmptyState compact title="No delivered orders yet" />}
        </Card>
      </View>
      <Text variant="caption" tone="muted" style={{ marginTop: space[4] }}>
        All figures are computed from the fictional demo dataset in this browser and are not financial records.
      </Text>
    </Page>
  );
}
