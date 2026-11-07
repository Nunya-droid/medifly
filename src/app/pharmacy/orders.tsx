import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ClipboardList } from '@/components/ui/icons';
import { space } from '@/theme';
import { useDb } from '@/hooks/useDb';
import { useSyncedSelection } from '@/hooks/useSyncedSelection';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { usePharmacyScope } from '@/contexts/PharmacyScope';
import { filterOrders } from '@/services/orderService';
import { DELIVERY_METHOD_LABEL } from '@/constants/catalog';
import type { Order, OrderStatus } from '@/types';
import { formatGHS, formatRelative } from '@/utils/format';
import { Badge, Card, DataTable, Drawer, EmptyState, PageHeader, Pagination, SearchInput, Select, Tabs, Text, usePagination } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { OrderStatusBadge } from '@/components/shared/OrderParts';
import { PharmacyOrderPanel } from '@/components/pharmacy/OrderPanel';

type TabKey = 'all' | 'awaiting-pharmacy' | 'pharmacy-confirmed' | 'preparing' | 'ready-for-collection' | 'out' | 'closed';
const OUT: OrderStatus[] = ['courier-assigned', 'collected', 'en-route'];

export default function PharmacyOrders() {
  const params = useLocalSearchParams<{ id?: string; tab?: TabKey }>();
  const db = useDb();
  const { pharmacyId } = usePharmacyScope();
  const { isDesktop } = useBreakpoint();
  const [tab, setTab] = useState<TabKey>(params.tab ?? 'all');
  const [query, setQuery] = useState('');
  const [rx, setRx] = useState<'all' | 'rx' | 'otc'>('all');
  const [selectedId, setSelectedId] = useSyncedSelection(params.id);

  const mine = useMemo(() => db.orders.filter((o) => o.pharmacyId === pharmacyId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [db, pharmacyId]);
  const filtered = useMemo(() => {
    let list = filterOrders(db, mine, { query });
    if (tab === 'out') list = list.filter((o) => OUT.includes(o.status));
    else if (tab === 'closed') list = list.filter((o) => ['delivered', 'rejected', 'cancelled', 'delivery-failed'].includes(o.status));
    else if (tab === 'preparing') list = list.filter((o) => o.status === 'preparing');
    else if (tab !== 'all') list = list.filter((o) => o.status === tab);
    if (rx !== 'all') list = list.filter((o) => (rx === 'rx' ? o.requiresPrescription : !o.requiresPrescription));
    return list;
  }, [db, mine, query, tab, rx]);
  const pg = usePagination(filtered, 10);
  const selected = mine.find((o) => o.id === selectedId);
  const count = (fn: (o: Order) => boolean) => mine.filter(fn).length;

  const table = (
    <DataTable<Order>
      rows={pg.slice}
      keyExtractor={(o) => o.id}
      selectedKey={selectedId}
      onRowPress={(o) => setSelectedId(o.id)}
      emptyTitle="No orders here"
      minTableWidth={isDesktop ? 560 : 680}
      columns={[
        { key: 'ref', title: 'Order', flex: 1.2, render: (o) => <View><Text variant="bodySm" weight="semibold">{o.reference}</Text><Text variant="caption" tone="muted">{formatRelative(o.createdAt)}</Text></View> },
        { key: 'customer', title: 'Customer', flex: 1.2, render: (o) => <View><Text variant="bodySm" numberOfLines={1}>{o.address.recipientName}</Text><Text variant="caption" tone="muted" numberOfLines={1}>{o.items.length} item{o.items.length > 1 ? 's' : ''}{o.requiresPrescription ? ' · Rx' : ''}</Text></View> },
        { key: 'status', title: 'Status', flex: 1.2, render: (o) => <View style={{ gap: 4 }}><OrderStatusBadge order={o} size="sm" />{o.requiresPrescription && o.prescriptionStatus !== 'approved' ? <Badge label="Rx review" tone="violet" size="sm" /> : null}</View> },
        { key: 'method', title: 'Delivery', flex: 1, hideOnMobile: true, render: (o) => DELIVERY_METHOD_LABEL[o.deliveryMethod] },
        { key: 'total', title: 'Total', flex: 0.8, align: 'right', render: (o) => formatGHS(o.total) },
      ]}
    />
  );

  return (
    <Page maxWidth={1400}>
      <PageHeader title="Orders" subtitle="Confirm stock, review prescriptions, prepare and hand over orders." />
      <View style={{ gap: space[4] }}>
        <Tabs
          value={tab}
          onChange={(v) => {
            setTab(v);
            pg.setPage(1);
          }}
          tabs={[
            { value: 'all', label: 'All', count: mine.length },
            { value: 'awaiting-pharmacy', label: 'New', count: count((o) => o.status === 'awaiting-pharmacy') },
            { value: 'pharmacy-confirmed', label: 'Confirmed', count: count((o) => o.status === 'pharmacy-confirmed') },
            { value: 'preparing', label: 'Preparing', count: count((o) => o.status === 'preparing') },
            { value: 'ready-for-collection', label: 'Ready', count: count((o) => o.status === 'ready-for-collection') },
            { value: 'out', label: 'Out for delivery', count: count((o) => OUT.includes(o.status)) },
            { value: 'closed', label: 'Closed', count: count((o) => ['delivered', 'rejected', 'cancelled', 'delivery-failed'].includes(o.status)) },
          ]}
        />
        <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
          <SearchInput value={query} onChangeText={setQuery} placeholder="Search reference, customer or product" style={{ flex: 1, minWidth: 240 }} />
          <Select compact prefix="Type" value={rx} onChange={setRx} options={[{ value: 'all', label: 'All orders' }, { value: 'rx', label: 'With prescription items' }, { value: 'otc', label: 'Over the counter only' }]} style={{ minWidth: 230 }} />
        </View>
        {isDesktop ? (
          <View style={{ flexDirection: 'row', gap: space[5], alignItems: 'flex-start' }}>
            <View style={{ flex: 1.2, gap: space[3] }}>
              {table}
              <Pagination page={pg.page} pages={pg.pages} total={pg.total} pageSize={pg.pageSize} onChange={pg.setPage} />
            </View>
            <View style={{ flex: 1, minWidth: 380 }}>
              {selected ? (
                <PharmacyOrderPanel order={selected} />
              ) : (
                <Card>
                  <EmptyState icon={ClipboardList} title="Select an order" message="Choose an order to view details and take action." />
                </Card>
              )}
            </View>
          </View>
        ) : (
          <>
            {table}
            <Pagination page={pg.page} pages={pg.pages} total={pg.total} pageSize={pg.pageSize} onChange={pg.setPage} />
            <Drawer visible={!!selected} onClose={() => setSelectedId(undefined)} title={selected?.reference} width={640}>
              {selected ? <PharmacyOrderPanel order={selected} /> : null}
            </Drawer>
          </>
        )}
      </View>
    </Page>
  );
}
