import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { CircleCheck, ClipboardList, Gauge, Route, Wallet } from '@/components/ui/icons';
import { colors, radius, space } from '@/theme';
import { useCourier } from '@/hooks/useCourier';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAction } from '@/hooks/useAction';
import { deliveryService } from '@/services/deliveryService';
import { formatGHS } from '@/utils/format';
import type { CourierAvailability } from '@/types';
import { Button, Callout, Card, Chips, EmptyState, PageHeader, SectionTitle, StatCard, Text } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { JobCard } from '@/components/courier/JobCard';

export default function CourierDashboard() {
  const { courier, user, jobs, active, stats } = useCourier();
  const { isDesktop } = useBreakpoint();
  const { run } = useAction();
  if (!courier) return <Page><EmptyState title="No courier profile linked" /></Page>;
  const available = [...jobs.offered, ...jobs.open];

  return (
    <Page maxWidth={1100}>
      <PageHeader title={`Hi, ${user?.name.split(' ')[0]}`} subtitle={`${courier.vehicleDescription}${courier.plate ? ` · ${courier.plate}` : ''}`} />
      <Card style={{ gap: space[3], marginBottom: space[5], backgroundColor: courier.availability === 'offline' ? colors.surfaceSunken : colors.surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], flexWrap: 'wrap' }}>
          <View style={{ width: 12, height: 12, borderRadius: radius.pill, backgroundColor: courier.availability === 'available' ? colors.success : courier.availability === 'busy' ? colors.warning : colors.textMuted }} />
          <View style={{ flex: 1, minWidth: 160 }}>
            <Text variant="title">Availability</Text>
            <Text variant="caption" tone="secondary">
              {courier.availability === 'offline' ? 'You are offline and will not receive new jobs.' : courier.availability === 'busy' ? 'Busy — you can still accept offered jobs.' : 'Online and ready for jobs.'}
            </Text>
          </View>
          <Chips<CourierAvailability>
            value={courier.availability}
            onChange={(v) => run(() => deliveryService.setAvailability(v), { success: v === 'offline' ? 'You are now offline' : `Status set to ${v}` })}
            options={[
              { value: 'available', label: 'Available' },
              { value: 'busy', label: 'Busy' },
              { value: 'offline', label: 'Offline' },
            ]}
          />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3], marginBottom: space[6] }}>
        <StatCard label="Available jobs" value={available.length} icon={ClipboardList} tone="warning" onPress={() => router.push('/courier/jobs')} />
        <StatCard label="Active deliveries" value={stats.active} icon={Route} tone="info" />
        <StatCard label="Completed today" value={stats.completedToday} icon={CircleCheck} tone="success" hint={`${stats.completed} all time`} />
        <StatCard label="Earnings today" value={formatGHS(stats.earningsToday)} icon={Wallet} tone="teal" hint={`Illustrative · ${stats.distanceToday.toFixed(1)} km today`} />
        <StatCard label="Success rate" value={stats.successRate == null ? '—' : `${Math.round(stats.successRate * 100)}%`} icon={Gauge} tone="neutral" hint={`${stats.failed} failed`} />
      </View>

      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space[6] }}>
        <View style={{ flex: 1, gap: space[3] }}>
          <SectionTitle title={`Active (${active.length})`} />
          {active.length ? active.map((v) => <JobCard key={v.delivery.id} v={v} kind="active" />) : <Card><EmptyState compact title="No active delivery" message="Accept a job to get started." /></Card>}
        </View>
        <View style={{ flex: 1, gap: space[3] }}>
          <SectionTitle title={`Available jobs (${available.length})`} action={<Button label="All jobs" variant="ghost" size="sm" onPress={() => router.push('/courier/jobs')} />} />
          {courier.availability === 'offline' ? <Callout tone="warning">Go online to accept jobs.</Callout> : null}
          {available.length ? available.slice(0, 3).map((v) => <JobCard key={v.delivery.id} v={v} kind={jobs.offered.includes(v) ? 'offered' : 'open'} />) : <Card><EmptyState compact title="No jobs right now" message="New jobs appear when pharmacies mark orders ready." /></Card>}
        </View>
      </View>
    </Page>
  );
}
