import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Banknote, CircleCheck, FileText, MapPin, PackageCheck, PackageX, Phone, Store, TriangleAlert, Truck, Undo2 } from '@/components/ui/icons';
import { colors, space } from '@/theme';
import { useCourier } from '@/hooks/useCourier';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAction } from '@/hooks/useAction';
import { useConfirm } from '@/contexts/ConfirmContext';
import { deliveryService, toView } from '@/services/deliveryService';
import { DELIVERY_STATUS } from '@/constants/status';
import { DELIVERY_METHOD_LABEL } from '@/constants/catalog';
import { formatDateTime, formatEta, formatGHS, formatKm, formatTime } from '@/utils/format';
import type { DeliveryStatus } from '@/types';
import { Button, Callout, Card, CardHeader, EmptyState, KeyValue, PageHeader, StatusBadge, Text, Timeline, type TimelineItem } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { RouteMap } from '@/components/illustrations';
import { OrderItemsList } from '@/components/shared/OrderParts';

const STEPS: { status: DeliveryStatus; title: string }[] = [
  { status: 'accepted', title: 'Job accepted' },
  { status: 'at-pharmacy', title: 'Arrived at pharmacy' },
  { status: 'collected', title: 'Order collected' },
  { status: 'en-route', title: 'En route to customer' },
  { status: 'delivered', title: 'Delivered' },
];
const PROGRESS: Partial<Record<DeliveryStatus, number>> = { accepted: 0.05, 'at-pharmacy': 0.08, collected: 0.2, 'en-route': 0.6, delivered: 1, failed: 0.6 };
const FAIL_PRESETS = ['Recipient unreachable', 'Address not found', 'Recipient refused delivery', 'Unsafe to complete delivery', 'Vehicle breakdown'];

