import React, { useEffect, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Camera, CircleCheck, FileText, Images, Lock, RefreshCw, ScanLine, ShieldCheck, Store } from '@/components/ui/icons';
import { colors, radius, shadow, space } from '@/theme';
import { useCurrentUser, useDb } from '@/hooks/useDb';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/services/api';
import { validatePrescriptionFile } from '@/services/prescriptionService';
import { formatFileSize } from '@/utils/format';
import { Button, Callout, Input, Modal, OptionCard, PageHeader, Text, type PickedFile } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { captureWithCamera, pickFile } from '@/components/shared/capture';
import { submitPrescriptionFile } from '@/components/shared/prescriptionUpload';

const FRAME = 280;

function Corners({ color }: { color: string }) {
  const s = FRAME;
  const l = 46;
  const w = 6;
  return (
    <Svg width={s} height={s * 1.2} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={`M${w / 2} ${l} V${18} Q${w / 2} ${w / 2} ${18} ${w / 2} H${l}`} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" />
      <Path d={`M${s - l} ${w / 2} H${s - 18} Q${s - w / 2} ${w / 2} ${s - w / 2} ${18} V${l}`} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" />
      <Path d={`M${w / 2} ${s * 1.2 - l} V${s * 1.2 - 18} Q${w / 2} ${s * 1.2 - w / 2} ${18} ${s * 1.2 - w / 2} H${l}`} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" />
      <Path d={`M${s - l} ${s * 1.2 - w / 2} H${s - 18} Q${s - w / 2} ${s * 1.2 - w / 2} ${s - w / 2} ${s * 1.2 - 18} V${s * 1.2 - l}`} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export default function ScanPrescription() {
  const db = useDb();
  const user = useCurrentUser();
  const toast = useToast();
  const { isDesktop } = useBreakpoint();
  const [file, setFile] = useState<PickedFile | null>(null);
  const [pharmacyId, setPharmacyId] = useState('ph-community');
  const [patient, setPatient] = useState(user?.name ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [pharmacyOpen, setPharmacyOpen] = useState(false);
  const [error, setError] = useState<string>();
  const sweep = useState(() => new Animated.Value(0))[0];
  const pharmacy = db.pharmacies.find((p) => p.id === pharmacyId);

  // Scan line sweeps while waiting for a capture or while submitting.
  const animating = !file || submitting;
  useEffect(() => {
    if (!animating) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(sweep, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animating, sweep]);

  const accept = (f: PickedFile | null) => {
    if (!f) return;
    const err = validatePrescriptionFile(f.name, f.size, f.mimeType);
    if (err) return setError(err);
    setError(undefined);
    setDone(false);
    setFile(f);
  };

  const submit = async () => {
    if (!file) return;
    if (patient.trim().length < 2) return setError('Enter the patient name as written on the prescription.');
    setError(undefined);
    setSubmitting(true);
    try {
      await submitPrescriptionFile(pharmacyId, file, patient);
      setDone(true);
      toast.show({ tone: 'success', title: 'Prescription submitted', message: `${pharmacy?.name} will review it. Attach it to an order at checkout.` });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const status = done ? 'Sent for review' : submitting ? 'Uploading…' : file ? 'Captured' : 'Align prescription in frame';
  const frameColor = done ? colors.success : file ? colors.blue : colors.teal;

  return (
    <Page maxWidth={1000}>
      <PageHeader title="Scan prescription" subtitle="Take a clear photo for pharmacist review. Use fictional sample documents in this demo." backHref="/customer/dashboard" />
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space[6], alignItems: isDesktop ? 'flex-start' : 'stretch' }}>
        <View style={styles.stage}>
          {/* Info chips */}
          <View style={styles.chipsRow}>
            <View style={styles.statChip}>
              <View style={[styles.statIcon, { backgroundColor: colors.tealTint }]}>
                <ShieldCheck size={18} color={colors.tealDark} />
              </View>
              <Text variant="label">Pharmacist</Text>
              <Text variant="caption" tone="muted" style={{ fontSize: 11 }}>
                reviews it
              </Text>
            </View>
            <View style={styles.statChip}>
              <View style={[styles.statIcon, { backgroundColor: colors.violetTint }]}>
                <FileText size={18} color={colors.violet} />
              </View>
              <Text variant="label">5 MB</Text>
              <Text variant="caption" tone="muted" style={{ fontSize: 11 }}>
                max size
              </Text>
            </View>
          </View>

          {/* Scanner frame */}
          <View style={{ width: FRAME, height: FRAME * 1.2, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
            <View style={styles.paper}>
              {file && file.mimeType.startsWith('image/') ? (
                <Image source={{ uri: file.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel="Captured prescription" />
              ) : file ? (
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <FileText size={40} color={colors.blue} />
                  <Text variant="caption" weight="semibold" numberOfLines={1}>
                    {file.name}
                  </Text>
                </View>
              ) : (
                <View style={{ width: '100%', padding: space[5], gap: 10 }}>
                  <View style={{ height: 10, width: '55%', borderRadius: 5, backgroundColor: colors.border }} />
                  {[0.9, 0.75, 0.85, 0.6, 0.8, 0.5].map((w, i) => (
                    <View key={i} style={{ height: 7, width: `${w * 100}%`, borderRadius: 4, backgroundColor: colors.surfaceSunken }} />
                  ))}
                </View>
              )}
            </View>
            <Corners color={frameColor} />
            {animating ? (
              <Animated.View
                pointerEvents="none"
                style={[styles.scanLine, { backgroundColor: frameColor, transform: [{ translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [-FRAME * 0.5, FRAME * 0.5] }) }] }]}
              />
            ) : null}
          </View>

          <View style={[styles.statusPill, { backgroundColor: done ? colors.success : file ? colors.blue : colors.teal }]} accessibilityLiveRegion="polite">
            {done ? <CircleCheck size={16} color="#fff" /> : <ScanLine size={16} color="#fff" />}
            <Text variant="label" style={{ color: '#fff' }}>
              {status}
            </Text>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <Pressable onPress={() => setPharmacyOpen(true)} style={styles.sideBtn} accessibilityRole="button" accessibilityLabel={`Pharmacy: ${pharmacy?.name}. Change`}>
              <Store size={22} color={colors.navy} />
            </Pressable>
            <Pressable onPress={async () => accept(await captureWithCamera())} style={styles.shutter} accessibilityRole="button" accessibilityLabel={file ? 'Retake photo' : 'Take photo'}>
              <View style={styles.shutterInner}>{file ? <RefreshCw size={26} color={colors.navy} /> : <Camera size={28} color={colors.navy} />}</View>
            </Pressable>
            <Pressable onPress={async () => accept(await pickFile())} style={styles.sideBtn} accessibilityRole="button" accessibilityLabel="Choose from files">
              <Images size={22} color={colors.navy} />
            </Pressable>
          </View>
          <Text variant="caption" tone="muted" align="center">
            Camera · {pharmacy?.name} · Files
          </Text>
        </View>

        <View style={{ flex: 1, gap: space[4] }}>
          <View style={styles.panel}>
            <Text variant="h3">Send to pharmacy</Text>
            <OptionCard selected onPress={() => setPharmacyOpen(true)} icon={Store} title={pharmacy?.name ?? 'Choose pharmacy'} description="Tap to change pharmacy" />
            <Input label="Patient name" value={patient} onChangeText={setPatient} hint="As written on the prescription." />
            {file ? (
              <Text variant="caption" tone="secondary">
                {file.name} · {formatFileSize(file.size)}
              </Text>
            ) : null}
            {error ? <Callout tone="danger">{error}</Callout> : null}
            {done ? (
              <View style={{ gap: space[2] }}>
                <Callout tone="success" icon={CircleCheck} title="Submitted for review">
                  You can attach this prescription at checkout. You’ll be notified when the pharmacist reviews it.
                </Callout>
                <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
                  <Button label="View my prescriptions" onPress={() => router.push('/customer/prescription')} style={{ borderRadius: radius.pill }} />
                  <Button label="Scan another" variant="outline" onPress={() => { setFile(null); setDone(false); }} style={{ borderRadius: radius.pill }} />
                </View>
              </View>
            ) : (
              <Button label="Submit for pharmacist review" icon={ShieldCheck} size="lg" variant="teal" disabled={!file} loading={submitting} onPress={submit} style={{ borderRadius: radius.pill }} />
            )}
          </View>
          <Callout tone="warning" icon={Lock} title="Demo only">
            Photos stay in this browser’s demo storage. This is not a secure medical records system, and the review is simulated — not a clinical assessment.
          </Callout>
        </View>
      </View>

      <Modal visible={pharmacyOpen} onClose={() => setPharmacyOpen(false)} title="Choose pharmacy" width={520}>
        <View style={{ gap: space[2] }}>
          {db.pharmacies
            .filter((p) => p.verification === 'verified')
            .map((p) => (
              <OptionCard key={p.id} selected={p.id === pharmacyId} onPress={() => { setPharmacyId(p.id); setPharmacyOpen(false); }} icon={Store} title={p.name} description={p.address} />
            ))}
        </View>
      </Modal>
    </Page>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: colors.surface, borderRadius: 32, padding: space[5], gap: space[5], alignItems: 'stretch', ...shadow.md, maxWidth: 520, width: '100%', alignSelf: 'center' },
  chipsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statChip: { alignItems: 'center', gap: 2, backgroundColor: colors.surfaceMuted, borderRadius: 22, borderWidth: 1, borderColor: colors.border, paddingVertical: space[3], paddingHorizontal: space[4] },
  statIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  paper: { width: FRAME - 36, height: FRAME * 1.2 - 36, borderRadius: 18, backgroundColor: colors.surfaceMuted, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  scanLine: { position: 'absolute', left: -14, right: -14, height: 4, borderRadius: 2, opacity: 0.9 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', paddingHorizontal: space[5], height: 40, borderRadius: radius.pill },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[2] },
  sideBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.md },
  shutter: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.md },
  panel: { backgroundColor: colors.surface, borderRadius: 28, padding: space[5], gap: space[3], ...shadow.sm },
});
