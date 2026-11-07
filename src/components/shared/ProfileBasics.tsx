import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { LogOut, RotateCcw, Save } from '@/components/ui/icons';
import { space } from '@/theme';
import { useCurrentUser } from '@/hooks/useDb';
import { useAction } from '@/hooks/useAction';
import { useConfirm } from '@/contexts/ConfirmContext';
import { userService } from '@/services/userService';
import { authService } from '@/services/authService';
import { adminService } from '@/services/adminService';
import { storageService } from '@/services/storageService';
import { DEMO_DISCLAIMER } from '@/constants/catalog';
import { formatDate } from '@/utils/format';
import { Avatar, Badge, Button, Callout, Card, CardHeader, Input, KeyValue, Text } from '@/components/ui';

/** Profile card + demo controls, reused by every role's profile screen. */
export function ProfileCard() {
  const user = useCurrentUser();
  const { run, loading } = useAction();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  if (!user) return null;
  const dirty = name !== user.name || phone !== user.phone;
  return (
    <Card style={{ gap: space[4] }}>
      <View style={{ flexDirection: 'row', gap: space[4], alignItems: 'center', flexWrap: 'wrap' }}>
        <Avatar name={user.name} size={56} />
        <View style={{ flex: 1, minWidth: 180 }}>
          <Text variant="h2">{user.name}</Text>
          <Text variant="bodySm" tone="secondary">
            {user.email}
          </Text>
          <View style={{ flexDirection: 'row', gap: space[2], marginTop: 6, flexWrap: 'wrap' }}>
            <Badge label={user.role === 'admin' ? 'Administrator' : user.role[0].toUpperCase() + user.role.slice(1)} tone="info" size="sm" />
            {user.isDemoAccount ? <Badge label="Demo account" tone="warning" size="sm" /> : null}
            {user.title ? <Badge label={user.title} size="sm" /> : null}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: space[3], flexWrap: 'wrap' }}>
        <Input containerStyle={{ flex: 1, minWidth: 200 }} label="Full name" value={name} onChangeText={setName} />
        <Input containerStyle={{ flex: 1, minWidth: 200 }} label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </View>
      <Input label="Email" value={user.email} editable={false} hint="Email changes are disabled in the demo." />
      <KeyValue label="Member since" value={formatDate(user.createdAt)} />
      <Button label="Save changes" icon={Save} disabled={!dirty} loading={loading} onPress={() => run(() => userService.updateProfile({ name, phone }), { success: 'Profile updated' })} style={{ alignSelf: 'flex-start' }} />
    </Card>
  );
}

export function DemoControls() {
  const confirm = useConfirm();
  const { run, loading } = useAction();
  return (
    <Card style={{ gap: space[3] }}>
      <CardHeader title="Demo controls" subtitle={storageService.isPersistent() ? 'Data is saved in this browser’s localStorage.' : 'Browser storage unavailable — data resets on reload.'} />
      <Callout tone="info">{DEMO_DISCLAIMER}</Callout>
      <Text variant="caption" tone="secondary">
        Data is local to this browser and is not synchronised across devices. Tabs in the same browser share data, so you can open each role in its own tab.
      </Text>
      <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
        <Button
          label="Reset demo data"
          icon={RotateCcw}
          variant="outline"
          loading={loading}
          onPress={async () => {
            const r = await confirm({ title: 'Reset demo data?', message: 'All changes made in this browser will be replaced by the original fictional dataset.', confirmLabel: 'Reset', tone: 'danger' });
            if (r.confirmed) await run(() => adminService.resetDemoData(), { success: 'Demo data reset' });
          }}
        />
        <Button
          label="Sign out"
          icon={LogOut}
          variant="ghost"
          onPress={() => {
            authService.logout();
            router.replace('/login');
          }}
        />
      </View>
    </Card>
  );
}
