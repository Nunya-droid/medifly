import React from 'react';
import { View } from 'react-native';
import { Clock, RotateCcw, ShieldAlert, XCircle } from '@/components/ui/icons';
import { space } from '@/theme';
import type { Order } from '@/types';
import { useDb } from '@/hooks/useDb';
import { useAction } from '@/hooks/useAction';
import { useConfirm } from '@/contexts/ConfirmContext';
import { orderService } from '@/services/orderService';
import { deliveryService } from '@/services/deliveryService';
import { CLOSED_ORDER_STATUSES } from '@/constants/status';
import { Button, Card, CardHeader, Text } from '@/components/ui';
import { OrderTimeline } from '@/components/shared/OrderParts';

/** Operations interventions available to administrators on any order. */
export function AdminOrderTools({ order }: { order: Order }) {
  const db = useDb();
  const { run, loading } = useAction();
  const confirm = useConfirm();
  const delivery = db.deliveries.find((d) => d.id === order.deliveryId);
  const closed = CLOSED_ORDER_STATUSES.includes(order.status) && order.status !== 'delivery-failed';
  const canCancel = ['placed', 'awaiting-pharmacy', 'pharmacy-confirmed', 'preparing', 'ready-for-collection', 'delivery-failed'].includes(order.status);
  const canRedispatch = ['delivery-failed', 'courier-assigned'].includes(order.status);

  const cancel = async () => {
    const r = await confirm({ title: `Cancel ${order.reference}?`, message: 'Stock is returned to the pharmacy and prepaid amounts are queued for a simulated refund.', confirmLabel: 'Cancel order', tone: 'danger', reason: { label: 'Reason', presets: ['Customer request via support', 'Unable to deliver', 'Duplicate order', 'Suspected error'] } });
    if (!r.confirmed) return;
    run(async () => {
      if (delivery && order.status === 'delivery-failed') await deliveryService.intervene(delivery.id, 'cancel', r.reason);
      else await orderService.cancelOrder(order.id, r.reason);
      return true;
    }, { success: `${order.reference} cancelled` });
  };
  const redispatch = async () => {
    if (!delivery) return;
    const r = await confirm({ title: `Re-dispatch ${order.reference}?`, message: 'The order returns to "Ready for collection" and becomes an open job for couriers.', confirmLabel: 'Re-dispatch', reason: { label: 'Note (optional)', optional: true } });
    if (r.confirmed) run(() => deliveryService.intervene(delivery.id, 'redispatch', r.reason || undefined), { success: `${order.reference} returned to dispatch` });
  };

  return (
    <View style={{ gap: space[4] }}>
      <Card style={{ gap: space[3] }}>
        <CardHeader title="Operations tools" icon={ShieldAlert} subtitle="Simulated interventions — all actions are audit-logged" />
        {closed ? (
          <Text variant="bodySm" tone="secondary">
            This order is closed. No interventions are available.
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
            {canRedispatch ? <Button label="Re-dispatch" icon={RotateCcw} size="sm" loading={loading} onPress={redispatch} /> : null}
            {delivery && !['delivered', 'failed', 'cancelled'].includes(delivery.status) ? (
              <Button label={delivery.delayed ? 'Clear delay flag' : 'Flag as delayed'} icon={Clock} size="sm" variant="outline" onPress={() => run(() => deliveryService.intervene(delivery.id, delivery.delayed ? 'clear-delay' : 'flag-delay'), { success: delivery.delayed ? 'Delay cleared' : 'Customer notified of delay' })} />
            ) : null}
            {canCancel ? <Button label="Cancel order" icon={XCircle} size="sm" variant="outline" onPress={cancel} /> : null}
          </View>
        )}
      </Card>
      <Card>
        <CardHeader title="Timeline" />
        <OrderTimeline order={order} />
      </Card>
    </View>
  );
}
