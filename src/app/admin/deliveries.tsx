import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Clock, MapPin, Truck } from '@/components/ui/icons';
import { colors, space } from '@/theme';
import { useDb } from '@/hooks/useDb';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAction } from '@/hooks/useAction';
import { useConfirm } from '@/contexts/ConfirmContext';
import { ACTIVE_DELIVERY, deliveryService, toView, type DeliveryView } from '@/services/deliveryService';
import { DELIVERY_STATUS } from '@/constants/status';
import { DELIVERY_METHOD_LABEL } from '@/constants/catalog';
import { formatEta, formatKm, formatRelative } from '@/utils/format';
import { Badge, Button, Callout, Card, EmptyState, PageHeader, StatCard, StatusBadge, Tabs, Text } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { RouteMap } from '@/components/illustrations';
import { routeProgress } from '@/components/shared/OrderParts';

const FAIL_PRESETS = ['Recipient unreachable', 'Address not found', 'Courier incident', 'Unsafe conditions'];

function DeliveryCard({ v }: { v: DeliveryView }) {
  const { run, loading } = useAction();
  const confirm = useConfirm();
  const s = v.delivery.status;
  const next: Record<string, { to: 'at-pharmacy' | 'collected' | 'en-route' | 'delivered'; label: string } | undefined> = {
    accepted: { to: 'at-pharmacy', label: 'Mark at pharmacy' },
    'at-pharmacy': { to: 'collected', label: 'Mark collected' },
    collected: { to: 'en-route', label: 'Mark en route' },
    'en-route': { to: 'delivered', label: 'Mark delivered' },
  };
  const step = next[s];
  const advance = async () => {
    if (!step) return;
    const r = await confirm({ title: `${step.label}?`, message: `Operations override on behalf of ${v.courier?.name ?? 'the courier'} (simulated). This is audit-logged.`, confirmLabel: step.label });
    if (r.confirmed) run(() => deliveryService.updateDeliveryStatus(v.delivery.id, step.to), { success: `${v.order.reference}: ${step.label.toLowerCase()}` });
  };
  const fail = async () => {
    const r = await confirm({ title: `Mark ${v.order.reference} as failed?`, confirmLabel: 'Mark failed', tone: 'danger', reason: { label: 'Reason', presets: FAIL_PRESETS } });
    if (r.confirmed) run(() => deliveryService.updateDeliveryStatus(v.delivery.id, 'failed', r.reason), { success: 'Delivery marked failed' });
  };
  return (
    <Card style={{ gap: space[3] }}>
      <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 160 }}>
          <Text variant="title">{v.order.reference}</Text>
          <Text variant="caption" tone="secondary">
            {v.courier?.name ?? 'Unassigned'} · {DELIVERY_METHOD_LABEL[v.delivery.method]} · updated {formatRelative(v.delivery.updatedAt)}
          </Text>
        </View>
        {v.delivery.delayed && s !== 'failed' ? <Badge label="Delayed" tone="warning" icon={Clock} size="sm" /> : null}
        <StatusBadge meta={DELIVERY_STATUS[s]} size="sm" />
      </View>
      <RouteMap progress={routeProgress(v.order)} pickupLabel={v.pharmacyName} dropLabel={v.areaName} method={v.delivery.method} height={150} compact failed={s === 'failed'} />
      <View style={{ flexDirection: 'row', gap: space[3], flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
          <MapPin size={13} color={colors.textMuted} />
          <Text variant="caption" tone="secondary">
            {v.pharmacyName} → {v.order.address.area.split(',')[0]}, {v.areaName}
          </Text>
        </View>
        <Text variant="caption" tone="secondary">
          {formatKm(v.delivery.distanceKm)} · ETA {formatEta(v.delivery.etaMinutes)}
        </Text>
      </View>
      {s === 'failed' ? <Callout tone="danger">{v.delivery.failureReason ?? 'Delivery failed'}</Callout> : null}
      <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
        {step ? <Button label={step.label} size="sm" variant="secondary" loading={loading} onPress={advance} /> : null}
        {['collected', 'en-route'].includes(s) ? <Button label="Mark failed" size="sm" variant="ghost" onPress={fail} /> : null}
        {s === 'failed' || s === 'accepted' ? <Button label="Re-dispatch" size="sm" onPress={async () => { const r = await confirm({ title: `Re-dispatch ${v.order.reference}?`, message: 'The order returns to the open job queue.', confirmLabel: 'Re-dispatch' }); if (r.confirmed) run(() => deliveryService.intervene(v.delivery.id, 'redispatch'), { success: 'Returned to dispatch queue' }); }} /> : null}
        {ACTIVE_DELIVERY.includes(s) ? <Button label={v.delivery.delayed ? 'Clear delay' : 'Flag delay'} size="sm" variant="ghost" onPress={() => run(() => deliveryService.intervene(v.delivery.id, v.delivery.delayed ? 'clear-delay' : 'flag-delay'), { success: v.delivery.delayed ? 'Delay cleared' : 'Delay flagged — customer notified' })} /> : null}
      </View>
    </Card>
  );
}

export default function DeliveryMonitoring() {
  const db = useDb();
  const { isDesktop } = useBreakpoint();
  const [tab, setTab] = useState<'active' | 'waiting' | 'exceptions' | 'completed'>('active');
  const views = useMemo(() => db.deliveries.map((d) => toView(db, d)).filter((v): v is DeliveryView => !!v).sort((a, b) => b.delivery.updatedAt.localeCompare(a.delivery.updatedAt)), [db]);
  const groups = {
    active: views.filter((v) => ACTIVE_DELIVERY.includes(v.delivery.status)),
    waiting: views.filter((v) => ['open', 'offered'].includes(v.delivery.status)),
    exceptions: views.filter((v) => v.delivery.status === 'failed' || (v.delivery.delayed && ACTIVE_DELIVERY.includes(v.delivery.status))),
    completed: views.filter((v) => v.delivery.status === 'delivered').slice(0, 20),
  };
  const list = groups[tab];

  return (
    <Page maxWidth={1400}>
      <PageHeader title="Delivery monitoring" subtitle="Simulated route views based on status updates — not live GPS." />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3], marginBottom: space[5] }}>
        <StatCard label="Active" value={groups.active.length} icon={Truck} tone="info" onPress={() => setTab('active')} />
        <StatCard label="Waiting for courier" value={groups.waiting.length} tone="warning" onPress={() => setTab('waiting')} />
        <StatCard label="Exceptions" value={groups.exceptions.length} tone="danger" onPress={() => setTab('exceptions')} />
        <StatCard label="Delivered" value={views.filter((v) => v.delivery.status === 'delivered').length} tone="success" onPress={() => setTab('completed')} />
      </View>
      <Tabs
        value={tab}
        onChange={setTab}
        style={{ marginBottom: space[4] }}
        tabs={[
          { value: 'active', label: 'Active', count: groups.active.length },
          { value: 'waiting', label: 'Waiting for courier', count: groups.waiting.length },
          { value: 'exceptions', label: 'Delayed & failed', count: groups.exceptions.length },
          { value: 'completed', label: 'Recently delivered', count: groups.completed.length },
        ]}
      />
      {list.length === 0 ? (
        <Card>
          <EmptyState icon={Truck} title="Nothing in this view" />
        </Card>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space[2] }}>
          {list.map((v) => (
            <View key={v.delivery.id} style={{ width: isDesktop ? '50%' : '100%', padding: space[2] }}>
              <DeliveryCard v={v} />
            </View>
          ))}
        </View>
      )}
    </Page>
  );
}
