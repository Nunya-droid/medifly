import React from 'react';
import { View } from 'react-native';
import { History } from '@/components/ui/icons';
import { space } from '@/theme';
import { useCourier } from '@/hooks/useCourier';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { formatGHS } from '@/utils/format';
import { Card, EmptyState, PageHeader, Pagination, StatCard, usePagination } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { JobCard } from '@/components/courier/JobCard';

export default function CourierHistory() {
  const { history, stats } = useCourier();
  const { isDesktop } = useBreakpoint();
  const pg = usePagination(history, 8);
  return (
    <Page maxWidth={1100}>
      <PageHeader title="Delivery history" subtitle="Completed and failed deliveries. Earnings are illustrative." />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3], marginBottom: space[5] }}>
        <StatCard label="Delivered" value={stats.completed} tone="success" />
        <StatCard label="Failed" value={stats.failed} tone="danger" />
        <StatCard label="Total earnings (illustrative)" value={formatGHS(stats.earningsTotal)} tone="teal" />
      </View>
      {history.length === 0 ? (
        <Card>
          <EmptyState icon={History} title="No completed deliveries yet" />
        </Card>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space[2] }}>
          {pg.slice.map((v) => (
            <View key={v.delivery.id} style={{ width: isDesktop ? '50%' : '100%', padding: space[2] }}>
              <JobCard v={v} kind="history" />
            </View>
          ))}
        </View>
      )}
      <Pagination page={pg.page} pages={pg.pages} total={pg.total} pageSize={pg.pageSize} onChange={pg.setPage} />
    </Page>
  );
}
