import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { space } from '@/theme';
import { useDb } from '@/hooks/useDb';
import { useSyncedSelection } from '@/hooks/useSyncedSelection';
import { filterOrders, type OrderFilters } from '@/services/orderService';
import { ORDER_STATUS } from '@/constants/status';
import { DELIVERY_METHOD_LABEL } from '@/constants/catalog';
import { formatGHS, formatRelative } from '@/utils/format';
import type { Order, OrderStatus } from '@/types';
import { Badge, DataTable, Drawer, PageHeader, Pagination, SearchInput, Select, Text, usePagination } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { OrderStatusBadge } from '@/components/shared/OrderParts';
import { PharmacyOrderPanel } from '@/components/pharmacy/OrderPanel';
import { AdminOrderTools } from '@/components/admin/AdminOrderTools';

export default function AdminOrders() {
  const params = useLocalSearchParams<{ id?: string }>();
  const db = useDb();
  const [f, setF] = useState<OrderFilters>({ status: 'all', pharmacyId: 'all', method: 'all', query: '' });
  const [openId, setOpenId] = useSyncedSelection(params.id);
  const all = useMemo(() => [...db.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [db]);
  const list = useMemo(() => filterOrders(db, all, f), [db, all, f]);
  const pg = usePagination(list, 12);
  const open = db.orders.find((o) => o.id === openId);
  const set = <K extends keyof OrderFilters>(k: K) => (v: OrderFilters[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    pg.setPage(1);
  };
  const name = (id: string) => db.users.find((u) => u.id === id)?.name ?? '';
  const ph = (id: string) => db.pharmacies.find((p) => p.id === id)?.name ?? '';
  const courier = (id?: string) => db.couriers.find((c) => c.id === id)?.name;

  return (
    <Page maxWidth={1450}>
      <PageHeader title="Live orders" subtitle={`${list.length} of ${all.length} orders`} />
      <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap', marginBottom: space[4] }}>
        <SearchInput value={f.query ?? ''} onChangeText={set('query')} placeholder="Search reference, customer or product" style={{ flex: 1, minWidth: 240 }} />
        <Select compact prefix="Status" value={f.status as string} onChange={(v) => set('status')(v as OrderFilters['status'])} options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'closed', label: 'Closed' }, ...(Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => ({ value: s, label: ORDER_STATUS[s].label }))]} style={{ minWidth: 200 }} width={240} />
        <Select compact prefix="Pharmacy" value={f.pharmacyId as string} onChange={set('pharmacyId')} options={[{ value: 'all', label: 'All' }, ...db.pharmacies.map((p) => ({ value: p.id, label: p.name }))]} style={{ minWidth: 220 }} width={260} />
        <Select compact prefix="Method" value={f.method as string} onChange={(v) => set('method')(v as OrderFilters['method'])} options={[{ value: 'all', label: 'All' }, { value: 'motorcycle', label: 'Motorcycle' }, { value: 'vehicle', label: 'Vehicle' }, { value: 'drone', label: 'Drone (simulated)' }]} style={{ minWidth: 180 }} />
      </View>
      <DataTable<Order>
        rows={pg.slice}
        keyExtractor={(o) => o.id}
        onRowPress={(o) => setOpenId(o.id)}
        selectedKey={openId}
        minTableWidth={1000}
        emptyTitle="No orders match these filters"
        columns={[
          { key: 'ref', title: 'Order', flex: 1.1, render: (o) => <View><Text variant="bodySm" weight="semibold">{o.reference}</Text><Text variant="caption" tone="muted">{formatRelative(o.createdAt)}</Text></View> },
          { key: 'customer', title: 'Customer', flex: 1.2, render: (o) => name(o.customerId) },
          { key: 'pharmacy', title: 'Pharmacy', flex: 1.4, render: (o) => ph(o.pharmacyId) },
          { key: 'courier', title: 'Courier', flex: 1.1, hideOnMobile: true, render: (o) => courier(o.courierId) ?? <Text variant="caption" tone="muted">—</Text> },
          { key: 'method', title: 'Method', flex: 1, hideOnMobile: true, render: (o) => DELIVERY_METHOD_LABEL[o.deliveryMethod] },
          { key: 'status', title: 'Status', flex: 1.3, render: (o) => <View style={{ gap: 4 }}><OrderStatusBadge order={o} size="sm" />{db.deliveries.find((d) => d.id === o.deliveryId)?.delayed && !['delivered', 'cancelled'].includes(o.status) ? <Badge label="Delayed" tone="warning" size="sm" /> : null}</View> },
          { key: 'total', title: 'Total', flex: 0.8, align: 'right', render: (o) => formatGHS(o.total) },
        ]}
      />
      <View style={{ marginTop: space[3] }}>
        <Pagination page={pg.page} pages={pg.pages} total={pg.total} pageSize={pg.pageSize} onChange={pg.setPage} />
      </View>
      <Drawer visible={!!open} onClose={() => setOpenId(undefined)} title={open ? `${open.reference} · ${ph(open.pharmacyId)}` : ''} width={620}>
        {open ? (
          <View style={{ gap: space[4] }}>
            <AdminOrderTools order={open} />
            <PharmacyOrderPanel order={open} />
          </View>
        ) : null}
      </Drawer>
    </Page>
  );
}
