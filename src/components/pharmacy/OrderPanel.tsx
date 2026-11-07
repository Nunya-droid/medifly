import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { CircleCheck, ClipboardCheck, FileText, PackageCheck, Phone, Truck, XCircle } from '@/components/ui/icons';
import { colors, space } from '@/theme';
import type { Order, OrderStatus } from '@/types';
import { useDb } from '@/hooks/useDb';
import { useAction } from '@/hooks/useAction';
import { useConfirm } from '@/contexts/ConfirmContext';
import { orderService } from '@/services/orderService';
import { PRESCRIPTION_STATUS } from '@/constants/status';
import { DELIVERY_METHOD_LABEL } from '@/constants/catalog';
import { formatDateTime } from '@/utils/format';
import { Button, Callout, Card, CardHeader, KeyValue, Modal, StatusBadge, Text } from '@/components/ui';
import { OrderItemsList, OrderStatusBadge, OrderTimeline, OrderTotals } from '@/components/shared/OrderParts';
import { PrescriptionPreview } from '@/components/shared/PrescriptionPreview';

const REJECT_PRESETS = ['Item out of stock', 'Pack size not available', 'Pharmacy closing', 'Prescription issue', 'Unable to verify order'];

export function usePharmacyOrderActions() {
  const { run, loading } = useAction();
  const confirm = useConfirm();
  const advance = (order: Order, to: OrderStatus, label: string) => run(() => orderService.updateOrderStatus(order.id, to), { success: `${order.reference}: ${label}` });
  const reject = async (order: Order) => {
    const r = await confirm({ title: `Reject ${order.reference}?`, message: 'The customer will be notified with your reason and reserved stock will be returned. Prepaid amounts are queued for a simulated refund.', confirmLabel: 'Reject order', tone: 'danger', reason: { label: 'Reason', presets: REJECT_PRESETS } });
    if (r.confirmed) await run(() => orderService.updateOrderStatus(order.id, 'rejected', r.reason), { success: `${order.reference} rejected` });
  };
  return { advance, reject, loading };
}

/** Primary action buttons for the current status. */
export function OrderActions({ order, compact }: { order: Order; compact?: boolean }) {
  const { advance, reject, loading } = usePharmacyOrderActions();
  const size = compact ? 'sm' : 'md';
  const rxBlocked = order.requiresPrescription && order.prescriptionStatus !== 'approved';
  switch (order.status) {
    case 'awaiting-pharmacy':
      return (
        <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
          {rxBlocked ? (
            <Button label="Review prescription" icon={FileText} size={size} variant="secondary" onPress={() => router.push(`/pharmacy/prescriptions?id=${order.prescriptionId}` as never)} />
          ) : (
            <Button label="Confirm stock" icon={ClipboardCheck} size={size} loading={loading} onPress={() => advance(order, 'pharmacy-confirmed', 'stock confirmed')} />
          )}
          <Button label="Reject" icon={XCircle} size={size} variant="outline" onPress={() => reject(order)} />
        </View>
      );
    case 'pharmacy-confirmed':
      return (
        <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
          <Button label="Mark preparing" icon={PackageCheck} size={size} loading={loading} onPress={() => advance(order, 'preparing', 'preparing')} />
          <Button label="Reject" icon={XCircle} size={size} variant="outline" onPress={() => reject(order)} />
        </View>
      );
    case 'preparing':
      return <Button label="Mark ready for collection" icon={CircleCheck} size={size} variant="teal" loading={loading} onPress={() => advance(order, 'ready-for-collection', 'ready for collection')} />;
    case 'ready-for-collection':
      return <Button label="Dispatch / assign courier" icon={Truck} size={size} variant="secondary" onPress={() => router.push('/pharmacy/dispatch')} />;
    default:
      return null;
  }
}

