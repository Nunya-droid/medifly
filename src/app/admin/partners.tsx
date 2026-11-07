import React, { useState } from 'react';
import { View } from 'react-native';
import { CircleCheck, FileCheck, Pause, Play, RotateCcw, XCircle } from '@/components/ui/icons';
import { space } from '@/theme';
import { useDb } from '@/hooks/useDb';
import { useAction } from '@/hooks/useAction';
import { useConfirm } from '@/contexts/ConfirmContext';
import { adminService } from '@/services/adminService';
import { VERIFICATION_STATUS } from '@/constants/status';
import { DELIVERY_METHOD_LABEL } from '@/constants/catalog';
import { formatDate } from '@/utils/format';
import type { Courier, Pharmacy, VerificationStatus } from '@/types';
import { Badge, Button, Callout, DataTable, KeyValue, Modal, PageHeader, StatusBadge, Tabs, Text } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';

type Kind = 'pharmacies' | 'couriers' | 'operators';
type Partner = { kind: 'pharmacy'; p: Pharmacy } | { kind: 'courier'; p: Courier };

function Actions({ partner, onDone }: { partner: Partner; onDone?: () => void }) {
  const { run, loading } = useAction();
  const confirm = useConfirm();
  const status = partner.p.verification;
  const act = async (to: VerificationStatus, label: string, danger = false) => {
    const needsReason = to === 'rejected' || to === 'suspended';
    const r = await confirm({
      title: `${label} ${partner.p.name}?`,
      message: `This changes the demo verification status only — it does not represent real regulatory approval.${to === 'suspended' ? ' The partner will stop receiving orders or jobs.' : ''}`,
      confirmLabel: label,
      tone: danger ? 'danger' : 'teal',
      reason: needsReason ? { label: 'Reason', presets: to === 'rejected' ? ['Documents incomplete', 'Could not verify licence', 'Outside service area'] : ['Compliance review', 'Repeated failed deliveries', 'Partner request'] } : { label: 'Note (optional)', optional: true },
    });
    if (!r.confirmed) return;
    const ok = await run(() => adminService.setPartnerStatus(partner.kind, partner.p.id, to, r.reason), { success: `${partner.p.name}: ${VERIFICATION_STATUS[to].label}` });
    if (ok !== undefined) onDone?.();
  };
  return (
    <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
      {status === 'pending' ? (
        <>
          <Button label="Approve" icon={CircleCheck} size="sm" variant="teal" loading={loading} onPress={() => act('verified', 'Approve')} />
          <Button label="Reject" icon={XCircle} size="sm" variant="outline" onPress={() => act('rejected', 'Reject', true)} />
        </>
      ) : status === 'verified' ? (
        <Button label="Suspend" icon={Pause} size="sm" variant="outline" onPress={() => act('suspended', 'Suspend', true)} />
      ) : status === 'suspended' ? (
        <Button label="Reactivate" icon={Play} size="sm" variant="teal" onPress={() => act('verified', 'Reactivate')} />
      ) : (
        <Button label="Reopen application" icon={RotateCcw} size="sm" variant="outline" onPress={() => act('pending', 'Reopen')} />
      )}
    </View>
  );
}

