import React, { useState } from 'react';
import { View } from 'react-native';
import { MapPin, Pencil, Plus, Star, Trash2 } from '@/components/ui/icons';
import { space } from '@/theme';
import { useCustomer } from '@/hooks/useCustomer';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAction } from '@/hooks/useAction';
import { useConfirm } from '@/contexts/ConfirmContext';
import { userService } from '@/services/userService';
import type { SavedAddress } from '@/types';
import { Badge, Button, Card, EmptyState, Modal, PageHeader, Text } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { AddressForm } from '@/components/shared/AddressForm';

export default function Addresses() {
  const { db, addresses, selected, setSelectedId } = useCustomer();
  const { isDesktop } = useBreakpoint();
  const { run } = useAction();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<SavedAddress | 'new' | null>(null);

  return (
    <Page maxWidth={1000}>
      <PageHeader title="Saved addresses" subtitle="Save addresses for yourself and family members — choose one at checkout." breadcrumbs={[{ label: 'Profile', href: '/customer/profile' }, { label: 'Addresses' }]} actions={<Button label="Add address" icon={Plus} onPress={() => setEditing('new')} />} />
      {addresses.length === 0 ? (
        <Card>
          <EmptyState icon={MapPin} title="No saved addresses" action={<Button label="Add address" icon={Plus} onPress={() => setEditing('new')} />} />
        </Card>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space[2] }}>
          {addresses.map((a) => {
            const area = db.serviceAreas.find((s) => s.id === a.serviceAreaId);
            return (
              <View key={a.id} style={{ width: isDesktop ? '50%' : '100%', padding: space[2] }}>
                <Card style={{ gap: space[3], height: '100%' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' }}>
                    <Text variant="h3" style={{ flex: 1 }}>
                      {a.label}
                    </Text>
                    {a.isDefault ? <Badge label="Default" tone="info" size="sm" /> : null}
                    {selected?.id === a.id ? <Badge label="Delivering here" tone="teal" size="sm" /> : null}
                    {!area?.active ? <Badge label="Area not served" tone="danger" size="sm" /> : null}
                  </View>
                  <Text variant="bodySm">
                    {a.recipientName} · {a.phone}
                  </Text>
                  <Text variant="bodySm" tone="secondary">
                    {a.area}, {area?.name}, {a.city} · {a.region}
                  </Text>
                  <Text variant="caption" tone="secondary">
                    Landmark: {a.landmark}
                    {a.instructions ? ` · “${a.instructions}”` : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap', marginTop: 'auto' }}>
                    <Button label="Deliver here" size="sm" variant="secondary" onPress={() => setSelectedId(a.id)} disabled={selected?.id === a.id} />
                    {!a.isDefault ? <Button label="Make default" icon={Star} size="sm" variant="ghost" onPress={() => run(() => userService.saveAddress({ ...a, isDefault: true }), { success: 'Default address updated' })} /> : null}
                    <Button label="Edit" icon={Pencil} size="sm" variant="ghost" onPress={() => setEditing(a)} />
                    <Button
                      label="Delete"
                      icon={Trash2}
                      size="sm"
                      variant="ghost"
                      onPress={async () => {
                        const r = await confirm({ title: `Delete “${a.label}”?`, message: 'This address will be removed from your profile.', confirmLabel: 'Delete', tone: 'danger' });
                        if (r.confirmed) run(() => userService.deleteAddress(a.id), { success: 'Address deleted' });
                      }}
                    />
                  </View>
                </Card>
              </View>
            );
          })}
        </View>
      )}
      <Modal visible={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add address' : 'Edit address'} width={620}>
        {editing ? (
          <AddressForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSubmit={async (v) => {
              const r = await run(() => userService.saveAddress({ ...v, id: editing === 'new' ? undefined : editing.id }), { success: 'Address saved' });
              if (r) setEditing(null);
            }}
          />
        ) : null}
      </Modal>
    </Page>
  );
}
