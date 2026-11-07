import React, { useState } from 'react';
import { View } from 'react-native';
import { ClipboardList } from '@/components/ui/icons';
import { space } from '@/theme';
import { useCourier } from '@/hooks/useCourier';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Callout, Card, EmptyState, PageHeader, Tabs } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { JobCard } from '@/components/courier/JobCard';

export default function CourierJobs() {
  const { courier, jobs, active } = useCourier();
  const { isDesktop } = useBreakpoint();
  const [tab, setTab] = useState<'available' | 'upcoming' | 'active'>('available');
  const available = [...jobs.offered, ...jobs.open];
  const list = tab === 'available' ? available : tab === 'upcoming' ? jobs.upcoming : active;

  return (
    <Page maxWidth={1100}>
      <PageHeader title="Delivery jobs" subtitle={`Jobs matching your ${courier?.vehicleType ?? ''} and service areas.`} />
      <Tabs
        value={tab}
        onChange={setTab}
        style={{ marginBottom: space[4] }}
        tabs={[
          { value: 'available', label: 'Available', count: available.length },
          { value: 'upcoming', label: 'Being prepared', count: jobs.upcoming.length },
          { value: 'active', label: 'My active', count: active.length },
        ]}
      />
      {courier?.availability === 'offline' && tab === 'available' ? <Callout tone="warning">You are offline. Set yourself to available on the Today screen to accept jobs.</Callout> : null}
      {list.length === 0 ? (
        <Card>
          <EmptyState icon={ClipboardList} title={tab === 'available' ? 'No jobs available' : tab === 'upcoming' ? 'Nothing being prepared nearby' : 'No active deliveries'} message={tab === 'available' ? 'Jobs appear here as soon as a pharmacy marks an order ready for collection.' : undefined} />
        </Card>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space[2], marginTop: space[2] }}>
          {list.map((v) => (
            <View key={v.delivery.id} style={{ width: isDesktop ? '50%' : '100%', padding: space[2] }}>
              <JobCard v={v} kind={tab === 'active' ? 'active' : tab === 'upcoming' ? 'upcoming' : jobs.offered.includes(v) ? 'offered' : 'open'} />
            </View>
          ))}
        </View>
      )}
    </Page>
  );
}
