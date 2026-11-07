import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { space } from '@/theme';
import { useDb } from '@/hooks/useDb';
import { usePharmacyScope } from '@/contexts/PharmacyScope';
import { filterOrders } from '@/services/orderService';
import { CLOSED_ORDER_STATUSES, ORDER_STATUS } from '@/constants/status';
import { DELIVERY_METHOD_LABEL } from '@/constants/catalog';
import { formatDateTime, formatGHS } from '@/utils/format';
import type { Order, OrderStatus } from '@/types';
import { DataTable, PageHeader, Pagination, SearchInput, Select, Text, usePagination } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { OrderStatusBadge } from '@/components/shared/OrderParts';

export default function PharmacyHistory() {
  const db = useDb();
  const { pharmacyId } = usePharmacyScope();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | OrderStatus>('all');
  const list = useMemo(() => filterOrders(db, db.orders.filter((o) => o.pharmacyId === pharmacyId && CLOSED_ORDER_STATUSES.includes(o.status)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), { query, status }), [db, pharmacyId, query, status]);
  const pg = usePagination(list, 12);
  return (
    <Page maxWidth={1300}>
      <PageHeader title="Order history" subtitle="Completed, rejected, cancelled and failed orders." />
      <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap', marginBottom: space[4] }}>
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search reference, customer or product" style={{ flex: 1, minWidth: 240 }} />
        <Select compact prefix="Status" value={status} onChange={setStatus} options={[{ value: 'all', label: 'All closed' }, ...CLOSED_ORDER_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS[s].label }))]} style={{ minWidth: 200 }} />
      </View>
      <DataTable<Order>
        rows={pg.slice}
        keyExtractor={(o) => o.id}
        onRowPress={(o) => router.push(`/pharmacy/orders?id=${o.id}&tab=closed` as never)}
        emptyTitle="No closed orders yet"
        columns={[
          { key: 'ref', title: 'Order', flex: 1.1, render: (o) => <Text variant="bodySm" weight="semibold">{o.reference}</Text> },
          { key: 'date', title: 'Closed', flex: 1.3, render: (o) => formatDateTime(o.updatedAt) },
          { key: 'customer', title: 'Recipient', flex: 1.2, render: (o) => o.address.recipientName },
          { key: 'items', title: 'Items', flex: 1.8, hideOnMobile: true, render: (o) => <Text variant="bodySm" numberOfLines={1}>{o.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}</Text> },
          { key: 'method', title: 'Delivery', flex: 1.1, hideOnMobile: true, render: (o) => DELIVERY_METHOD_LABEL[o.deliveryMethod] },
          { key: 'status', title: 'Outcome', flex: 1.1, render: (o) => <OrderStatusBadge order={o} size="sm" /> },
          { key: 'total', title: 'Subtotal', flex: 0.9, align: 'right', render: (o) => formatGHS(o.subtotal) },
        ]}
      />
      <View style={{ marginTop: space[3] }}>
        <Pagination page={pg.page} pages={pg.pages} total={pg.total} pageSize={pg.pageSize} onChange={pg.setPage} />
      </View>
    </Page>
  );
}
