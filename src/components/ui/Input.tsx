import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { Search, X, type LucideIcon } from '@/components/ui/icons';
import { colors, fonts, radius, space } from '@/theme';
import { Text } from './Text';
import type { TextInputRef } from './refs';

export function FormField({ label, error, hint, required, children, style }: { label?: string; error?: string; hint?: string; required?: boolean; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.field, style]}>
      {label ? (
        <Text variant="label" style={styles.label}>
          {label}
          {required ? <Text variant="label" tone="danger"> *</Text> : null}
        </Text>
      ) : null}
      {children}
      {error ? (
        <Text variant="caption" tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  icon?: LucideIcon;
  suffix?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = forwardRef<TextInputRef, InputProps>(function Input({ label, error, hint, required, icon: Icon, suffix, containerStyle, style, multiline, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <FormField label={label} error={error} hint={hint} required={required} style={containerStyle}>
      <View style={[styles.box, multiline && styles.boxMulti, focused && styles.focused, !!error && styles.errored, rest.editable === false && styles.readonly]}>
        {Icon ? <Icon size={18} color={colors.textMuted} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          {...rest}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          style={[styles.input, multiline && styles.multi, style]}
        />
        {suffix}
      </View>
    </FormField>
  );
});

export function TextArea(props: InputProps) {
  return <Input multiline numberOfLines={4} textAlignVertical="top" {...props} />;
}

export function SearchInput({ value, onChangeText, placeholder = 'Search', onSubmit, style, autoFocus }: { value: string; onChangeText: (v: string) => void; placeholder?: string; onSubmit?: () => void; style?: StyleProp<ViewStyle>; autoFocus?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.box, styles.search, focused && styles.focused, style]}>
      <Search size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={placeholder}
        style={styles.input}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} accessibilityLabel="Clear search" hitSlop={10} style={styles.clear}>
          <X size={16} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { color: colors.text },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 44,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  boxMulti: { alignItems: 'flex-start', paddingVertical: space[2] },
  search: { backgroundColor: colors.surface },
  focused: { borderColor: colors.blue, boxShadow: '0 0 0 3px rgba(40,120,184,0.15)' } as ViewStyle,
  errored: { borderColor: colors.danger },
  readonly: { backgroundColor: colors.surfaceSunken },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 10,
    outlineStyle: 'none',
  } as object,
  multi: { minHeight: 96, paddingVertical: 4 },
  clear: { padding: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceSunken },
});
