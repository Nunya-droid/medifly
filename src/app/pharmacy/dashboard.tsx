import React, { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Boxes, CircleCheck, ClipboardList, FileText, PackageCheck, Truck, Wallet } from '@/components/ui/icons';
import { space } from '@/theme';
import { useDb } from '@/hooks/useDb';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { usePharmacyScope } from '@/contexts/PharmacyScope';
import { getPharmacyAnalytics } from '@/services/analyticsService';
import { ACTIVE_ORDER_STATUSES } from '@/constants/status';
import { formatGHS, formatRelative } from '@/utils/format';
import { BarChart, Badge, Button, Card, CardHeader, DataTable, EmptyState, PageHeader, StatCard, Text } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { OrderStatusBadge } from '@/components/shared/OrderParts';
import { OrderActions } from '@/components/pharmacy/OrderPanel';
import type { Order } from '@/types';

export default function PharmacyDashboard() {
  const db = useDb();
  const { pharmacyId, pharmacy } = usePharmacyScope();
  const { isDesktop, isMobile } = useBreakpoint();
  const a = useMemo(() => getPharmacyAnalytics(db, pharmacyId), [db, pharmacyId]);
  const queue = db.orders.filter((o) => o.pharmacyId === pharmacyId && ACTIVE_ORDER_STATUSES.includes(o.status)).sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  const activity = db.auditLogs.filter((l) => l.entityType === 'order' && db.orders.find((o) => o.id === l.entityId)?.pharmacyId === pharmacyId).slice(0, 7);
  const productName = (id: string) => db.products.find((p) => p.id === id)?.name ?? id;

  return (
    <Page>
      <PageHeader title={pharmacy.name} subtitle={`${pharmacy.address} · ${pharmacy.acceptingOrders ? 'Accepting orders' : 'Not accepting orders'}`} actions={<Button label="Manage orders" icon={ClipboardList} onPress={() => router.push('/pharmacy/orders')} />} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3], marginBottom: space[6] }}>
        <StatCard label="Awaiting confirmation" value={a.awaitingConfirmation} icon={ClipboardList} tone="warning" hint={`${a.newOrders} ready to confirm`} onPress={() => router.push('/pharmacy/orders?tab=awaiting-pharmacy')} />
        <StatCard label="Prescription review" value={a.reviewRequired} icon={FileText} tone="violet" hint="Pending pharmacist review" onPress={() => router.push('/pharmacy/prescriptions')} />
        <StatCard label="Preparing" value={a.preparing} icon={PackageCheck} tone="info" onPress={() => router.push('/pharmacy/orders?tab=preparing')} />
        <StatCard label="Ready for dispatch" value={a.readyForDispatch} icon={Truck} tone="teal" onPress={() => router.push('/pharmacy/dispatch')} />
        <StatCard label="Completed today" value={a.completedToday} icon={CircleCheck} tone="success" />
        <StatCard label="Sales today (illustrative)" value={formatGHS(a.revenueToday, { decimals: false })} icon={Wallet} tone="neutral" hint="Medicine subtotals, before fees" />
      </View>

      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space[6] }}>
        <View style={{ flex: 2, gap: space[6], minWidth: 0 }}>
          <Card>
            <CardHeader title="Work queue" subtitle="Oldest first — act on each order to move it forward" action={<Button label="All orders" variant="ghost" size="sm" onPress={() => router.push('/pharmacy/orders')} />} />
            <DataTable<Order>
              rows={queue.slice(0, 8)}
              keyExtractor={(o) => o.id}
              onRowPress={(o) => router.push(`/pharmacy/orders?id=${o.id}` as never)}
              emptyTitle="Queue is clear"
              emptyMessage="New orders will appear here."
              minTableWidth={640}
              columns={[
                { key: 'ref', title: 'Order', flex: 1.1, render: (o) => <View><Text variant="bodySm" weight="semibold">{o.reference}</Text><Text variant="caption" tone="muted">{formatRelative(o.createdAt)}</Text></View> },
                { key: 'items', title: 'Items', flex: 1.6, render: (o) => <View style={{ gap: 4 }}><Text variant="bodySm" numberOfLines={1}>{o.items.map((i) => i.name).join(', ')}</Text>{o.requiresPrescription ? <Badge label={o.prescriptionStatus === 'approved' ? 'Rx approved' : 'Rx review'} tone={o.prescriptionStatus === 'approved' ? 'success' : 'violet'} size="sm" /> : null}</View> },
                { key: 'status', title: 'Status', flex: 1.1, render: (o) => <OrderStatusBadge order={o} size="sm" /> },
                { key: 'action', title: 'Next step', flex: 1.8, hideOnMobile: false, render: (o) => <OrderActions order={o} compact /> },
              ]}
            />
          </Card>
          <Card>
            <CardHeader title="Orders this week" subtitle="Orders received and delivered per day" />
            <BarChart
              ariaLabel="Orders received and delivered per day this week"
              labels={a.byDay.map((d) => d.label)}
              series={[
                { key: 'orders', label: 'Received', values: a.byDay.map((d) => d.orders) },
                { key: 'delivered', label: 'Delivered', values: a.byDay.map((d) => d.delivered) },
              ]}
              height={isMobile ? 180 : 210}
            />
          </Card>
        </View>
        <View style={{ flex: 1, gap: space[6], minWidth: 0 }}>
          <Card>
            <CardHeader title="Low stock" icon={Boxes} action={<Button label="Inventory" variant="ghost" size="sm" onPress={() => router.push('/pharmacy/inventory?filter=low')} />} />
            {a.lowStock.length === 0 ? (
              <EmptyState compact title="Stock levels healthy" />
            ) : (
              <View style={{ gap: space[3] }}>
                {a.lowStock.map((i) => (
                  <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                    <Text variant="bodySm" style={{ flex: 1 }} numberOfLines={1}>
                      {productName(i.productId)}
                    </Text>
                    <Badge label={i.stock === 0 ? 'Out of stock' : `${i.stock} left`} tone={i.stock === 0 ? 'danger' : 'warning'} size="sm" />
                  </View>
                ))}
              </View>
            )}
          </Card>
          <Card>
            <CardHeader title="Recent activity" />
            {activity.length === 0 ? (
              <EmptyState compact title="No activity yet" />
            ) : (
              <View style={{ gap: space[3] }}>
                {activity.map((l) => (
                  <View key={l.id} style={{ gap: 2 }}>
                    <Text variant="bodySm">{l.summary}</Text>
                    <Text variant="caption" tone="muted">
                      {l.actorName} · {formatRelative(l.at)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>
      </View>
    </Page>
  );
}
