import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck, FileText, MessageCircleQuestion, ShieldAlert, XCircle } from '@/components/ui/icons';
import { space } from '@/theme';
import { useDb } from '@/hooks/useDb';
import { useSyncedSelection } from '@/hooks/useSyncedSelection';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAction } from '@/hooks/useAction';
import { useConfirm } from '@/contexts/ConfirmContext';
import { usePharmacyScope } from '@/contexts/PharmacyScope';
import { prescriptionService } from '@/services/prescriptionService';
import { PRESCRIPTION_STATUS } from '@/constants/status';
import { formatDateTime, formatFileSize, formatRelative } from '@/utils/format';
import type { Prescription, PrescriptionStatus } from '@/types';
import { Button, Callout, Card, CardHeader, Drawer, EmptyState, KeyValue, PageHeader, StatusBadge, Tabs, Text, TextArea } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { PrescriptionPreview } from '@/components/shared/PrescriptionPreview';
import { OrderItemsList, OrderStatusBadge } from '@/components/shared/OrderParts';

function ReviewPanel({ rx }: { rx: Prescription }) {
  const db = useDb();
  const { run, loading } = useAction();
  const confirm = useConfirm();
  // Parent renders this keyed by prescription id, so state resets per prescription.
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string>();
  const customer = db.users.find((u) => u.id === rx.customerId);
  const order = db.orders.find((o) => o.id === rx.orderId);

  const decide = async (decision: Exclude<PrescriptionStatus, 'pending'>) => {
    if (decision !== 'approved' && !note.trim()) {
      setNoteError('Add a note explaining the decision to the customer.');
      return;
    }
    const titles = { approved: 'Approve prescription?', rejected: 'Reject prescription?', 'info-requested': 'Request more information?' };
    const messages = {
      approved: `This records an approval in the demo workflow${order ? ` and allows ${order.reference} to proceed to stock confirmation` : ''}. It is not a real clinical assessment.`,
      rejected: order ? `${order.reference} will be rejected and the customer notified with your note.` : 'The customer will be notified with your note.',
      'info-requested': 'The customer will be asked to upload a clearer or updated prescription.',
    };
    const r = await confirm({ title: titles[decision], message: messages[decision], confirmLabel: decision === 'approved' ? 'Approve' : decision === 'rejected' ? 'Reject' : 'Send request', tone: decision === 'rejected' ? 'danger' : decision === 'approved' ? 'teal' : 'primary' });
    if (!r.confirmed) return;
    await run(() => prescriptionService.reviewPrescription(rx.id, decision, note), { success: `Prescription ${PRESCRIPTION_STATUS[decision].label.toLowerCase()}` });
  };

  return (
    <View style={{ gap: space[4] }}>
      <Card style={{ gap: space[3] }}>
        <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 180 }}>
            <Text variant="h3">{rx.fileName}</Text>
            <Text variant="caption" tone="secondary">
              {formatFileSize(rx.fileSize)} · submitted {formatDateTime(rx.submittedAt)}
            </Text>
          </View>
          <StatusBadge meta={PRESCRIPTION_STATUS[rx.status]} />
        </View>
        <PrescriptionPreview rx={rx} height={300} />
        <KeyValue label="Patient" value={rx.patientName} />
        <KeyValue label="Submitted by" value={`${customer?.name} · ${customer?.phone}`} />
        {rx.customerNote ? <KeyValue label="Customer note" value={rx.customerNote} /> : null}
        {rx.reviewedBy ? <KeyValue label="Reviewed" value={`${rx.reviewedBy} · ${rx.reviewedAt ? formatDateTime(rx.reviewedAt) : ''}`} /> : null}
        {rx.pharmacistNote ? <KeyValue label="Pharmacist note" value={rx.pharmacistNote} /> : null}
      </Card>
      {order ? (
        <Card style={{ gap: space[3] }}>
          <CardHeader title={`Related order ${order.reference}`} action={<OrderStatusBadge order={order} size="sm" />} />
          <OrderItemsList order={order} />
          <Button label="Open order" variant="ghost" size="sm" onPress={() => router.push(`/pharmacy/orders?id=${order.id}` as never)} style={{ alignSelf: 'flex-start' }} />
        </Card>
      ) : (
        <Callout tone="info">Not linked to an order yet. The customer can attach it at checkout.</Callout>
      )}
      {rx.status === 'pending' ? (
        <Card style={{ gap: space[3] }}>
          <CardHeader title="Pharmacist decision" icon={ShieldAlert} />
          <Callout tone="warning">Simulated workflow: this decision is not a real clinical assessment and is recorded for demonstration only.</Callout>
          <TextArea label="Pharmacist notes" value={note} onChangeText={(t) => { setNote(t); setNoteError(undefined); }} error={noteError} placeholder="Required when rejecting or requesting information" />
          <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
            <Button label="Approve" icon={CircleCheck} variant="teal" loading={loading} onPress={() => decide('approved')} />
            <Button label="Request information" icon={MessageCircleQuestion} variant="secondary" onPress={() => decide('info-requested')} />
            <Button label="Reject" icon={XCircle} variant="outline" onPress={() => decide('rejected')} />
          </View>
        </Card>
      ) : null}
    </View>
  );
}

