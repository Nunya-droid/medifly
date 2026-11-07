import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Package } from '@/components/ui/icons';
import { space } from '@/theme';
import { useCurrentUser, useDb } from '@/hooks/useDb';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { filterOrders, visibleOrders } from '@/services/orderService';
import { ACTIVE_ORDER_STATUSES } from '@/constants/status';
import { Button, Card, EmptyState, PageHeader, Pagination, SearchInput, Tabs, usePagination } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { OrderCard } from '@/components/shared/OrderParts';

export default function MyOrders() {
  const db = useDb();
  const user = useCurrentUser();
  const { isDesktop } = useBreakpoint();
  const [tab, setTab] = useState<'active' | 'closed' | 'all'>('active');
  const [query, setQuery] = useState('');
  const mine = useMemo(() => visibleOrders(db, user), [db, user]);
  const list = useMemo(() => filterOrders(db, mine, { status: tab, query }), [db, mine, tab, query]);
  const pg = usePagination(list, 8);
  const activeCount = mine.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status)).length;

  return (
    <Page maxWidth={1080}>
      <PageHeader title="My orders" subtitle="Track active orders and view your order history." actions={<Button label="New order" onPress={() => router.push('/customer/search')} />} />
      <View style={{ gap: space[4] }}>
        <Tabs
          value={tab}
          onChange={(v) => {
            setTab(v);
            pg.setPage(1);
          }}
          tabs={[
            { value: 'active', label: 'Active', count: activeCount },
            { value: 'closed', label: 'History', count: mine.length - activeCount },
            { value: 'all', label: 'All', count: mine.length },
          ]}
        />
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search by reference or product" />
        {list.length === 0 ? (
          <Card>
            <EmptyState icon={Package} title={tab === 'active' ? 'No active orders' : 'No orders found'} message="Orders you place will appear here with live status updates." action={<Button label="Find medicines" onPress={() => router.push('/customer/search')} />} />
          </Card>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space[2] }}>
            {pg.slice.map((o) => (
              <View key={o.id} style={{ width: isDesktop ? '50%' : '100%', padding: space[2] }}>
                <OrderCard order={o} db={db} onPress={() => router.push(`/customer/orders/${o.id}` as never)} />
              </View>
            ))}
          </View>
        )}
        <Pagination page={pg.page} pages={pg.pages} total={pg.total} pageSize={pg.pageSize} onChange={pg.setPage} />
      </View>
    </Page>
  );
}
