import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Bike, MapPin, Truck, UserCheck } from '@/components/ui/icons';
import { colors, space } from '@/theme';
import { useDb } from '@/hooks/useDb';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAction } from '@/hooks/useAction';
import { usePharmacyScope } from '@/contexts/PharmacyScope';
import { deliveryService, toView, type DeliveryView } from '@/services/deliveryService';
import { DELIVERY_STATUS } from '@/constants/status';
import { DELIVERY_METHOD_LABEL } from '@/constants/catalog';
import { formatGHS, formatKm, formatRelative } from '@/utils/format';
import type { Courier } from '@/types';
import { Avatar, Badge, Button, Callout, Card, CardHeader, EmptyState, PageHeader, StatusBadge, Text } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { OrderStatusBadge } from '@/components/shared/OrderParts';
import { MethodIcon } from '@/components/illustrations';

function ReadyCard({ v, couriers }: { v: DeliveryView; couriers: Courier[] }) {
  const { run, loading } = useAction();
  const db = useDb();
  const pharmacyArea = db.pharmacies.find((p) => p.id === v.order.pharmacyId)?.serviceAreaId ?? '';
  const offeredTo = couriers.find((c) => c.id === v.delivery.offeredToCourierId);
  const candidates = couriers.filter((c) => c.vehicleType === v.delivery.method && (c.serviceAreaIds.includes(v.order.address.serviceAreaId) || c.serviceAreaIds.includes(pharmacyArea)) && c.availability !== 'offline' && c.verification === 'verified');
  const fallback = couriers.filter((c) => c.vehicleType === v.delivery.method && c.availability !== 'offline' && c.verification === 'verified' && !candidates.includes(c));
  const list = [...candidates, ...fallback];
  return (
    <Card style={{ gap: space[3] }}>
      <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 180 }}>
          <Text variant="title">{v.order.reference}</Text>
          <Text variant="caption" tone="secondary">
            Ready {formatRelative(v.delivery.updatedAt)} · {v.order.items.length} item(s) · pickup at counter
          </Text>
        </View>
        <StatusBadge meta={DELIVERY_STATUS[v.delivery.status]} size="sm" />
      </View>
      <View style={{ flexDirection: 'row', gap: space[4], flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <MapPin size={14} color={colors.textMuted} />
          <Text variant="caption" tone="secondary">
            {v.order.address.area}, {v.areaName} · {formatKm(v.delivery.distanceKm)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <MethodIcon method={v.delivery.method} size={14} color={colors.textMuted} />
          <Text variant="caption" tone="secondary">
            {DELIVERY_METHOD_LABEL[v.delivery.method]} · fee {formatGHS(v.delivery.fee)}
          </Text>
        </View>
      </View>
      {offeredTo ? <Callout tone="violet">{`Offered to ${offeredTo.name} — waiting for them to accept. Other couriers can still see this job if they decline.`}</Callout> : <Text variant="caption" tone="secondary">Visible to all matching couriers as an open job. You can also offer it directly:</Text>}
      {v.delivery.declinedBy.length ? (
        <Text variant="caption" tone="muted">
          Declined by: {v.delivery.declinedBy.map((id) => couriers.find((c) => c.id === id)?.name).join(', ')}
        </Text>
      ) : null}
      {list.length === 0 ? (
        <Callout tone="warning">No {v.delivery.method} partner is online. The job stays open until one becomes available.</Callout>
      ) : (
        <View style={{ gap: space[2] }}>
          {list.map((c) => (
            <View key={c.id} style={{ flexDirection: 'row', gap: space[3], alignItems: 'center', flexWrap: 'wrap' }}>
              <Avatar name={c.name} size={32} />
              <View style={{ flex: 1, minWidth: 140 }}>
                <Text variant="bodySm" weight="semibold">
                  {c.name}
                </Text>
                <Text variant="caption" tone="secondary">
                  {c.vehicleDescription} · ★ {c.rating.toFixed(1)}
                  {!candidates.includes(c) ? ' · outside usual area' : ''}
                </Text>
              </View>
              <Badge label={c.availability === 'available' ? 'Available' : 'Busy'} tone={c.availability === 'available' ? 'success' : 'warning'} size="sm" dot />
              <Button label={offeredTo?.id === c.id ? 'Offered' : 'Offer job'} size="sm" variant={offeredTo?.id === c.id ? 'secondary' : 'primary'} disabled={offeredTo?.id === c.id} loading={loading} onPress={() => run(() => deliveryService.assignCourier(v.order.id, c.id), { success: `${v.order.reference} offered to ${c.name}` })} />
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

export default function Dispatch() {
  const db = useDb();
  const { pharmacyId } = usePharmacyScope();
  const { isDesktop } = useBreakpoint();
  const views = useMemo(() => db.deliveries.map((d) => toView(db, d)).filter((v): v is DeliveryView => !!v && v.order.pharmacyId === pharmacyId), [db, pharmacyId]);
  const ready = views.filter((v) => v.order.status === 'ready-for-collection');
  const out = views.filter((v) => ['courier-assigned', 'collected', 'en-route'].includes(v.order.status));
  const failed = views.filter((v) => v.order.status === 'delivery-failed');
  const upcoming = views.filter((v) => ['pharmacy-confirmed', 'preparing'].includes(v.order.status));
  const couriers = db.couriers.filter((c) => c.verification === 'verified');

  return (
    <Page maxWidth={1300}>
      <PageHeader title="Dispatch" subtitle="Hand ready orders to verified delivery partners and follow them out the door." />
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space[6] }}>
        <View style={{ flex: 1.5, gap: space[4], minWidth: 0 }}>
          <Text variant="h3">Awaiting collection ({ready.length})</Text>
          {ready.length === 0 ? (
            <Card>
              <EmptyState icon={Truck} title="No orders waiting" message={upcoming.length ? `${upcoming.length} order(s) are being prepared.` : 'Mark an order ready for collection to dispatch it.'} compact />
            </Card>
          ) : (
            ready.map((v) => <ReadyCard key={v.delivery.id} v={v} couriers={couriers} />)
          )}
          {failed.length ? (
            <>
              <Text variant="h3">Failed deliveries ({failed.length})</Text>
              {failed.map((v) => (
                <Card key={v.delivery.id} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', gap: space[2] }}>
                    <Text variant="title" style={{ flex: 1 }}>
                      {v.order.reference}
                    </Text>
                    <OrderStatusBadge order={v.order} size="sm" />
                  </View>
                  <Text variant="caption" tone="secondary">
                    {v.delivery.failureReason} · MediFly operations will arrange redelivery or return.
                  </Text>
                </Card>
              ))}
            </>
          ) : null}
        </View>
        <View style={{ flex: 1, gap: space[4], minWidth: 0 }}>
          <Card>
            <CardHeader title={`Out for delivery (${out.length})`} icon={Bike} />
            {out.length === 0 ? (
              <EmptyState compact title="None right now" />
            ) : (
              <View style={{ gap: space[3] }}>
                {out.map((v) => (
                  <View key={v.delivery.id} style={{ gap: 4, paddingBottom: space[3], borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center' }}>
                      <Text variant="bodySm" weight="semibold" style={{ flex: 1 }}>
                        {v.order.reference}
                      </Text>
                      <StatusBadge meta={DELIVERY_STATUS[v.delivery.status]} size="sm" />
                    </View>
                    <Text variant="caption" tone="secondary">
                      {v.courier?.name} · {v.courier?.phone} · to {v.areaName}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
          <Card>
            <CardHeader title="Delivery partners" icon={UserCheck} subtitle="Verified partners (fictional)" />
            <View style={{ gap: space[3] }}>
              {couriers.map((c) => (
                <View key={c.id} style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
                  <MethodIcon method={c.vehicleType} size={16} color={colors.textSecondary} />
                  <Text variant="bodySm" style={{ flex: 1 }} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Badge label={c.availability} tone={c.availability === 'available' ? 'success' : c.availability === 'busy' ? 'warning' : 'neutral'} size="sm" dot />
                </View>
              ))}
            </View>
          </Card>
        </View>
      </View>
    </Page>
  );
}
