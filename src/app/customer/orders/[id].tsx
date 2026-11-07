import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Bike, Clock, FileText, Headphones, PackageX, Phone, RotateCcw, Store, Upload, XCircle } from '@/components/ui/icons';
import { colors, space } from '@/theme';
import { useCurrentUser, useDb } from '@/hooks/useDb';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAction } from '@/hooks/useAction';
import { useConfirm } from '@/contexts/ConfirmContext';
import { orderService } from '@/services/orderService';
import { PRESCRIPTION_STATUS } from '@/constants/status';
import { DELIVERY_METHOD_LABEL } from '@/constants/catalog';
import { formatDateTime, formatEta } from '@/utils/format';
import { Avatar, Button, Callout, Card, CardHeader, EmptyState, KeyValue, PageHeader, StatusBadge, Text } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { OrderItemsList, OrderStatusBadge, OrderTimeline, OrderTotals, routeProgress } from '@/components/shared/OrderParts';
import { RouteMap } from '@/components/illustrations';

export default function OrderTracking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const user = useCurrentUser();
  const { isDesktop } = useBreakpoint();
  const { run, loading } = useAction();
  const confirm = useConfirm();
  const order = db.orders.find((o) => o.id === id && o.customerId === user?.id);

  if (!order) {
    return (
      <Page>
        <EmptyState icon={PackageX} title="Order not found" message="This order does not exist or belongs to another account." action={<Button label="My orders" onPress={() => router.replace('/customer/orders')} />} />
      </Page>
    );
  }

  const pharmacy = db.pharmacies.find((p) => p.id === order.pharmacyId);
  const courier = db.couriers.find((c) => c.id === order.courierId);
  const delivery = db.deliveries.find((d) => d.id === order.deliveryId);
  const rx = db.prescriptions.find((p) => p.id === order.prescriptionId);
  const canCancel = ['placed', 'awaiting-pharmacy', 'pharmacy-confirmed'].includes(order.status);
  const showMap = ['courier-assigned', 'collected', 'en-route', 'delivered', 'delivery-failed'].includes(order.status);
  const area = db.serviceAreas.find((a) => a.id === order.address.serviceAreaId);

  const cancel = async () => {
    const r = await confirm({ title: `Cancel ${order.reference}?`, message: 'The pharmacy will be notified and any prepaid amount will be queued for a simulated refund.', confirmLabel: 'Cancel order', tone: 'danger', reason: { label: 'Reason', presets: ['Ordered by mistake', 'Found it elsewhere', 'Delivery takes too long', 'Wrong address'] } });
    if (!r.confirmed) return;
    await run(() => orderService.cancelOrder(order.id, r.reason), { success: 'Order cancelled' });
  };

  return (
    <Page>
      <PageHeader
        title={order.reference}
        subtitle={`Placed ${formatDateTime(order.createdAt)} · ${pharmacy?.name}`}
        breadcrumbs={[{ label: 'My orders', href: '/customer/orders' }, { label: order.reference }]}
        backHref="/customer/orders"
        actions={
          <>
            <OrderStatusBadge order={order} />
            {canCancel ? <Button label="Cancel order" icon={XCircle} variant="outline" size="sm" loading={loading} onPress={cancel} /> : null}
            {order.status === 'delivered' ? <Button label="Reorder" icon={RotateCcw} size="sm" onPress={async () => { const r = await run(() => orderService.reorder(order.id), { success: (x) => `${x.added} item(s) added to cart` }); if (r?.added) router.push('/customer/cart'); }} /> : null}
          </>
        }
      />
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space[6] }}>
        <View style={{ flex: 1.6, gap: space[5], minWidth: 0 }}>
          {order.status === 'rejected' ? <Callout tone="danger" title="The pharmacy could not fulfil this order">{order.rejectionReason ?? ''}</Callout> : null}
          {order.status === 'cancelled' ? <Callout tone="neutral" title="Order cancelled">{order.cancellationReason ?? ''}</Callout> : null}
          {order.status === 'delivery-failed' ? <Callout tone="danger" title="Delivery could not be completed">{`${order.failureReason ?? ''} Our support team will contact you about a new delivery.`}</Callout> : null}
          {delivery?.delayed && !['delivered', 'cancelled'].includes(order.status) ? <Callout tone="warning" icon={Clock} title="Running late">Your delivery is taking longer than estimated. MediFly operations is monitoring it.</Callout> : null}

          {order.requiresPrescription && order.prescriptionStatus !== 'approved' ? (
            <Callout tone={order.prescriptionStatus === 'rejected' ? 'danger' : 'violet'} icon={FileText} title={`Prescription: ${PRESCRIPTION_STATUS[order.prescriptionStatus].label}`}>
              <View style={{ gap: space[2] }}>
                <Text variant="bodySm">
                  {order.prescriptionStatus === 'pending'
                    ? 'A pharmacist must review your prescription before this order can be prepared.'
                    : order.prescriptionStatus === 'info-requested'
                      ? `The pharmacist needs more information: ${rx?.pharmacistNote ?? ''}`
                      : rx?.pharmacistNote ?? 'The prescription was not approved.'}
                </Text>
                {order.prescriptionStatus === 'info-requested' ? <Button label="Upload clearer prescription" icon={Upload} size="sm" variant="secondary" onPress={() => router.push(`/customer/prescription?resubmit=${rx?.id}` as never)} style={{ alignSelf: 'flex-start' }} /> : null}
              </View>
            </Callout>
          ) : null}

          {showMap ? (
            <Card style={{ gap: space[4] }}>
              <CardHeader title={order.status === 'delivered' ? 'Delivered' : 'On the way'} subtitle={order.status === 'delivered' ? `Handed over ${formatDateTime(order.updatedAt)}` : `Estimated ${formatEta(order.etaMinutes)} (simulated)`} />
              <RouteMap progress={routeProgress(order)} pickupLabel={pharmacy?.name ?? 'Pharmacy'} dropLabel={`${order.address.area.split(',')[0]}`} method={order.deliveryMethod} failed={order.status === 'delivery-failed'} />
              <Text variant="caption" tone="muted">
                The marker position is estimated from delivery status updates. It is not live GPS tracking.
              </Text>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Progress" subtitle="Updated by the pharmacy and courier" />
            <OrderTimeline order={order} />
          </Card>

          <Card>
            <CardHeader title="Items" />
            <OrderItemsList order={order} />
            <View style={{ marginTop: space[3] }}>
              <OrderTotals order={order} />
            </View>
          </Card>
        </View>

        <View style={{ flex: 1, gap: space[5] }}>
          <Card style={{ gap: space[3] }}>
            <CardHeader title="Delivery" />
            <KeyValue label="Method" value={DELIVERY_METHOD_LABEL[order.deliveryMethod]} />
            <KeyValue label="Recipient" value={order.address.recipientName} />
            <KeyValue label="Phone" value={order.address.phone} />
            <KeyValue label="Address" value={`${order.address.area}, ${area?.name}`} />
            <KeyValue label="Landmark" value={order.address.landmark} />
            {order.address.instructions ? <KeyValue label="Instructions" value={order.address.instructions} /> : null}
            {order.recommendationSummary ? (
              <Text variant="caption" tone="secondary">
                Why this method: {order.recommendationSummary}
              </Text>
            ) : null}
          </Card>
          {courier ? (
            <Card style={{ gap: space[3] }}>
              <CardHeader title="Your courier" icon={Bike} />
              <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
                <Avatar name={courier.name} size={44} />
                <View style={{ flex: 1 }}>
                  <Text variant="title">{courier.name}</Text>
                  <Text variant="caption" tone="secondary">
                    {courier.vehicleDescription} {courier.plate ? `· ${courier.plate}` : ''}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center' }}>
                <Phone size={14} color={colors.textMuted} />
                <Text variant="bodySm" tone="secondary">
                  {courier.phone} (fictional)
                </Text>
              </View>
            </Card>
          ) : null}
          <Card style={{ gap: space[3] }}>
            <CardHeader title="Pharmacy" icon={Store} />
            <Text variant="bodySm" weight="semibold">
              {pharmacy?.name}
            </Text>
            <Text variant="caption" tone="secondary">
              {pharmacy?.address} · {pharmacy?.phone}
            </Text>
            {order.requiresPrescription ? <StatusBadge meta={PRESCRIPTION_STATUS[order.prescriptionStatus]} /> : null}
          </Card>
          <Card style={{ gap: space[3] }}>
            <CardHeader title="Need help?" icon={Headphones} />
            <Text variant="bodySm" tone="secondary">
              Support: {db.settings.supportPhone} · {db.settings.supportEmail} (fictional)
            </Text>
            <Button label="Report an issue with this order" variant="outline" onPress={() => router.push(`/customer/support?order=${order.id}` as never)} />
          </Card>
        </View>
      </View>
    </Page>
  );
}
