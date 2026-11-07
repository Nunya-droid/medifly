import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Mail, Phone, User as UserIcon } from '@/components/ui/icons';
import { space } from '@/theme';
import { authService } from '@/services/authService';
import { getErrorMessage } from '@/services/api';
import { useCurrentUser } from '@/hooks/useDb';
import { useToast } from '@/contexts/ToastContext';
import { ROLE_HOME } from '@/constants/catalog';
import { onboarding } from '@/utils/onboarding';
import { Button, Callout, Checkbox, Input, Text } from '@/components/ui';
import { AuthLayout, authStyles } from '@/components/layout/AuthLayout';

const schema = z
  .object({
    name: z.string().trim().min(2, 'Enter your full name'),
    email: z.string().trim().email('Enter a valid email address'),
    phone: z
      .string()
      .trim()
      .regex(/^(\+233|0)\s?\d{2}\s?\d{3}\s?\d{4}$/, 'Use a Ghanaian format, e.g. +233 24 555 0142 or 024 555 0142'),
    password: z.string().min(8, 'At least 8 characters').regex(/[0-9]/, 'Include a number'),
    confirm: z.string(),
    accept: z.boolean().refine((v) => v, 'Please acknowledge the demo terms'),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });
type FormValues = z.infer<typeof schema>;

export default function RegisterScreen() {
  const user = useCurrentUser();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', phone: '', password: '', confirm: '', accept: false } });
  // Single navigation path once the session exists; new customers see the welcome intro.
  if (user) return <Redirect href={(user.role === 'customer' && !onboarding.seen(user.id) ? '/welcome' : ROLE_HOME[user.role]) as never} />;

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await authService.register({ name: v.name, email: v.email, phone: v.phone, password: v.password });
      toast.show({ tone: 'success', title: 'Demo account created', message: 'Add a delivery address to start ordering.' });
    } catch (e) {
      setError(getErrorMessage(e));
    }
  });

  const e = formState.errors;
  return (
    <AuthLayout>
      <View style={authStyles.card}>
        <View style={{ gap: 4 }}>
          <Text variant="h1">Create an account</Text>
          <Text variant="body" tone="secondary">
            Customer accounts only. Pharmacies and couriers join through partner onboarding.
          </Text>
        </View>
        {error ? <Callout tone="danger">{error}</Callout> : null}
        <Controller control={control} name="name" render={({ field }) => <Input label="Full name" icon={UserIcon} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={e.name?.message} autoComplete="name" required />} />
        <Controller control={control} name="email" render={({ field }) => <Input label="Email" icon={Mail} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={e.email?.message} autoCapitalize="none" keyboardType="email-address" required />} />
        <Controller control={control} name="phone" render={({ field }) => <Input label="Phone" icon={Phone} placeholder="+233 24 555 0142" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={e.phone?.message} keyboardType="phone-pad" required />} />
        <View style={{ flexDirection: 'row', gap: space[3], flexWrap: 'wrap' }}>
          <Controller control={control} name="password" render={({ field }) => <Input containerStyle={{ flex: 1, minWidth: 180 }} label="Password" icon={Lock} secureTextEntry value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={e.password?.message} required />} />
          <Controller control={control} name="confirm" render={({ field }) => <Input containerStyle={{ flex: 1, minWidth: 180 }} label="Confirm password" icon={Lock} secureTextEntry value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={e.confirm?.message} required />} />
        </View>
        <Controller
          control={control}
          name="accept"
          render={({ field }) => (
            <View style={{ gap: 4 }}>
              <Checkbox checked={field.value} onChange={field.onChange} label="I understand this is a demonstration" description="Do not enter real health information. Data is stored only in this browser and is not secure." />
              {e.accept ? (
                <Text variant="caption" tone="danger">
                  {e.accept.message}
                </Text>
              ) : null}
            </View>
          )}
        />
        <Button label="Create account" size="lg" fullWidth loading={formState.isSubmitting} onPress={() => onSubmit()} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          <Text variant="bodySm" tone="secondary">
            Already registered?
          </Text>
          <Pressable onPress={() => router.push('/login')} accessibilityRole="link">
            <Text variant="bodySm" tone="primary" weight="semibold">
              Sign in
            </Text>
          </Pressable>
        </View>
      </View>
    </AuthLayout>
  );
}
