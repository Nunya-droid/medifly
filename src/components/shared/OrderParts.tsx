import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ChevronRight, FileText, MapPin, Store } from '@/components/ui/icons';
import type { Database, Order } from '@/types';
import { colors, radius, space } from '@/theme';
import { ORDER_FLOW, ORDER_STATUS, PRESCRIPTION_STATUS, PAYMENT_STATUS } from '@/constants/status';
import { DELIVERY_METHOD_LABEL, PAYMENT_METHOD_LABEL } from '@/constants/catalog';
import { formatDateTime, formatEta, formatGHS, formatRelative, formatTime } from '@/utils/format';
import { Badge, Card, KeyValue, StatusBadge, Text, Timeline, type TimelineItem } from '@/components/ui';
import { MethodIcon } from '@/components/illustrations';

export function OrderStatusBadge({ order, size }: { order: Pick<Order, 'status'>; size?: 'sm' | 'md' }) {
  return <StatusBadge meta={ORDER_STATUS[order.status]} size={size} />;
}

/** Progress 0..1 along the delivery route, derived from status — not GPS. */
export function routeProgress(order: Order): number {
  switch (order.status) {
    case 'courier-assigned':
      return 0.08;
    case 'collected':
      return 0.22;
    case 'en-route': {
      const started = order.timeline.find((e) => e.status === 'en-route');
      if (!started) return 0.5;
      const elapsed = (Date.now() - new Date(started.at).getTime()) / 60000;
      const span = Math.max(10, order.etaMinutes.max - 20);
      return Math.min(0.92, 0.3 + (elapsed / span) * 0.6);
    }
    case 'delivered':
      return 1;
    case 'delivery-failed':
      return 0.6;
    default:
      return 0;
  }
}

export function buildOrderTimeline(order: Order): TimelineItem[] {
  const reached = new Map(order.timeline.map((e) => [e.status, e]));
  const terminal = ['rejected', 'cancelled', 'delivery-failed'].includes(order.status) ? order.timeline[order.timeline.length - 1] : null;
  const items: TimelineItem[] = [];
  for (const s of ORDER_FLOW) {
    if (s === 'placed') continue;
    const ev = reached.get(s);
    if (terminal && !ev) break;
    const isCurrent = order.status === s && s !== 'delivered';
    items.push({
      title: s === 'awaiting-pharmacy' ? 'Order placed — awaiting pharmacy' : ORDER_STATUS[s].label,
      description: ev?.note ?? (isCurrent ? ORDER_STATUS[s].description : undefined),
      time: ev ? formatTime(ev.at) : undefined,
      state: ev ? (isCurrent ? 'current' : 'done') : 'upcoming',
    });
  }
  if (terminal) items.push({ title: ORDER_STATUS[terminal.status].label, description: terminal.note, time: formatTime(terminal.at), state: 'error' });
  return items;
}

export function OrderTimeline({ order }: { order: Order }) {
  return <Timeline items={buildOrderTimeline(order)} />;
}

export function OrderItemsList({ order }: { order: Order }) {
  return (
    <View style={{ gap: space[3] }}>
      {order.items.map((i) => (
        <View key={i.productId} style={styles.itemRow}>
          <View style={{ flex: 1 }}>
            <Text variant="bodySm" weight="semibold">
              {i.name} {i.strength ?? ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center', flexWrap: 'wrap' }}>
              <Text variant="caption" tone="secondary">
                {i.packSize} · Qty {i.quantity} × {formatGHS(i.unitPrice)}
              </Text>
              {i.requiresPrescription ? <Badge label="Prescription" tone="violet" size="sm" icon={FileText} /> : null}
            </View>
          </View>
          <Text variant="bodySm" weight="semibold" tabular>
            {formatGHS(i.unitPrice * i.quantity)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function OrderTotals({ order }: { order: Order }) {
  return (
    <View>
      <KeyValue label="Medicine subtotal" value={formatGHS(order.subtotal)} />
      <KeyValue label={`Delivery (${DELIVERY_METHOD_LABEL[order.deliveryMethod]})`} value={formatGHS(order.deliveryFee)} />
      <KeyValue label="Total" value={formatGHS(order.total)} strong />
      <KeyValue label="Payment">
        <View style={{ alignItems: 'flex-end', gap: 4, flex: 1 }}>
          <Text variant="bodySm" weight="medium" align="right">
            {PAYMENT_METHOD_LABEL[order.paymentMethod]}
          </Text>
          <StatusBadge meta={PAYMENT_STATUS[order.paymentStatus]} size="sm" />
        </View>
      </KeyValue>
    </View>
  );
}

/** Compact order summary card used in lists (customer, pharmacy, admin). */
export function OrderCard({ order, db, onPress, showCustomer, showPharmacy = true }: { order: Order; db: Database; onPress?: () => void; showCustomer?: boolean; showPharmacy?: boolean }) {
  const pharmacy = db.pharmacies.find((p) => p.id === order.pharmacyId);
  const area = db.serviceAreas.find((a) => a.id === order.address.serviceAreaId);
  const customer = db.users.find((u) => u.id === order.customerId);
  const items = order.items.map((i) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ');
  return (
    <Card onPress={onPress} accessibilityLabel={`Order ${order.reference}`} style={{ gap: space[3] }}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text variant="title">{order.reference}</Text>
          <Text variant="caption" tone="muted">
            {formatRelative(order.createdAt)} · {formatDateTime(order.createdAt)}
          </Text>
        </View>
        <OrderStatusBadge order={order} />
      </View>
      <Text variant="bodySm" numberOfLines={2}>
        {items}
      </Text>
      <View style={styles.meta}>
        {showPharmacy ? (
          <View style={styles.metaItem}>
            <Store size={14} color={colors.textMuted} />
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {pharmacy?.name}
            </Text>
          </View>
        ) : null}
        {showCustomer ? (
          <View style={styles.metaItem}>
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {customer?.name}
            </Text>
          </View>
        ) : null}
        <View style={styles.metaItem}>
          <MapPin size={14} color={colors.textMuted} />
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {area?.name}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <MethodIcon method={order.deliveryMethod} size={14} color={colors.textMuted} />
          <Text variant="caption" tone="secondary">
            {DELIVERY_METHOD_LABEL[order.deliveryMethod]}
          </Text>
        </View>
        {order.requiresPrescription ? <StatusBadge meta={PRESCRIPTION_STATUS[order.prescriptionStatus]} size="sm" /> : null}
      </View>
      <View style={styles.cardBottom}>
        <Text variant="title" tabular>
          {formatGHS(order.total)}
        </Text>
        {onPress ? <ChevronRight size={18} color={colors.textMuted} /> : null}
      </View>
    </Card>
  );
}

export function EtaText({ order }: { order: Order }) {
  if (order.status === 'delivered') return <Text variant="bodySm">Delivered {formatRelative(order.updatedAt).toLowerCase()}</Text>;
  return <Text variant="bodySm">Estimated {formatEta(order.etaMinutes)} from confirmation (simulated)</Text>;
}

const styles = StyleSheet.create({
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], paddingBottom: space[3], borderBottomWidth: 1, borderBottomColor: colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3], alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: 220 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space[3], borderTopWidth: 1, borderTopColor: colors.border },
  pill: { borderRadius: radius.pill },
});
