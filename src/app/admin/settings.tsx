import React, { useState } from 'react';
import { View } from 'react-native';
import { Save } from '@/components/ui/icons';
import { space } from '@/theme';
import { useDb } from '@/hooks/useDb';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAction } from '@/hooks/useAction';
import { adminService } from '@/services/adminService';
import { storageService } from '@/services/storageService';
import { DELIVERY_METHOD_LABEL, DEMO_DISCLAIMER } from '@/constants/catalog';
import { formatDateTime } from '@/utils/format';
import type { DeliveryMethod, PlatformSettings } from '@/types';
import { Button, Callout, Card, CardHeader, Chips, Input, KeyValue, PageHeader, Switch, Text } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { DemoControls, ProfileCard } from '@/components/shared/ProfileBasics';

type FeeDraft = Record<DeliveryMethod, { base: string; perKm: string; speedKmh: string; enabled: boolean }>;

export default function PlatformSettingsScreen() {
  const db = useDb();
  const s = db.settings;
  const { isDesktop } = useBreakpoint();
  const { run, loading } = useAction();
  const toDraft = (x: PlatformSettings): FeeDraft => Object.fromEntries((Object.keys(x.fees) as DeliveryMethod[]).map((m) => [m, { base: String(x.fees[m].base), perKm: String(x.fees[m].perKm), speedKmh: String(x.fees[m].speedKmh), enabled: x.fees[m].enabled }])) as FeeDraft;
  const [fees, setFees] = useState<FeeDraft>(toDraft(s));
  const [drone, setDrone] = useState(s.droneConditions);
  const [cod, setCod] = useState(s.cashOnDeliveryEnabled);
  const [share, setShare] = useState(String(Math.round(s.courierPayoutShare * 100)));
  const [sms, setSms] = useState(s.notifyCustomersBySms);
  const [notifyPh, setNotifyPh] = useState(s.notifyPharmaciesOnNewOrder);
  const [phone, setPhone] = useState(s.supportPhone);
  const [email, setEmail] = useState(s.supportEmail);
  const [delay, setDelay] = useState(String(s.simulatedDelayMs));
  const [err, setErr] = useState<string>();

  const save = () => {
    const parsed = {} as PlatformSettings['fees'];
    for (const m of Object.keys(fees) as DeliveryMethod[]) {
      const f = fees[m];
      const base = Number(f.base);
      const perKm = Number(f.perKm);
      const speed = Number(f.speedKmh);
      if (!(base >= 0) || !(perKm >= 0) || !(speed > 0)) return setErr(`Check the ${DELIVERY_METHOD_LABEL[m]} values.`);
      parsed[m] = { base, perKm, speedKmh: speed, enabled: f.enabled };
    }
    const sh = Number(share);
    if (!(sh >= 0 && sh <= 100)) return setErr('Courier payout share must be 0–100%.');
    const d = Number(delay);
    if (!(d >= 0 && d <= 3000)) return setErr('Simulated delay must be 0–3000 ms.');
    setErr(undefined);
    run(() => adminService.updateSettings({ fees: parsed, droneConditions: drone, cashOnDeliveryEnabled: cod, courierPayoutShare: sh / 100, notifyCustomersBySms: sms, notifyPharmaciesOnNewOrder: notifyPh, supportPhone: phone, supportEmail: email, simulatedDelayMs: d }), { success: 'Platform settings saved' });
  };

  const setFee = (m: DeliveryMethod, k: 'base' | 'perKm' | 'speedKmh') => (v: string) => setFees((x) => ({ ...x, [m]: { ...x[m], [k]: v } }));

  return (
    <Page maxWidth={1200}>
      <PageHeader title="Platform settings" subtitle="Delivery fee defaults, simulation controls, notifications and application information." actions={<Button label="Save settings" icon={Save} loading={loading} onPress={save} />} />
      {err ? <Callout tone="danger">{err}</Callout> : null}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space[6], marginTop: space[4] }}>
        <View style={{ flex: 1.4, gap: space[5] }}>
          <Card style={{ gap: space[4] }}>
            <CardHeader title="Delivery fee defaults" subtitle="Fee = area base fee + method base + (distance − 3 km) × per-km. Used by the delivery engine." />
            {(Object.keys(fees) as DeliveryMethod[]).map((m) => (
              <View key={m} style={{ gap: space[2], paddingBottom: space[3], borderBottomWidth: 1, borderBottomColor: '#E3EAF0' }}>
                <Switch value={fees[m].enabled} onChange={(v) => setFees((x) => ({ ...x, [m]: { ...x[m], enabled: v } }))} label={DELIVERY_METHOD_LABEL[m]} description={fees[m].enabled ? 'Enabled' : 'Disabled — never offered at checkout'} />
                <View style={{ flexDirection: 'row', gap: space[3], flexWrap: 'wrap' }}>
                  <Input containerStyle={{ flex: 1, minWidth: 110 }} label="Method base (GH₵)" keyboardType="decimal-pad" value={fees[m].base} onChangeText={setFee(m, 'base')} />
                  <Input containerStyle={{ flex: 1, minWidth: 110 }} label="Per km (GH₵)" keyboardType="decimal-pad" value={fees[m].perKm} onChangeText={setFee(m, 'perKm')} />
                  <Input containerStyle={{ flex: 1, minWidth: 110 }} label="Avg speed (km/h)" keyboardType="number-pad" value={fees[m].speedKmh} onChangeText={setFee(m, 'speedKmh')} />
                </View>
              </View>
            ))}
            <Input label="Courier payout share (%)" keyboardType="number-pad" value={share} onChangeText={setShare} hint="Illustrative share of the delivery fee paid to partners." />
          </Card>
          <Card style={{ gap: space[3] }}>
            <CardHeader title="Simulation controls" />
            <Text variant="label">Simulated drone operating conditions</Text>
            <Chips value={drone} onChange={setDrone} options={[{ value: 'favourable', label: 'Favourable' }, { value: 'unfavourable', label: 'Unfavourable' }]} />
            <Text variant="caption" tone="secondary">
              When unfavourable, the delivery engine excludes drone delivery and falls back to ground methods. This is a demo switch — no weather or airspace data is used.
            </Text>
            <Switch value={cod} onChange={setCod} label="Cash on delivery" description="Allow customers to pay the courier at handover." />
            <Input label="Simulated API delay (ms)" keyboardType="number-pad" value={delay} onChangeText={setDelay} hint="Adds latency to service calls to demonstrate loading states." />
          </Card>
        </View>
        <View style={{ flex: 1, gap: space[5] }}>
          <Card style={{ gap: space[3] }}>
            <CardHeader title="Notifications" />
            <Switch value={notifyPh} onChange={setNotifyPh} label="Notify pharmacies of new orders" />
            <Switch value={sms} onChange={setSms} label="Customer SMS updates" description="Placeholder — SMS is not sent in the demo; in-app notifications are always on." />
            <Input label="Support phone" value={phone} onChangeText={setPhone} />
            <Input label="Support email" value={email} onChangeText={setEmail} autoCapitalize="none" />
          </Card>
          <Card style={{ gap: 2 }}>
            <CardHeader title="Application" />
            <KeyValue label="Version" value={s.appVersion} />
            <KeyValue label="Data seeded" value={formatDateTime(db.meta.seededAt)} />
            <KeyValue label="Persistence" value={storageService.isPersistent() ? 'Browser localStorage' : 'In-memory only'} />
            <KeyValue label="Records" value={`${db.orders.length} orders · ${db.products.length} products · ${db.auditLogs.length} log entries`} />
            <Text variant="caption" tone="muted" style={{ marginTop: space[2] }}>
              {DEMO_DISCLAIMER}
            </Text>
          </Card>
          <ProfileCard />
          <DemoControls />
        </View>
      </View>
    </Page>
  );
}
