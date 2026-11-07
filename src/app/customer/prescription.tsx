import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { FileText, Lock, ScanLine, ShieldCheck, Upload } from '@/components/ui/icons';
import { space } from '@/theme';
import { useCurrentUser, useDb } from '@/hooks/useDb';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useToast } from '@/contexts/ToastContext';
import { visiblePrescriptions } from '@/services/prescriptionService';
import { getErrorMessage } from '@/services/api';
import { PRESCRIPTION_STATUS } from '@/constants/status';
import { formatDateTime, formatFileSize } from '@/utils/format';
import type { Prescription } from '@/types';
import { Button, Callout, Card, CardHeader, EmptyState, FileUpload, Input, Modal, PageHeader, Select, StatusBadge, Text, TextArea, type PickedFile } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { PrescriptionPreview } from '@/components/shared/PrescriptionPreview';
import { resubmitPrescriptionFile, submitPrescriptionFile } from '@/components/shared/prescriptionUpload';

export default function PrescriptionScreen() {
  const params = useLocalSearchParams<{ resubmit?: string }>();
  const db = useDb();
  const user = useCurrentUser();
  const { isDesktop } = useBreakpoint();
  const toast = useToast();
  const list = useMemo(() => visiblePrescriptions(db, user), [db, user]);
  const resubmitTarget = list.find((p) => p.id === params.resubmit && p.status === 'info-requested');

  const [pharmacyId, setPharmacyId] = useState('ph-community');
  const [patient, setPatient] = useState(user?.name ?? '');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<Prescription | null>(null);

  const submit = async () => {
    if (!file) return setError('Choose a file to upload.');
    if (!resubmitTarget && patient.trim().length < 2) return setError('Enter the patient name.');
    setError(undefined);
    setBusy(true);
    try {
      if (resubmitTarget) {
        await resubmitPrescriptionFile(resubmitTarget.id, file, note);
        toast.show({ tone: 'success', title: 'Prescription re-submitted', message: 'The pharmacist will review the new file.' });
        router.replace('/customer/prescription');
      } else {
        await submitPrescriptionFile(pharmacyId, file, patient, note);
        toast.show({ tone: 'success', title: 'Prescription submitted', message: 'You can attach it to an order at checkout.' });
      }
      setFile(null);
      setNote('');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const pharmacies = db.pharmacies.filter((p) => p.verification === 'verified').map((p) => ({ value: p.id, label: p.name }));

  return (
    <Page>
      <PageHeader title="Prescriptions" subtitle="Submit a prescription for pharmacist review, then attach it to an order at checkout." actions={<Button label="Scan with camera" icon={ScanLine} variant="teal" onPress={() => router.push('/customer/scan')} />} />
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space[6] }}>
        <View style={{ flex: 1.2, gap: space[4] }}>
          <Card style={{ gap: space[4] }}>
            <CardHeader title={resubmitTarget ? `Re-submit ${resubmitTarget.fileName}` : 'Upload a prescription'} subtitle={resubmitTarget ? `Pharmacist note: ${resubmitTarget.pharmacistNote}` : 'JPG, PNG, WEBP or PDF up to 5 MB'} icon={Upload} />
            {!resubmitTarget ? (
              <>
                <Select label="Pharmacy" value={pharmacyId} onChange={setPharmacyId} options={pharmacies} width={300} required />
                <Input label="Patient name" value={patient} onChangeText={setPatient} hint="As written on the prescription. Use fictional details in this demo." required />
              </>
            ) : null}
            <FileUpload value={file} onChange={setFile} onError={setError} />
            <TextArea label="Note for the pharmacist (optional)" value={note} onChangeText={setNote} placeholder="e.g. Repeat prescription for my mother" />
            {error ? <Callout tone="danger">{error}</Callout> : null}
            <Button label={resubmitTarget ? 'Re-submit for review' : 'Submit for review'} icon={Upload} loading={busy} onPress={submit} />
          </Card>
          <Callout tone="warning" icon={Lock} title="Demonstration only">
            Use fictional sample files only. Files are kept in this browser’s demo storage (IndexedDB) and are not stored in a secure medical records system.
          </Callout>
          <Callout tone="info" icon={ShieldCheck} title="How review works">
            A pharmacist checks the prescription before any prescription-only item is prepared or dispatched. In this demo the review is simulated and is not a clinical assessment.
          </Callout>
        </View>
        <View style={{ flex: 1, gap: space[3] }}>
          <Text variant="h3">Your submissions</Text>
          {list.length === 0 ? (
            <Card>
              <EmptyState icon={FileText} title="No prescriptions yet" compact />
            </Card>
          ) : (
            list.map((p) => {
              const ph = db.pharmacies.find((x) => x.id === p.pharmacyId);
              const order = db.orders.find((o) => o.id === p.orderId);
              return (
                <Card key={p.id} onPress={() => setView(p)} style={{ gap: space[2] }} accessibilityLabel={`Prescription ${p.fileName}`}>
                  <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodySm" weight="semibold" numberOfLines={1}>
                        {p.fileName}
                      </Text>
                      <Text variant="caption" tone="secondary">
                        {ph?.name} · {formatDateTime(p.submittedAt)}
                      </Text>
                    </View>
                    <StatusBadge meta={PRESCRIPTION_STATUS[p.status]} size="sm" />
                  </View>
                  {p.pharmacistNote ? (
                    <Text variant="caption" tone="secondary">
                      Pharmacist: {p.pharmacistNote}
                    </Text>
                  ) : null}
                  <Text variant="caption" tone="muted">
                    {order ? `Linked to ${order.reference}` : 'Not yet linked to an order'}
                  </Text>
                  {p.status === 'info-requested' ? <Button label="Upload clearer file" size="sm" variant="secondary" onPress={() => router.push(`/customer/prescription?resubmit=${p.id}` as never)} style={{ alignSelf: 'flex-start' }} /> : null}
                </Card>
              );
            })
          )}
        </View>
      </View>
      <Modal visible={!!view} onClose={() => setView(null)} title={view?.fileName} subtitle={view ? `${formatFileSize(view.fileSize)} · ${PRESCRIPTION_STATUS[view.status].label}` : undefined} width={560}>
        {view ? <PrescriptionPreview rx={view} /> : null}
      </Modal>
    </Page>
  );
}
