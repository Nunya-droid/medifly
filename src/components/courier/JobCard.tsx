import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Check, MapPin, Package, Phone, Store, X } from '@/components/ui/icons';
import { colors, radius, space } from '@/theme';
import type { DeliveryView } from '@/services/deliveryService';
import { deliveryService } from '@/services/deliveryService';
import { useAction } from '@/hooks/useAction';
import { useConfirm } from '@/contexts/ConfirmContext';
import { DELIVERY_STATUS, ORDER_STATUS } from '@/constants/status';
import { DELIVERY_METHOD_LABEL } from '@/constants/catalog';
import { formatGHS, formatKm, formatRelative } from '@/utils/format';
import { Badge, Button, Card, StatusBadge, Text } from '@/components/ui';
import { MethodIcon } from '@/components/illustrations';

export function JobCard({ v, kind }: { v: DeliveryView; kind: 'offered' | 'open' | 'upcoming' | 'active' | 'history' }) {
  const { run, loading } = useAction();
  const confirm = useConfirm();
  const accept = async () => {
    const r = await run(() => deliveryService.acceptJob(v.delivery.id), { success: `Accepted ${v.order.reference}` });
    if (r) router.push(`/courier/deliveries/${v.delivery.id}` as never);
  };
  const decline = async () => {
    const r = await confirm({ title: `Decline ${v.order.reference}?`, message: kind === 'offered' ? 'The pharmacy will be told and the job returns to the open queue.' : 'This job will be hidden from your list.', confirmLabel: 'Decline', reason: { label: 'Reason (optional)', optional: true, presets: ['Too far', 'Vehicle issue', 'Ending shift'] } });
    if (r.confirmed) run(() => deliveryService.declineJob(v.delivery.id, r.reason), { success: 'Job declined' });
  };
  const open = () => router.push(`/courier/deliveries/${v.delivery.id}` as never);

  return (
    <Card style={[{ gap: space[3] }, kind === 'offered' && { borderColor: colors.violet }]} onPress={kind === 'active' || kind === 'history' ? open : undefined} accessibilityLabel={`Delivery ${v.order.reference}`}>
      <View style={styles.top}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="title">{v.order.reference}</Text>
          <Text variant="caption" tone="muted">
            {kind === 'history' ? formatRelative(v.delivery.updatedAt) : `Updated ${formatRelative(v.delivery.updatedAt)}`}
          </Text>
        </View>
        {kind === 'offered' ? <Badge label="Offered to you" tone="violet" size="sm" /> : kind === 'upcoming' ? <Badge label={ORDER_STATUS[v.order.status].label} tone="neutral" size="sm" /> : <StatusBadge meta={DELIVERY_STATUS[v.delivery.status]} size="sm" />}
      </View>
      <View style={styles.route}>
        <View style={styles.leg}>
          <View style={[styles.dot, { backgroundColor: colors.teal }]}>
            <Store size={12} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodySm" weight="semibold">
              {v.pharmacyName}
            </Text>
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {v.pharmacyAddress}
            </Text>
          </View>
        </View>
        <View style={styles.connector} />
        <View style={styles.leg}>
          <View style={[styles.dot, { backgroundColor: colors.navy }]}>
            <MapPin size={12} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodySm" weight="semibold">
              {v.order.address.area}
            </Text>
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {v.areaName} · {v.order.address.landmark}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.facts}>
        <View style={styles.fact}>
          <MethodIcon method={v.delivery.method} size={14} color={colors.textSecondary} />
          <Text variant="caption" tone="secondary">
            {DELIVERY_METHOD_LABEL[v.delivery.method]}
          </Text>
        </View>
        <Text variant="caption" tone="secondary">
          {formatKm(v.delivery.distanceKm)}
        </Text>
        <View style={styles.fact}>
          <Package size={14} color={colors.textSecondary} />
          <Text variant="caption" tone="secondary">
            {v.order.items.reduce((s, i) => s + i.quantity, 0)} item(s){v.order.paymentStatus === 'cash-due' ? ` · collect ${formatGHS(v.order.total)}` : ''}
          </Text>
        </View>
        {kind !== 'history' ? (
          <View style={styles.fact}>
            <Phone size={14} color={colors.textSecondary} />
            <Text variant="caption" tone="secondary">
              {v.order.address.recipientName} · {v.order.address.phone}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.bottom}>
        <View>
          <Text variant="caption" tone="muted">
            Your payout (illustrative)
          </Text>
          <Text variant="h3" tabular>
            {formatGHS(v.delivery.payout)}
          </Text>
        </View>
        {kind === 'offered' || kind === 'open' ? (
          <View style={{ flexDirection: 'row', gap: space[2] }}>
            <Button label="Decline" icon={X} variant="outline" onPress={decline} />
            <Button label="Accept" icon={Check} loading={loading} onPress={accept} />
          </View>
        ) : kind === 'active' ? (
          <Button label="Open delivery" onPress={open} />
        ) : kind === 'upcoming' ? (
          <Text variant="caption" tone="secondary">
            Pharmacy is preparing
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  route: { gap: 2 },
  leg: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  connector: { width: 2, height: 14, backgroundColor: colors.border, marginLeft: 11 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3], padding: space[3], borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3], flexWrap: 'wrap' },
});