export default function ActiveDelivery() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, courier } = useCourier();
  const { isDesktop } = useBreakpoint();
  const { run, loading } = useAction();
  const confirm = useConfirm();
  const delivery = db.deliveries.find((d) => d.id === id && d.courierId === courier?.id);
  const v = delivery ? toView(db, delivery) : null;

  if (!v) {
    return (
      <Page>
        <EmptyState icon={PackageX} title="Delivery not found" message="It may have been reassigned or is not assigned to you." action={<Button label="Back to jobs" onPress={() => router.replace('/courier/jobs')} />} />
      </Page>
    );
  }
  const { order } = v;
  const s = v.delivery.status;
  const rxBlocked = order.requiresPrescription && order.prescriptionStatus !== 'approved';
  const cod = order.paymentStatus === 'cash-due';

  const step = (status: 'at-pharmacy' | 'collected' | 'en-route', msg: string) => run(() => deliveryService.updateDeliveryStatus(v.delivery.id, status), { success: msg });

  const markDelivered = async () => {
    const r = await confirm({
      title: 'Confirm handover',
      message: `Confirm that ${order.reference} was handed to ${order.address.recipientName}${cod ? ` and that you collected ${formatGHS(order.total)} cash` : ''}. This cannot be undone.`,
      confirmLabel: 'Mark delivered',
      tone: 'teal',
    });
    if (r.confirmed) await run(() => deliveryService.updateDeliveryStatus(v.delivery.id, 'delivered'), { success: `${order.reference} delivered` });
  };
  const reportFailure = async () => {
    const r = await confirm({ title: 'Report delivery problem', message: 'The customer, pharmacy and MediFly operations will be notified.', confirmLabel: 'Report failure', tone: 'danger', reason: { label: 'What happened?', presets: FAIL_PRESETS } });
    if (r.confirmed) await run(() => deliveryService.updateDeliveryStatus(v.delivery.id, 'failed', r.reason), { success: 'Delivery exception reported' });
  };
  const release = async () => {
    const r = await confirm({ title: 'Release this job?', message: 'The order returns to the open queue so another courier can collect it.', confirmLabel: 'Release job', tone: 'danger', reason: { label: 'Reason', presets: ['Vehicle issue', 'Running late', 'Personal emergency'] } });
    if (r.confirmed) {
      const ok = await run(() => deliveryService.updateDeliveryStatus(v.delivery.id, 'released', r.reason), { success: 'Job released' });
      if (ok) router.replace('/courier/jobs');
    }
  };

  const reached = new Map(v.delivery.events.map((e) => [e.status, e]));
  const currentIdx = STEPS.findIndex((x) => x.status === s);
  const items: TimelineItem[] = STEPS.map((x, i) => ({
    title: x.title,
    time: reached.get(x.status) ? formatTime(reached.get(x.status)!.at) : undefined,
    state: s === 'failed' ? (reached.has(x.status) ? 'done' : 'upcoming') : i < currentIdx || s === 'delivered' ? 'done' : i === currentIdx ? 'current' : 'upcoming',
  }));
  if (s === 'failed') items.push({ title: 'Delivery failed', description: v.delivery.failureReason, state: 'error', time: reached.get('failed') ? formatTime(reached.get('failed')!.at) : undefined });

  const primary =
    s === 'accepted' ? (
      <Button label="Confirm arrival at pharmacy" icon={Store} size="lg" fullWidth loading={loading} onPress={() => step('at-pharmacy', 'Arrival confirmed — pharmacy notified')} />
    ) : s === 'at-pharmacy' ? (
      <Button label="Confirm collection" icon={PackageCheck} size="lg" fullWidth loading={loading} disabled={rxBlocked} onPress={() => step('collected', 'Collection confirmed')} />
    ) : s === 'collected' ? (
      <Button label="Start delivery" icon={Truck} size="lg" fullWidth loading={loading} onPress={() => step('en-route', 'Delivery started — customer notified')} />
    ) : s === 'en-route' ? (
      <Button label="Mark delivered" icon={CircleCheck} size="lg" variant="teal" fullWidth loading={loading} onPress={markDelivered} />
    ) : null;

  return (
    <Page maxWidth={1100}>
      <PageHeader title={order.reference} subtitle={`${DELIVERY_METHOD_LABEL[v.delivery.method]} · ${formatKm(v.delivery.distanceKm)} · ETA ${formatEta(v.delivery.etaMinutes)}`} backHref="/courier/dashboard" actions={<StatusBadge meta={DELIVERY_STATUS[s]} />} />
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space[5] }}>
        <View style={{ flex: 1.3, gap: space[4] }}>
          <RouteMap progress={PROGRESS[s] ?? 0} pickupLabel={v.pharmacyName} dropLabel={order.address.area.split(',')[0]} method={v.delivery.method} height={isDesktop ? 260 : 200} failed={s === 'failed'} />
          {s === 'delivered' ? <Callout tone="success" icon={CircleCheck} title="Delivered">{`Handed over ${formatDateTime(v.delivery.updatedAt)}. Payout ${formatGHS(v.delivery.payout)} (illustrative).`}</Callout> : null}
          {s === 'failed' ? <Callout tone="danger" icon={TriangleAlert} title="Delivery failed">{`${v.delivery.failureReason ?? ''} Operations will follow up on redelivery or return.`}</Callout> : null}
          {rxBlocked && s === 'at-pharmacy' ? <Callout tone="violet" icon={FileText} title="Do not collect yet">This order contains prescription items that have not been approved by a pharmacist.</Callout> : null}
          {cod && !['delivered', 'failed'].includes(s) ? <Callout tone="info" icon={Banknote} title={`Collect ${formatGHS(order.total)} cash on delivery`}>Cash payment is recorded when you mark the order delivered (simulated).</Callout> : null}
          {primary ? <Card style={{ gap: space[3] }}>{primary}<View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>{['accepted', 'at-pharmacy'].includes(s) ? <Button label="Release job" icon={Undo2} variant="ghost" size="sm" onPress={release} /> : null}{['collected', 'en-route'].includes(s) ? <Button label="Report a problem" icon={TriangleAlert} variant="ghost" size="sm" onPress={reportFailure} /> : null}</View></Card> : null}
          <Card>
            <CardHeader title="Progress" />
            <Timeline items={items} />
          </Card>
        </View>
        <View style={{ flex: 1, gap: space[4] }}>
          <Card style={{ gap: space[2] }}>
            <CardHeader title="Pickup" icon={Store} />
            <Text variant="bodySm" weight="semibold">
              {v.pharmacyName}
            </Text>
            <Text variant="caption" tone="secondary">
              {v.pharmacyAddress}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Phone size={13} color={colors.textMuted} />
              <Text variant="caption" tone="secondary">
                {v.pharmacyPhone}
              </Text>
            </View>
          </Card>
          <Card style={{ gap: space[2] }}>
            <CardHeader title="Drop-off" icon={MapPin} />
            <KeyValue label="Recipient" value={order.address.recipientName} />
            <KeyValue label="Phone (fictional)" value={order.address.phone} />
            <KeyValue label="Address" value={`${order.address.area}, ${v.areaName}`} />
            <KeyValue label="Landmark" value={order.address.landmark} />
            {order.address.instructions ? <Callout tone="warning" title="Delivery instructions">{order.address.instructions}</Callout> : null}
          </Card>
          <Card>
            <CardHeader title="Package" subtitle="Sealed by the pharmacy — do not open" />
            <OrderItemsList order={order} />
          </Card>
        </View>
      </View>
    </Page>
  );
}
