import React, { useState } from 'react';
import { View } from 'react-native';
import { Bell, CheckCheck } from '@/components/ui/icons';
import { space } from '@/theme';
import { Button, Card, Chips, EmptyState, PageHeader, Pagination, usePagination } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { NotificationRow, useNotifications } from '@/components/layout/NotificationPanel';

export function NotificationsPage() {
  const { list, unread, open, markAll } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const shown = filter === 'unread' ? list.filter((n) => !n.read) : list;
  const pg = usePagination(shown, 12);
  return (
    <Page maxWidth={820}>
      <PageHeader title="Notifications" subtitle={`${unread} unread`} actions={unread ? <Button label="Mark all as read" icon={CheckCheck} variant="outline" onPress={() => markAll()} /> : undefined} />
      <View style={{ gap: space[4] }}>
        <Chips value={filter} onChange={(v) => { setFilter(v); pg.setPage(1); }} options={[{ value: 'all', label: `All (${list.length})` }, { value: 'unread', label: `Unread (${unread})` }]} />
        <Card padded={false} style={{ padding: space[2] }}>
          {pg.slice.length === 0 ? <EmptyState icon={Bell} title="No notifications" message="Order, prescription and delivery updates will appear here." /> : pg.slice.map((n) => <NotificationRow key={n.id} n={n} onOpen={open} />)}
        </Card>
        <Pagination page={pg.page} pages={pg.pages} total={pg.total} pageSize={pg.pageSize} onChange={pg.setPage} />
      </View>
    </Page>
  );
}
