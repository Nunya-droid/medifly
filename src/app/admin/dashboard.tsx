import React, { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Bike, Building2, CircleCheck, ClipboardList, FileText, ShieldCheck, Truck, TriangleAlert, Users, Wallet } from '@/components/ui/icons';
import { space } from '@/theme';
import { useDb } from '@/hooks/useDb';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { getAdminAnalytics } from '@/services/analyticsService';
import { toView } from '@/services/deliveryService';
import { DELIVERY_METHOD_LABEL } from '@/constants/catalog';
import { formatGHS, formatRelative } from '@/utils/format';
import type { Order } from '@/types';
import { AreaChart, Badge, BarChart, BarList, Button, Card, CardHeader, DataTable, DonutChart, EmptyState, PageHeader, StatCard, Text } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { OrderStatusBadge } from '@/components/shared/OrderParts';

export default function AdminDashboard() {
  const db = useDb();
  const { isDesktop, isMobile } = useBreakpoint();
  const a = useMemo(() => getAdminAnalytics(db), [db]);
  const k = a.kpis;
  const recent = [...db.orders].sort((x, y) => y.updatedAt.localeCompare(x.updatedAt)).slice(0, 6);
  const pharmacyName = (id: string) => db.pharmacies.find((p) => p.id === id)?.name ?? '';
  const kpiStyle = { minWidth: isDesktop ? 230 : 150 };
  const twoCol = { flexDirection: isDesktop ? ('row' as const) : ('column' as const), gap: space[6], marginBottom: space[6] };

  return (
    <Page maxWidth={1400}>
      <PageHeader title="Operations overview" subtitle="Live view of orders, deliveries and partners across the MediFly demo network." actions={<Button label="Live orders" icon={ClipboardList} onPress={() => router.push('/admin/orders')} />} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3], marginBottom: space[6] }}>
        <StatCard label="Total orders" style={kpiStyle} value={k.totalOrders} icon={ClipboardList} hint={`${k.activeOrders} active`} onPress={() => router.push('/admin/orders')} />
        <StatCard label="Orders today" style={kpiStyle} value={k.ordersToday} icon={ClipboardList} tone="teal" />
        <StatCard label="Active deliveries" style={kpiStyle} value={k.activeDeliveries} icon={Truck} tone="info" onPress={() => router.push('/admin/deliveries')} />
        <StatCard label="Completed deliveries" style={kpiStyle} value={k.completedDeliveries} icon={CircleCheck} tone="success" hint={k.deliverySuccessRate != null ? `${Math.round(k.deliverySuccessRate * 100)}% success` : undefined} />
        <StatCard label="Customers" style={kpiStyle} value={k.totalCustomers} icon={Users} tone="violet" />
        <StatCard label="Active pharmacies" style={kpiStyle} value={k.activePharmacies} icon={Building2} tone="info" onPress={() => router.push('/admin/partners')} />
        <StatCard label="Active couriers" style={kpiStyle} value={k.activeCouriers} icon={Bike} tone="teal" />
        <StatCard label="Platform revenue (illustrative)" style={kpiStyle} value={formatGHS(k.illustrativeRevenue, { decimals: false })} icon={Wallet} tone="neutral" hint="Fee share + assumed 5% commission" onPress={() => router.push('/admin/analytics')} />
      </View>

      <View style={twoCol}>
        <Card style={{ flex: 1.6, minWidth: 0 }}>
          <CardHeader title="Orders over time" subtitle="Last 14 days — orders placed" />
          <AreaChart ariaLabel="Orders placed per day, last 14 days" seriesLabel="Orders" labels={a.byDay.map((d) => d.label)} values={a.byDay.map((d) => d.orders)} height={isMobile ? 190 : 230} />
        </Card>
        <Card style={{ flex: 1, minWidth: 0 }}>
          <CardHeader title="Order status" subtitle="Current distribution" />
          <DonutChart ariaLabel="Order status distribution" data={a.statusCounts.slice().sort((x, y) => y.count - x.count).slice(0, 6).map((s) => ({ label: s.label, value: s.count }))} centerLabel="orders" centerValue={String(k.totalOrders)} size={140} />
        </Card>
      </View>

      <View style={twoCol}>
        <Card style={{ flex: 1, minWidth: 0 }}>
          <CardHeader title="Delivery methods" subtitle="Non-cancelled orders" />
          <DonutChart ariaLabel="Delivery method distribution" data={a.methodCounts.map((m) => ({ label: DELIVERY_METHOD_LABEL[m.method], value: m.count }))} centerLabel="deliveries" centerValue={String(a.methodCounts.reduce((s, m) => s + m.count, 0))} size={140} />
        </Card>
        <Card style={{ flex: 1, minWidth: 0 }}>
          <CardHeader title="Pharmacy performance" subtitle="Orders received" />
          <BarList data={a.pharmacyPerformance.map((p) => ({ label: p.name, value: p.orders, hint: `${p.delivered} delivered · ${Math.round(p.fulfilmentRate * 100)}% fulfilled` }))} />
        </Card>
        <Card style={{ flex: 1.2, minWidth: 0 }}>
          <CardHeader title="Revenue trend" subtitle="Gross order value per day (illustrative)" />
          <BarChart ariaLabel="Gross order value per day" labels={a.byDay.slice(-7).map((d) => d.label)} series={[{ key: 'rev', label: 'Order value', values: a.byDay.slice(-7).map((d) => Math.round(d.revenue)) }]} format={(v) => `₵${Math.round(v)}`} height={200} />
        </Card>
      </View>

      <View style={twoCol}>
        <Card style={{ flex: 1.6, minWidth: 0 }}>
          <CardHeader title="Recent orders" action={<Button label="View all" variant="ghost" size="sm" onPress={() => router.push('/admin/orders')} />} />
          <DataTable<Order>
            rows={recent}
            keyExtractor={(o) => o.id}
            onRowPress={(o) => router.push(`/admin/orders?id=${o.id}` as never)}
            minTableWidth={620}
            columns={[
              { key: 'ref', title: 'Order', flex: 1.1, render: (o) => <Text variant="bodySm" weight="semibold">{o.reference}</Text> },
              { key: 'ph', title: 'Pharmacy', flex: 1.4, render: (o) => pharmacyName(o.pharmacyId) },
              { key: 'status', title: 'Status', flex: 1.2, render: (o) => <OrderStatusBadge order={o} size="sm" /> },
              { key: 'upd', title: 'Updated', flex: 1, render: (o) => <Text variant="caption" tone="muted">{formatRelative(o.updatedAt)}</Text> },
              { key: 'total', title: 'Total', flex: 0.8, align: 'right', render: (o) => formatGHS(o.total) },
            ]}
          />
        </Card>
        <View style={{ flex: 1, gap: space[6], minWidth: 0 }}>
          <Card>
            <CardHeader title="Delivery exceptions" icon={TriangleAlert} action={<Button label="Monitor" variant="ghost" size="sm" onPress={() => router.push('/admin/deliveries')} />} />
            {a.exceptions.length === 0 ? (
              <EmptyState compact title="No exceptions" />
            ) : (
              <View style={{ gap: space[3] }}>
                {a.exceptions.slice(0, 4).map((d) => {
                  const v = toView(db, d);
                  return (
                    <View key={d.id} style={{ flexDirection: 'row', gap: space[2], alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodySm" weight="semibold">
                          {v?.order.reference}
                        </Text>
                        <Text variant="caption" tone="secondary" numberOfLines={1}>
                          {d.status === 'failed' ? d.failureReason : 'Running late'}
                        </Text>
                      </View>
                      <Badge label={d.status === 'failed' ? 'Failed' : 'Delayed'} tone={d.status === 'failed' ? 'danger' : 'warning'} size="sm" />
                    </View>
                  );
                })}
              </View>
            )}
          </Card>
          <Card>
            <CardHeader title="Pending approvals" icon={ShieldCheck} action={<Button label="Review" variant="ghost" size="sm" onPress={() => router.push('/admin/partners')} />} />
            {a.pendingPartners.length === 0 ? (
              <EmptyState compact title="Nothing pending" />
            ) : (
              a.pendingPartners.map((p) => (
                <View key={p.id} style={{ flexDirection: 'row', gap: space[2], alignItems: 'center', marginBottom: space[2] }}>
                  <Text variant="bodySm" style={{ flex: 1 }}>
                    {p.name}
                  </Text>
                  <Badge label={p.kind === 'pharmacy' ? 'Pharmacy' : 'Courier'} size="sm" />
                </View>
              ))
            )}
          </Card>
          <Card>
            <CardHeader title="Prescription reviews" icon={FileText} subtitle="Pending across all pharmacies" />
            <Text variant="metric">{a.pendingPrescriptions.length}</Text>
            <Text variant="caption" tone="secondary">
              {a.pendingPrescriptions.map((p) => pharmacyName(p.pharmacyId)).filter((v, i, arr) => arr.indexOf(v) === i).join(', ') || 'None'}
            </Text>
          </Card>
        </View>
      </View>

      <Card>
        <CardHeader title="Recent activity" action={<Button label="Audit logs" variant="ghost" size="sm" onPress={() => router.push('/admin/audit-logs')} />} />
        <View style={{ gap: space[3] }}>
          {db.auditLogs.slice(0, 8).map((l) => (
            <View key={l.id} style={{ flexDirection: 'row', gap: space[3], alignItems: 'flex-start' }}>
              <Badge label={l.actorRole} size="sm" tone={l.actorRole === 'admin' ? 'violet' : l.actorRole === 'pharmacy' ? 'info' : l.actorRole === 'courier' ? 'teal' : 'neutral'} />
              <Text variant="bodySm" style={{ flex: 1 }}>
                {l.summary}
              </Text>
              <Text variant="caption" tone="muted">
                {formatRelative(l.at)}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </Page>
  );
}
