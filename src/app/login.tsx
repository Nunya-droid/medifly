import React, { useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bike, Building2, ChevronRight, Lock, Mail, ShieldCheck, User as UserIcon, type LucideIcon } from '@/components/ui/icons';
import { colors, radius, space } from '@/theme';
import { authService } from '@/services/authService';
import { getErrorMessage } from '@/services/api';
import { useCurrentUser } from '@/hooks/useDb';
import { useToast } from '@/contexts/ToastContext';
import { onboarding } from '@/utils/onboarding';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ROLE_HOME } from '@/constants/catalog';
import { Button, Callout, Input, Text, Divider } from '@/components/ui';
import { AuthLayout, authStyles } from '@/components/layout/AuthLayout';
import type { Role, User } from '@/types';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

const ROLE_ICON: Record<Role, LucideIcon> = { customer: UserIcon, pharmacy: Building2, courier: Bike, admin: ShieldCheck };

export default function LoginScreen() {
  const user = useCurrentUser();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  // Single navigation path: once the session exists, redirect. First-time customers see the
  // welcome intro; otherwise honour a ?redirect= deep link for the same role, else the role home.
  const landingFor = (u: User) => {
    if (u.role === 'customer' && !onboarding.seen(u.id)) return '/welcome';
    return redirect && redirect.startsWith(`/${u.role}`) ? redirect : ROLE_HOME[u.role];
  };

  if (user) return <Redirect href={landingFor(user) as never} />;

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const u = await authService.login(values.email, values.password);
      toast.show({ tone: 'success', title: `Welcome back, ${u.name.split(' ')[0]}` });
    } catch (e) {
      setFormError(getErrorMessage(e));
    }
  });

  const onSubmit = () => {
    submit();
  };

  const demoLogin = async (email: string) => {
    setDemoLoading(email);
    try {
      const u = await authService.login(email, DEMO_PASSWORD);
      toast.show({ tone: 'success', title: `Signed in as demo ${u.role === 'admin' ? 'administrator' : u.role}` });
    } catch (e) {
      setFormError(getErrorMessage(e));
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <AuthLayout>
      <View style={authStyles.card}>
        <View style={{ gap: 4 }}>
          <Text variant="h1">Sign in</Text>
          <Text variant="body" tone="secondary">
            Use a demo account below, or enter the credentials manually.
          </Text>
        </View>

        <View style={{ gap: space[2] }}>
          <Text variant="overline" tone="secondary" uppercase>
            One-click demo accounts
          </Text>
          <View style={styles.demoGrid}>
            {DEMO_ACCOUNTS.map((a) => {
              const Icon = ROLE_ICON[a.role];
              return (
                <Pressable
                  key={a.email}
                  onPress={() => demoLogin(a.email)}
                  disabled={!!demoLoading}
                  accessibilityRole="button"
                  accessibilityLabel={`Sign in as demo ${a.label}`}
                  style={(state) => {
                    const { hovered } = state as typeof state & { hovered?: boolean };
                    return [styles.demo, hovered && { borderColor: colors.blue, backgroundColor: colors.blueTint }, demoLoading === a.email && { opacity: 0.6 }];
                  }}
                >
                  <View style={styles.demoIcon}>
                    <Icon size={18} color={colors.blue} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="title">{demoLoading === a.email ? 'Signing in…' : a.label}</Text>
                    <Text variant="caption" tone="secondary" numberOfLines={1}>
                      {a.description}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.textMuted} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <Divider style={{ flex: 1, alignSelf: 'center' }} />
          <Text variant="caption" tone="muted">
            or sign in with email
          </Text>
          <Divider style={{ flex: 1, alignSelf: 'center' }} />
        </View>

        {formError ? <Callout tone="danger">{formError}</Callout> : null}

        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <Input label="Email" icon={Mail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={formState.errors.email?.message} onSubmitEditing={onSubmit} />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <Input label="Password" icon={Lock} placeholder="••••••••" secureTextEntry autoComplete="password" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={formState.errors.password?.message} onSubmitEditing={onSubmit} />
          )}
        />
        <Button label="Sign in" size="lg" fullWidth loading={formState.isSubmitting} onPress={onSubmit} />

        <Callout tone="info" title="Demonstration sign-in">
          All demo accounts use the password {DEMO_PASSWORD}. This is a simulated authentication system for an academic demo — not production-grade security.
        </Callout>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text variant="bodySm" tone="secondary">
            New customer?
          </Text>
          <Pressable onPress={() => router.push('/register')} accessibilityRole="link">
            <Text variant="bodySm" tone="primary" weight="semibold">
              Create a demo account
            </Text>
          </Pressable>
        </View>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  demoGrid: { gap: space[2] },
  demo: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, minHeight: 56, cursor: 'pointer' } as ViewStyle,
  demoIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' },
});