export default function PharmacyPrescriptions() {
  const params = useLocalSearchParams<{ id?: string }>();
  const db = useDb();
  const { pharmacyId } = usePharmacyScope();
  const { isDesktop } = useBreakpoint();
  const [tab, setTab] = useState<'pending' | 'info-requested' | 'reviewed' | 'all'>('pending');
  const [selectedId, setSelectedId] = useSyncedSelection(params.id);
  const all = useMemo(() => db.prescriptions.filter((p) => p.pharmacyId === pharmacyId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), [db, pharmacyId]);
  const list = all.filter((p) => (tab === 'all' ? true : tab === 'reviewed' ? ['approved', 'rejected'].includes(p.status) : p.status === tab));
  const selected = all.find((p) => p.id === selectedId) ?? (isDesktop ? list[0] : undefined);

  const listView = (
    <View style={{ gap: space[2] }}>
      {list.length === 0 ? (
        <Card>
          <EmptyState icon={FileText} title="Nothing here" message={tab === 'pending' ? 'No prescriptions waiting for review.' : undefined} compact />
        </Card>
      ) : (
        list.map((p) => {
          const customer = db.users.find((u) => u.id === p.customerId);
          const order = db.orders.find((o) => o.id === p.orderId);
          return (
            <Card key={p.id} onPress={() => setSelectedId(p.id)} style={[{ gap: 4 }, selected?.id === p.id && isDesktop ? { borderColor: '#2878B8' } : null]} accessibilityLabel={`Prescription from ${customer?.name}`}>
              <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center' }}>
                <Text variant="bodySm" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
                  {customer?.name} · {p.patientName}
                </Text>
                <StatusBadge meta={PRESCRIPTION_STATUS[p.status]} size="sm" />
              </View>
              <Text variant="caption" tone="secondary" numberOfLines={1}>
                {p.fileName} · {formatRelative(p.submittedAt)}
              </Text>
              <Text variant="caption" tone="muted">
                {order ? `Order ${order.reference}` : 'Standalone submission'}
              </Text>
            </Card>
          );
        })
      )}
    </View>
  );

  return (
    <Page maxWidth={1300}>
      <PageHeader title="Prescription review" subtitle="Review submitted prescriptions before prescription-only items are prepared or dispatched." />
      <Tabs
        value={tab}
        onChange={setTab}
        style={{ marginBottom: space[4] }}
        tabs={[
          { value: 'pending', label: 'Pending', count: all.filter((p) => p.status === 'pending').length },
          { value: 'info-requested', label: 'Info requested', count: all.filter((p) => p.status === 'info-requested').length },
          { value: 'reviewed', label: 'Reviewed', count: all.filter((p) => ['approved', 'rejected'].includes(p.status)).length },
          { value: 'all', label: 'All', count: all.length },
        ]}
      />
      {isDesktop ? (
        <View style={{ flexDirection: 'row', gap: space[5], alignItems: 'flex-start' }}>
          <View style={{ flex: 0.9 }}>{listView}</View>
          <View style={{ flex: 1.3 }}>{selected ? <ReviewPanel key={selected.id} rx={selected} /> : <Card><EmptyState icon={FileText} title="Select a prescription" /></Card>}</View>
        </View>
      ) : (
        <>
          {listView}
          <Drawer visible={!!selected} onClose={() => setSelectedId(undefined)} title="Prescription" width={640}>
            {selected ? <ReviewPanel key={selected.id} rx={selected} /> : null}
          </Drawer>
        </>
      )}
    </Page>
  );
}
