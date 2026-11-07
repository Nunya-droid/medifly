import React, { useState } from 'react';
import { View } from 'react-native';
import { Bike, Save } from '@/components/ui/icons';
import { space } from '@/theme';
import { useCourier } from '@/hooks/useCourier';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAction } from '@/hooks/useAction';
import { deliveryService } from '@/services/deliveryService';
import { VERIFICATION_STATUS } from '@/constants/status';
import { DELIVERY_METHOD_LABEL } from '@/constants/catalog';
import { formatDate, formatGHS } from '@/utils/format';
import { Badge, Button, Callout, Card, CardHeader, Checkbox, Input, KeyValue, PageHeader, StatusBadge, Text } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { DemoControls, ProfileCard } from '@/components/shared/ProfileBasics';

export default function CourierProfile() {
  const { db, courier, stats } = useCourier();
  const { isDesktop } = useBreakpoint();
  const { run, loading } = useAction();
  const [vehicle, setVehicle] = useState(courier?.vehicleDescription ?? '');
  const [plate, setPlate] = useState(courier?.plate ?? '');
  const [areas, setAreas] = useState<string[]>(courier?.serviceAreaIds ?? []);
  if (!courier) return null;

  return (
    <Page maxWidth={1100}>
      <PageHeader title="Courier profile" subtitle="Vehicle, service areas and performance." />
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space[6] }}>
        <View style={{ flex: 1.2, gap: space[5] }}>
          <Card style={{ gap: space[3] }}>
            <CardHeader title="Partner details" icon={Bike} action={<StatusBadge meta={VERIFICATION_STATUS[courier.verification]} />} />
            <KeyValue label="Delivery method" value={DELIVERY_METHOD_LABEL[courier.vehicleType]} />
            <KeyValue label="Partner since" value={formatDate(courier.joinedAt)} />
            <KeyValue label="Rating" value={`★ ${courier.rating.toFixed(1)}`} />
            <KeyValue label="Documents">
              <View style={{ flex: 1, alignItems: 'flex-end', gap: 4 }}>
                {courier.documents.map((d) => (
                  <Badge key={d.name} label={d.name} tone={d.status === 'received' ? 'success' : 'warning'} size="sm" />
                ))}
              </View>
            </KeyValue>
            <Input label="Vehicle description" value={vehicle} onChangeText={setVehicle} />
            <Input label="Registration plate" value={plate} onChangeText={setPlate} autoCapitalize="characters" />
            <Text variant="label">Service areas</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
              {db.serviceAreas
                .filter((a) => a.active)
                .map((a) => (
                  <View key={a.id} style={{ width: 200 }}>
                    <Checkbox checked={areas.includes(a.id)} onChange={(on) => setAreas((x) => (on ? [...x, a.id] : x.filter((y) => y !== a.id)))} label={a.name} />
                  </View>
                ))}
            </View>
            {areas.length === 0 ? <Callout tone="warning">Choose at least one service area to receive jobs.</Callout> : null}
            <Button label="Save vehicle & areas" icon={Save} loading={loading} disabled={areas.length === 0} onPress={() => run(() => deliveryService.updateCourierProfile({ vehicleDescription: vehicle, plate, serviceAreaIds: areas }), { success: 'Profile updated' })} style={{ alignSelf: 'flex-start' }} />
          </Card>
          <Card style={{ gap: space[2] }}>
            <CardHeader title="Performance summary" />
            <KeyValue label="Deliveries completed" value={String(stats.completed)} />
            <KeyValue label="Failed deliveries" value={String(stats.failed)} />
            <KeyValue label="Success rate" value={stats.successRate == null ? '—' : `${Math.round(stats.successRate * 100)}%`} />
            <KeyValue label="Earnings to date (illustrative)" value={formatGHS(stats.earningsTotal)} strong />
          </Card>
        </View>
        <View style={{ flex: 1, gap: space[5] }}>
          <ProfileCard />
          <DemoControls />
        </View>
      </View>
    </Page>
  );
}
