import React, { useState } from 'react';
import { View } from 'react-native';
import { Building2, Clock, Save } from '@/components/ui/icons';
import { colors, space } from '@/theme';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAction } from '@/hooks/useAction';
import { usePharmacyScope } from '@/contexts/PharmacyScope';
import { pharmacyService, isOpenNow } from '@/services/pharmacyService';
import { VERIFICATION_STATUS } from '@/constants/status';
import { formatDate } from '@/utils/format';
import type { OpeningHours } from '@/types';
import { Badge, Button, Callout, Card, CardHeader, Input, KeyValue, PageHeader, StatusBadge, Switch, Text } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { DemoControls, ProfileCard } from '@/components/shared/ProfileBasics';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Keyed by pharmacy id so the form resets when an admin switches pharmacy. */
export default function PharmacyProfile() {
  const { pharmacy } = usePharmacyScope();
  return <ProfileForm key={pharmacy.id} />;
}

function ProfileForm() {
  const { pharmacy } = usePharmacyScope();
  const { isDesktop } = useBreakpoint();
  const { run, loading } = useAction();
  const [phone, setPhone] = useState(pharmacy.phone);
  const [email, setEmail] = useState(pharmacy.email);
  const [prep, setPrep] = useState(String(pharmacy.prepMinutes));
  const [accepting, setAccepting] = useState(pharmacy.acceptingOrders);
  const [hours, setHours] = useState<OpeningHours[]>(pharmacy.openingHours);
  const [error, setError] = useState<string>();

  const setDay = (i: number, patch: Partial<OpeningHours>) => setHours((h) => h.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const save = () => {
    const bad = hours.find((h) => !h.closed && (!TIME.test(h.open) || !TIME.test(h.close) || h.open >= h.close));
    if (bad) return setError(`Check the hours for ${bad.day}: use HH:MM and close after opening.`);
    const p = Number(prep);
    if (!Number.isInteger(p) || p < 5 || p > 120) return setError('Preparation time must be 5–120 minutes.');
    setError(undefined);
    run(() => pharmacyService.updateProfile(pharmacy.id, { phone, email, prepMinutes: p, acceptingOrders: accepting, openingHours: hours }), { success: 'Pharmacy profile saved' });
  };

  return (
    <Page maxWidth={1150}>
      <PageHeader title="Pharmacy profile" subtitle="Opening hours, contact details and order settings." />
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space[6] }}>
        <View style={{ flex: 1.4, gap: space[5] }}>
          <Card style={{ gap: space[3] }}>
            <CardHeader title={pharmacy.name} subtitle={`${pharmacy.address} · ${pharmacy.landmark}`} icon={Building2} action={<Badge label={isOpenNow(pharmacy) ? 'Open now' : 'Closed now'} tone={isOpenNow(pharmacy) ? 'success' : 'neutral'} dot />} />
            <KeyValue label="Verification">
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <StatusBadge meta={VERIFICATION_STATUS[pharmacy.verification]} />
              </View>
            </KeyValue>
            <KeyValue label="Licence reference" value={`${pharmacy.licenceRef} (fictional)`} />
            <KeyValue label="Superintendent" value={pharmacy.superintendent} />
            <KeyValue label="Partner since" value={formatDate(pharmacy.joinedAt)} />
            <Callout tone="info">Verification shown here is a demo status, not a regulatory approval.</Callout>
          </Card>
          <Card style={{ gap: space[3] }}>
            <CardHeader title="Opening hours" icon={Clock} />
            {hours.map((h, i) => (
              <View key={h.day} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], flexWrap: 'wrap', paddingBottom: space[2], borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text variant="bodySm" weight="semibold" style={{ width: 44 }}>
                  {h.day}
                </Text>
                <View style={{ width: 130 }}>
                  <Switch value={!h.closed} onChange={(v) => setDay(i, { closed: !v })} label={h.closed ? 'Closed' : 'Open'} />
                </View>
                {!h.closed ? (
                  <>
                    <Input containerStyle={{ width: 100 }} value={h.open} onChangeText={(t) => setDay(i, { open: t })} accessibilityLabel={`${h.day} opening time`} />
                    <Text variant="caption" tone="muted">
                      to
                    </Text>
                    <Input containerStyle={{ width: 100 }} value={h.close} onChangeText={(t) => setDay(i, { close: t })} accessibilityLabel={`${h.day} closing time`} />
                  </>
                ) : null}
              </View>
            ))}
          </Card>
        </View>
        <View style={{ flex: 1, gap: space[5] }}>
          <Card style={{ gap: space[4] }}>
            <CardHeader title="Settings" />
            <Switch value={accepting} onChange={setAccepting} label="Accepting new orders" description="When off, customers cannot order from this pharmacy." />
            <Input label="Average preparation time (minutes)" keyboardType="number-pad" value={prep} onChangeText={setPrep} hint="Used by the delivery engine for ETAs." />
            <Input label="Phone" value={phone} onChangeText={setPhone} />
            <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
            {error ? <Callout tone="danger">{error}</Callout> : null}
            <Button label="Save pharmacy settings" icon={Save} loading={loading} onPress={save} />
          </Card>
          <ProfileCard />
          <DemoControls />
        </View>
      </View>
    </Page>
  );
}
