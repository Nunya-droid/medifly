import React from 'react';
import { View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { space } from '@/theme';
import { useDb } from '@/hooks/useDb';
import { GHANA_REGIONS } from '@/constants/catalog';
import { Button, Checkbox, Input, Select, TextArea } from '@/components/ui';
import type { SavedAddress } from '@/types';

export const addressSchema = z.object({
  label: z.string().trim().min(1, 'Give this address a label'),
  recipientName: z.string().trim().min(2, 'Recipient name is required'),
  phone: z.string().trim().regex(/^(\+233|0)[\s\d]{9,13}$/, 'Use a Ghanaian number, e.g. +233 24 555 0142'),
  region: z.string().min(1, 'Choose a region'),
  city: z.string().trim().min(2, 'City is required'),
  serviceAreaId: z.string().min(1, 'Choose a service area'),
  area: z.string().trim().min(3, 'Street, house or area is required'),
  landmark: z.string().trim().min(2, 'A landmark helps couriers find you'),
  instructions: z.string().trim().max(200).optional(),
  isDefault: z.boolean().optional(),
});
export type AddressValues = z.infer<typeof addressSchema>;

export function AddressForm({ initial, onSubmit, submitLabel = 'Save address', onCancel, hideLabel, showDefault = true }: { initial?: Partial<SavedAddress>; onSubmit: (v: AddressValues) => Promise<unknown> | void; submitLabel?: string; onCancel?: () => void; hideLabel?: boolean; showDefault?: boolean }) {
  const db = useDb();
  const { control, handleSubmit, formState } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: initial?.label ?? (hideLabel ? 'Delivery' : ''),
      recipientName: initial?.recipientName ?? '',
      phone: initial?.phone ?? '',
      region: initial?.region ?? 'Greater Accra',
      city: initial?.city ?? 'Accra',
      serviceAreaId: initial?.serviceAreaId ?? 'sa-madina',
      area: initial?.area ?? '',
      landmark: initial?.landmark ?? '',
      instructions: initial?.instructions ?? '',
      isDefault: initial?.isDefault ?? false,
    },
  });
  const e = formState.errors;
  const areaOptions = db.serviceAreas.map((a) => ({ value: a.id, label: a.name, description: a.active ? `${a.city} · from GH₵${a.baseFee}` : 'Not yet served (coming soon)', disabled: !a.active }));
  const row = { flexDirection: 'row' as const, gap: space[3], flexWrap: 'wrap' as const };
  const half = { flex: 1, minWidth: 200 };

  return (
    <View style={{ gap: space[4] }}>
      {!hideLabel ? <Controller control={control} name="label" render={({ field }) => <Input label="Label" placeholder="Home, Office, Mum's house…" value={field.value} onChangeText={field.onChange} error={e.label?.message} required />} /> : null}
      <View style={row}>
        <Controller control={control} name="recipientName" render={({ field }) => <Input containerStyle={half} label="Recipient name" value={field.value} onChangeText={field.onChange} error={e.recipientName?.message} required />} />
        <Controller control={control} name="phone" render={({ field }) => <Input containerStyle={half} label="Recipient phone" placeholder="+233 24 555 0142" keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} error={e.phone?.message} required />} />
      </View>
      <View style={row}>
        <Controller control={control} name="region" render={({ field }) => <Select style={half} label="Region" value={field.value} onChange={field.onChange} options={GHANA_REGIONS.map((r) => ({ value: r, label: r }))} error={e.region?.message} required />} />
        <Controller control={control} name="city" render={({ field }) => <Input containerStyle={half} label="City" value={field.value} onChangeText={field.onChange} error={e.city?.message} required />} />
      </View>
      <Controller control={control} name="serviceAreaId" render={({ field }) => <Select label="Service area" value={field.value} onChange={field.onChange} options={areaOptions} error={e.serviceAreaId?.message} hint="MediFly currently delivers in selected Accra areas (demo)." width={320} required />} />
      <Controller control={control} name="area" render={({ field }) => <Input label="Street / house / area" placeholder="e.g. Madina Estates, House 12" value={field.value} onChangeText={field.onChange} error={e.area?.message} required />} />
      <Controller control={control} name="landmark" render={({ field }) => <Input label="Landmark" placeholder="e.g. Behind Madina Polyclinic" value={field.value} onChangeText={field.onChange} error={e.landmark?.message} required />} />
      <Controller control={control} name="instructions" render={({ field }) => <TextArea label="Delivery instructions (optional)" placeholder="Gate colour, who to hand to, when to call…" value={field.value} onChangeText={field.onChange} error={e.instructions?.message} />} />
      {showDefault ? <Controller control={control} name="isDefault" render={({ field }) => <Checkbox checked={!!field.value} onChange={field.onChange} label="Make this my default address" />} /> : null}
      <View style={{ flexDirection: 'row', gap: space[2], justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {onCancel ? <Button label="Cancel" variant="outline" onPress={onCancel} /> : null}
        <Button label={submitLabel} loading={formState.isSubmitting} onPress={() => handleSubmit(async (v) => { await onSubmit(v); })()} />
      </View>
    </View>
  );
}