export default function Partners() {
  const db = useDb();
  const [tab, setTab] = useState<Kind>('pharmacies');
  const [openId, setOpenId] = useState<string | null>(null);
  const areaName = (id: string) => db.serviceAreas.find((a) => a.id === id)?.name ?? id;
  const couriers = db.couriers.filter((c) => c.partnerType === 'courier');
  const operators = db.couriers.filter((c) => c.partnerType === 'drone-operator');
  const partners: Partner[] = tab === 'pharmacies' ? db.pharmacies.map((p) => ({ kind: 'pharmacy', p })) : (tab === 'couriers' ? couriers : operators).map((p) => ({ kind: 'courier', p }));
  const open = partners.find((x) => x.p.id === openId) ?? [...db.pharmacies.map((p) => ({ kind: 'pharmacy' as const, p })), ...db.couriers.map((p) => ({ kind: 'courier' as const, p }))].find((x) => x.p.id === openId);
  const pendingCount = (list: { verification: VerificationStatus }[]) => list.filter((x) => x.verification === 'pending').length;

  return (
    <Page maxWidth={1300}>
      <PageHeader title="Partner verification" subtitle="Review and manage pharmacies, couriers and delivery operators." />
      <Callout tone="info">Verification in this demo is a simulated workflow with fictional documents. It is not a regulatory approval.</Callout>
      <Tabs
        value={tab}
        onChange={setTab}
        style={{ marginVertical: space[4] }}
        tabs={[
          { value: 'pharmacies', label: `Pharmacies${pendingCount(db.pharmacies) ? ` · ${pendingCount(db.pharmacies)} pending` : ''}`, count: db.pharmacies.length },
          { value: 'couriers', label: `Couriers${pendingCount(couriers) ? ` · ${pendingCount(couriers)} pending` : ''}`, count: couriers.length },
          { value: 'operators', label: 'Delivery operators', count: operators.length },
        ]}
      />
      <DataTable<Partner>
        rows={partners}
        keyExtractor={(x) => x.p.id}
        onRowPress={(x) => setOpenId(x.p.id)}
        minTableWidth={860}
        columns={[
          { key: 'name', title: 'Partner', flex: 1.8, render: (x) => <View><Text variant="bodySm" weight="semibold">{x.p.name}</Text><Text variant="caption" tone="muted">{x.kind === 'pharmacy' ? x.p.licenceRef : x.p.company ?? DELIVERY_METHOD_LABEL[x.p.vehicleType]}</Text></View> },
          { key: 'area', title: 'Area', flex: 1.4, render: (x) => (x.kind === 'pharmacy' ? areaName(x.p.serviceAreaId) : x.p.serviceAreaIds.map(areaName).join(', ')) },
          { key: 'docs', title: 'Documents', flex: 1, render: (x) => { const missing = x.p.documents.filter((d) => d.status === 'missing').length; return <Badge label={missing ? `${missing} missing` : 'Complete'} tone={missing ? 'warning' : 'success'} size="sm" icon={FileCheck} />; } },
          { key: 'joined', title: 'Applied', flex: 1, hideOnMobile: true, render: (x) => formatDate(x.p.joinedAt) },
          { key: 'status', title: 'Status', flex: 1.1, render: (x) => <StatusBadge meta={VERIFICATION_STATUS[x.p.verification]} size="sm" /> },
          { key: 'actions', title: 'Actions', flex: 1.6, minWidth: 190, render: (x) => <Actions partner={x} /> },
        ]}
      />
      <Modal visible={!!open} onClose={() => setOpenId(null)} title={open?.p.name} subtitle={open ? (open.kind === 'pharmacy' ? 'Pharmacy partner' : open.p.partnerType === 'drone-operator' ? 'Delivery operator (simulated)' : 'Courier partner') : undefined} width={600} footer={open ? <Actions partner={open} /> : undefined}>
        {open ? (
          <View style={{ gap: space[2] }}>
            <KeyValue label="Status">
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <StatusBadge meta={VERIFICATION_STATUS[open.p.verification]} />
              </View>
            </KeyValue>
            {open.p.verificationNote ? <KeyValue label="Note" value={open.p.verificationNote} /> : null}
            <KeyValue label="Phone" value={open.p.phone} />
            {open.kind === 'pharmacy' ? (
              <>
                <KeyValue label="Address" value={`${open.p.address} · ${open.p.landmark}`} />
                <KeyValue label="Licence (fictional)" value={open.p.licenceRef} />
                <KeyValue label="Superintendent" value={open.p.superintendent} />
                <KeyValue label="Accepting orders" value={open.p.acceptingOrders ? 'Yes' : 'No'} />
                <KeyValue label="Orders to date" value={String(db.orders.filter((o) => o.pharmacyId === open.p.id).length)} />
              </>
            ) : (
              <>
                <KeyValue label="Method" value={DELIVERY_METHOD_LABEL[open.p.vehicleType]} />
                <KeyValue label="Vehicle" value={`${open.p.vehicleDescription}${open.p.plate ? ` · ${open.p.plate}` : ''}`} />
                <KeyValue label="Availability" value={open.p.availability} />
                <KeyValue label="Deliveries" value={String(db.deliveries.filter((d) => d.courierId === open.p.id && d.status === 'delivered').length)} />
              </>
            )}
            <Text variant="label" style={{ marginTop: space[3] }}>
              Documents (fictional)
            </Text>
            {open.p.documents.map((d) => (
              <View key={d.name} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[2] }}>
                <Text variant="bodySm">{d.name}</Text>
                <Badge label={d.status === 'received' ? 'Received' : 'Missing'} tone={d.status === 'received' ? 'success' : 'warning'} size="sm" />
              </View>
            ))}
            {open.kind === 'courier' && open.p.partnerType === 'drone-operator' ? <Callout tone="warning">Simulated operator. No real aviation authorisation, flight approval or route safety assessment exists.</Callout> : null}
          </View>
        ) : null}
      </Modal>
    </Page>
  );
}
