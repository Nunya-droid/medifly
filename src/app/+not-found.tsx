import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { MapPinOff } from '@/components/ui/icons';
import { colors, space } from '@/theme';
import { useCurrentUser } from '@/hooks/useDb';
import { ROLE_HOME } from '@/constants/catalog';
import { Button, EmptyState } from '@/components/ui';
import { Logo } from '@/components/illustrations';

export default function NotFound() {
  const user = useCurrentUser();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: space[6], gap: space[6] }}>
      <Logo />
      <EmptyState
        icon={MapPinOff}
        title="Page not found"
        message="The page you’re looking for doesn’t exist or has moved."
        action={
          <View style={{ flexDirection: 'row', gap: space[2] }}>
            <Button label="Go home" variant="outline" onPress={() => router.replace('/')} />
            {user ? <Button label="Open dashboard" onPress={() => router.replace(ROLE_HOME[user.role] as never)} /> : <Button label="Sign in" onPress={() => router.replace('/login')} />}
          </View>
        }
      />
    </View>
  );
}
