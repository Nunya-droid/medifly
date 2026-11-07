import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { CheckCircle2 } from '@/components/ui/icons';
import { colors, radius, space } from '@/theme';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Text } from '@/components/ui';
import { Logo, HeroIllustration } from '@/components/illustrations';
import { DEMO_DISCLAIMER } from '@/constants/catalog';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isDesktop } = useBreakpoint();
  return (
    <View style={styles.root}>
      {isDesktop ? (
        <View style={styles.aside}>
          <Pressable onPress={() => router.push('/')} accessibilityRole="link" accessibilityLabel="MediFly home">
            <Logo inverse showTagline />
          </Pressable>
          <View style={{ gap: space[5] }}>
            <Text variant="h1" style={{ color: '#fff', maxWidth: 440 }}>
              One platform for customers, pharmacies and delivery partners.
            </Text>
            {['Confirmed pharmacy stock before you pay', 'Pharmacist review for prescription items', 'Explainable delivery recommendations'].map((t) => (
              <View key={t} style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
                <CheckCircle2 size={18} color={colors.teal} />
                <Text variant="body" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {t}
                </Text>
              </View>
            ))}
            <View style={{ maxWidth: 420, opacity: 0.95, marginTop: space[4] }}>
              <HeroIllustration />
            </View>
          </View>
          <Text variant="caption" style={{ color: 'rgba(255,255,255,0.55)', maxWidth: 460 }}>
            {DEMO_DISCLAIMER}
          </Text>
        </View>
      ) : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.main} keyboardShouldPersistTaps="handled">
        {!isDesktop ? (
          <Pressable onPress={() => router.push('/')} style={{ marginBottom: space[6] }} accessibilityRole="link">
            <Logo />
          </Pressable>
        ) : null}
        <View style={{ width: '100%', maxWidth: 440 }}>{children}</View>
        {!isDesktop ? (
          <Text variant="caption" tone="muted" align="center" style={{ marginTop: space[8], maxWidth: 440 }}>
            {DEMO_DISCLAIMER}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  aside: { width: '44%', maxWidth: 620, backgroundColor: colors.navy, padding: space[12], justifyContent: 'space-between', gap: space[8] },
  main: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[5], paddingVertical: space[10] },
});

export const authStyles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: space[6], gap: space[4] },
});
