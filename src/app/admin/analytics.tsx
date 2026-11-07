import React, { useMemo } from 'react';
import { View } from 'react-native';
import { space } from '@/theme';
import { useDb } from '@/hooks/useDb';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { getAdminAnalytics, ILLUSTRATIVE_COMMISSION } from '@/services/analyticsService';
import { DELIVERY_METHOD_LABEL } from '@/constants/catalog';
import { formatGHS, formatRelative } from '@/utils/format';
import { AreaChart, BarChart, BarList, Card, CardHeader, DataTable, DonutChart, PageHeader, StatCard, Text } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';

export default function Analytics() {
  const db = useDb();
  const { isDesktop } = useBreakpoint();
  const a = useMemo(() => getAdminAnalytics(db), [db]);
  const row = { flexDirection: isDesktop ? ('row' as const) : ('column' as const), gap: space[6], marginBottom: space[6] };
  const eventCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of db.auditLogs) m.set(l.action, (m.get(l.action) ?? 0) + 1);
    return [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, 6);
  }, [db]);

  return (
    <Page maxWidth={1400}>
      <PageHeader title="Analytics" subtitle="Order, delivery and partner performance computed from the shared demo dataset." />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3], marginBottom: space[6] }}>
        <StatCard label="Gross order value" value={formatGHS(a.kpis.gmv, { decimals: false })} tone="info" hint="Non-cancelled orders" />
        <StatCard label="Platform revenue (illustrative)" value={formatGHS(a.kpis.illustrativeRevenue, { decimals: false })} tone="teal" hint={`Fee share + ${ILLUSTRATIVE_COMMISSION * 100}% commission assumption`} />
        <StatCard label="Avg. order-to-door" value={a.kpis.avgDeliveryMinutes != null ? `${a.kpis.avgDeliveryMinutes} min` : '—'} tone="violet" />
        <StatCard label="Delivery success" value={a.kpis.deliverySuccessRate != null ? `${Math.round(a.kpis.deliverySuccessRate * 100)}%` : '—'} tone="success" />
      </View>
      <View style={row}>
        <Card style={{ flex: 1.5, minWidth: 0 }}>
          <CardHeader title="Revenue trend" subtitle="Gross order value per day, last 14 days (GH₵)" />
          <AreaChart ariaLabel="Gross order value per day" seriesLabel="Order value" labels={a.byDay.map((d) => d.label)} values={a.byDay.map((d) => Math.round(d.revenue))} format={(v) => `₵${Math.round(v)}`} height={240} />
        </Card>
        <Card style={{ flex: 1, minWidth: 0 }}>
          <CardHeader title="Delivery method usage" />
          <DonutChart ariaLabel="Delivery method usage" data={a.methodCounts.map((m) => ({ label: DELIVERY_METHOD_LABEL[m.method], value: m.count }))} centerLabel="orders" centerValue={String(a.methodCounts.reduce((s, m) => s + m.count, 0))} />
        </Card>
      </View>
      <View style={row}>
        <Card style={{ flex: 1.3, minWidth: 0 }}>
          <CardHeader title="Orders vs deliveries" subtitle="Per day, last 14 days" />
          <BarChart ariaLabel="Orders placed and delivered per day" labels={a.byDay.map((d) => d.label)} series={[{ key: 'o', label: 'Placed', values: a.byDay.map((d) => d.orders) }, { key: 'd', label: 'Delivered', values: a.byDay.map((d) => d.delivered) }]} height={220} />
        </Card>
        <Card style={{ flex: 1, minWidth: 0 }}>
          <CardHeader title="Operational events" subtitle="Audit log volume by type" />
          <BarList data={eventCounts.map(([k, v]) => ({ label: k, value: v }))} />
        </Card>
      </View>
      <Card style={{ marginBottom: space[6] }}>
        <CardHeader title="Pharmacy performance" />
        <DataTable
          rows={a.pharmacyPerformance}
          keyExtractor={(p) => p.id}
          minTableWidth={720}
          columns={[
            { key: 'n', title: 'Pharmacy', flex: 1.6, render: (p) => <Text variant="bodySm" weight="semibold">{p.name}</Text> },
            { key: 'o', title: 'Orders', flex: 0.7, align: 'right', render: (p) => String(p.orders) },
            { key: 'd', title: 'Delivered', flex: 0.8, align: 'right', render: (p) => String(p.delivered) },
            { key: 'f', title: 'Fulfilment', flex: 0.9, align: 'right', render: (p) => `${Math.round(p.fulfilmentRate * 100)}%` },
            { key: 'c', title: 'Avg. confirm', flex: 0.9, align: 'right', render: (p) => (p.avgConfirmMinutes != null ? `${p.avgConfirmMinutes} min` : '—') },
            { key: 'r', title: 'Delivered sales', flex: 1, align: 'right', render: (p) => formatGHS(p.revenue) },
          ]}
        />
      </Card>
      <Card>
        <CardHeader title="Customer activity" />
        <DataTable
          rows={a.customerActivity}
          keyExtractor={(c) => c.id}
          minTableWidth={600}
          columns={[
            { key: 'n', title: 'Customer', flex: 1.5, render: (c) => <Text variant="bodySm" weight="semibold">{c.name}</Text> },
            { key: 'o', title: 'Orders', flex: 0.7, align: 'right', render: (c) => String(c.orders) },
            { key: 's', title: 'Delivered spend', flex: 1, align: 'right', render: (c) => formatGHS(c.spend) },
            { key: 'l', title: 'Last order', flex: 1, align: 'right', render: (c) => (c.lastOrderAt ? formatRelative(c.lastOrderAt) : '—') },
          ]}
        />
      </Card>
    </Page>
  );
}