/** Full order detail for pharmacy staff. */
export function PharmacyOrderPanel({ order }: { order: Order }) {
  const db = useDb();
  const [showRx, setShowRx] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const customer = db.users.find((u) => u.id === order.customerId);
  const area = db.serviceAreas.find((a) => a.id === order.address.serviceAreaId);
  const courier = db.couriers.find((c) => c.id === order.courierId);
  const delivery = db.deliveries.find((d) => d.id === order.deliveryId);
  const rx = db.prescriptions.find((p) => p.id === order.prescriptionId);

  return (
    <View style={{ gap: space[4] }}>
      <Card style={{ gap: space[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space[3], flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 180 }}>
            <Text variant="h2">{order.reference}</Text>
            <Text variant="caption" tone="secondary">
              Placed {formatDateTime(order.createdAt)}
            </Text>
          </View>
          <OrderStatusBadge order={order} />
        </View>
        {order.requiresPrescription ? (
          <Callout tone={order.prescriptionStatus === 'approved' ? 'success' : order.prescriptionStatus === 'rejected' ? 'danger' : 'violet'} icon={FileText} title={`Prescription: ${PRESCRIPTION_STATUS[order.prescriptionStatus].label}`}>
            {order.prescriptionStatus === 'approved' ? 'Approved in the demo review workflow. Stock can be confirmed.' : 'Stock confirmation and dispatch are blocked until a pharmacist approves the prescription.'}
          </Callout>
        ) : null}
        {order.rejectionReason ? <Callout tone="danger" title="Rejected">{order.rejectionReason}</Callout> : null}
        {order.cancellationReason ? <Callout tone="neutral" title="Cancelled">{order.cancellationReason}</Callout> : null}
        {order.failureReason ? <Callout tone="danger" title="Delivery failed">{order.failureReason}</Callout> : null}
        <OrderActions order={order} />
        <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
          {rx ? <Button label="View prescription" icon={FileText} variant="ghost" size="sm" onPress={() => setShowRx(true)} /> : null}
          <Button label="View order history" variant="ghost" size="sm" onPress={() => setShowHistory(true)} />
        </View>
      </Card>
      <Card>
        <CardHeader title="Items" />
        <OrderItemsList order={order} />
        <View style={{ marginTop: space[3] }}>
          <OrderTotals order={order} />
        </View>
      </Card>
      <Card style={{ gap: 2 }}>
        <CardHeader title="Customer & delivery" />
        <KeyValue label="Customer" value={customer?.name} />
        <KeyValue label="Recipient" value={order.address.recipientName} />
        <KeyValue label="Phone">
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
            <Phone size={13} color={colors.textMuted} />
            <Text variant="bodySm" weight="medium">
              {order.address.phone}
            </Text>
          </View>
        </KeyValue>
        <KeyValue label="Deliver to" value={`${order.address.area}, ${area?.name}`} />
        <KeyValue label="Method" value={DELIVERY_METHOD_LABEL[order.deliveryMethod]} />
        <KeyValue label="Courier" value={courier ? `${courier.name} · ${courier.phone}` : 'Not yet assigned'} />
        {delivery ? <KeyValue label="Delivery fee" value={`GH₵${delivery.fee.toFixed(2)} · ${delivery.distanceKm} km`} /> : null}
        {order.address.instructions ? <KeyValue label="Instructions" value={order.address.instructions} /> : null}
      </Card>
      <Modal visible={showRx} onClose={() => setShowRx(false)} title="Prescription" subtitle={rx ? `${rx.fileName} · patient ${rx.patientName}` : undefined} width={560}>
        {rx ? (
          <>
            <PrescriptionPreview rx={rx} />
            <StatusBadge meta={PRESCRIPTION_STATUS[rx.status]} />
            {rx.pharmacistNote ? <Text variant="bodySm">Note: {rx.pharmacistNote}</Text> : null}
            {rx.status === 'pending' ? <Button label="Go to prescription review" onPress={() => { setShowRx(false); router.push(`/pharmacy/prescriptions?id=${rx.id}` as never); }} /> : null}
          </>
        ) : null}
      </Modal>
      <Modal visible={showHistory} onClose={() => setShowHistory(false)} title={`${order.reference} history`} width={520}>
        <OrderTimeline order={order} />
      </Modal>
    </View>
  );
}
