import React, { useState } from 'react';
import { View } from 'react-native';
import { Map, Pencil } from '@/components/ui/icons';
import { space } from '@/theme';
import { useDb } from '@/hooks/useDb';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAction } from '@/hooks/useAction';
import { adminService } from '@/services/adminService';
import { DELIVERY_METHOD_LABEL } from '@/constants/catalog';
import { formatEta, formatGHS } from '@/utils/format';
import type { DeliveryMethod, ServiceArea } from '@/types';
import { Badge, Button, Callout, Card, Checkbox, Input, Modal, PageHeader, Switch, Text, TextArea } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';

function EditArea({ area, onClose }: { area: ServiceArea; onClose: () => void }) {
  const { run, loading } = useAction();
  const [active, setActive] = useState(area.active);
  const [methods, setMethods] = useState<DeliveryMethod[]>(area.supportedMethods);
  const [drone, setDrone] = useState(area.droneRouteEligible);
  const [fee, setFee] = useState(String(area.baseFee));
  const [min, setMin] = useState(String(area.etaRange.min));
  const [max, setMax] = useState(String(area.etaRange.max));
  const [notes, setNotes] = useState(area.notes ?? '');
  const [err, setErr] = useState<string>();
  // Drone route eligibility only applies when drone is a supported method.
  const droneOn = drone && methods.includes('drone');
  const toggle = (m: DeliveryMethod) => (on: boolean) => setMethods((x) => (on ? [...x, m] : x.filter((y) => y !== m)));
  const save = async () => {
    if (!methods.length) return setErr('Keep at least one delivery method.');
    const f = Number(fee);
    const a = Number(min);
    const b = Number(max);
    if (!(f > 0)) return setErr('Base fee must be above 0.');
    if (!(a > 0) || !(b >= a)) return setErr('ETA range must be positive and max ≥ min.');
    const ok = await run(() => adminService.updateServiceArea(area.id, { active, supportedMethods: methods, droneRouteEligible: droneOn, baseFee: f, etaRange: { min: a, max: b }, notes }), { success: `${area.name} updated` });
    if (ok) onClose();
  };
  return (
    <Modal visible onClose={onClose} title={`Edit ${area.name}`} footer={<><Button label="Cancel" variant="outline" onPress={onClose} /><Button label="Save" loading={loading} onPress={save} /></>}>
      <Switch value={active} onChange={setActive} label="Active service area" description="Inactive areas cannot receive orders." />
      <Text variant="label">Supported delivery methods</Text>
      {(['motorcycle', 'vehicle', 'drone'] as DeliveryMethod[]).map((m) => (
        <Checkbox key={m} checked={methods.includes(m)} onChange={toggle(m)} label={DELIVERY_METHOD_LABEL[m]} />
      ))}
      <Switch value={droneOn} onChange={setDrone} disabled={!methods.includes('drone')} label="Simulated drone route eligible" description="Fictional route flag used by the delivery engine. Not a real airspace approval." />
      <View style={{ flexDirection: 'row', gap: space[3], flexWrap: 'wrap' }}>
        <Input containerStyle={{ flex: 1, minWidth: 120 }} label="Base fee (GH₵)" keyboardType="decimal-pad" value={fee} onChangeText={setFee} />
        <Input containerStyle={{ flex: 1, minWidth: 100 }} label="ETA min (min)" keyboardType="number-pad" value={min} onChangeText={setMin} />
        <Input containerStyle={{ flex: 1, minWidth: 100 }} label="ETA max (min)" keyboardType="number-pad" value={max} onChangeText={setMax} />
      </View>
      <TextArea label="Notes" value={notes} onChangeText={setNotes} />
      {err ? <Callout tone="danger">{err}</Callout> : null}
    </Modal>
  );
}

export default function ServiceAreas() {
  const db = useDb();
  const { isDesktop } = useBreakpoint();
  const [editing, setEditing] = useState<ServiceArea | null>(null);
  return (
    <Page maxWidth={1300}>
      <PageHeader title="Service areas" subtitle="Fictional Accra service areas used by checkout and the delivery engine." />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space[2] }}>
        {db.serviceAreas.map((a) => {
          const pharmacies = db.pharmacies.filter((p) => p.serviceAreaId === a.id && p.verification === 'verified').length;
          const couriers = db.couriers.filter((c) => c.serviceAreaIds.includes(a.id) && c.verification === 'verified').length;
          const orders = db.orders.filter((o) => o.address.serviceAreaId === a.id).length;
          return (
            <View key={a.id} style={{ width: isDesktop ? '33.33%' : '100%', padding: space[2] }}>
              <Card style={{ gap: space[3], height: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                  <Map size={18} color="#2878B8" />
                  <Text variant="h3" style={{ flex: 1 }}>
                    {a.name}
                  </Text>
                  <Badge label={a.active ? 'Active' : 'Inactive'} tone={a.active ? 'success' : 'neutral'} dot size="sm" />
                </View>
                <Text variant="caption" tone="secondary">
                  {a.city} · {a.region}
                </Text>
                <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
                  {a.supportedMethods.map((m) => (
                    <Badge key={m} label={DELIVERY_METHOD_LABEL[m]} tone={m === 'drone' ? 'warning' : 'info'} size="sm" />
                  ))}
                </View>
                <Text variant="bodySm">
                  Base fee {formatGHS(a.baseFee)} · {formatEta(a.etaRange)}
                </Text>
                <Text variant="caption" tone="secondary">
                  {pharmacies} pharmacies · {couriers} partners · {orders} orders
                </Text>
                {a.notes ? (
                  <Text variant="caption" tone="muted">
                    {a.notes}
                  </Text>
                ) : null}
                <Button label="Edit" icon={Pencil} size="sm" variant="outline" onPress={() => setEditing(a)} style={{ alignSelf: 'flex-start', marginTop: 'auto' }} />
              </Card>
            </View>
          );
        })}
      </View>
      {editing ? <EditArea area={editing} onClose={() => setEditing(null)} /> : null}
    </Page>
  );
}
