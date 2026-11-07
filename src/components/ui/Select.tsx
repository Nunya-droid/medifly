import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Check, ChevronDown } from '@/components/ui/icons';
import { colors, radius, space } from '@/theme';
import { Text } from './Text';
import { FormField } from './Input';
import { Popover, MenuItem } from './Overlay';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SelectProps<T extends string> {
  value: T | undefined;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  compact?: boolean;
  prefix?: string;
  style?: StyleProp<ViewStyle>;
  width?: number;
}

export function Select<T extends string>({ value, options, onChange, label, placeholder = 'Select…', error, hint, required, compact, prefix, style, width }: SelectProps<T>) {
  const current = options.find((o) => o.value === value);
  return (
    <FormField label={label} error={error} hint={hint} required={required} style={style}>
      <Popover
        width={width ?? 240}
        trigger={({ onPress, ref }) => (
          <Pressable
            ref={ref}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${label ?? prefix ?? 'Select'}: ${current?.label ?? placeholder}`}
            style={(state) => {
              const { hovered } = state as typeof state & { hovered?: boolean };
              return [styles.trigger, compact && styles.compact, hovered && { borderColor: colors.blue }, !!error && { borderColor: colors.danger }];
            }}
          >
            <Text variant={compact ? 'label' : 'bodySm'} tone={current ? 'default' : 'muted'} numberOfLines={1} style={{ flex: 1 }}>
              {prefix ? <Text variant={compact ? 'label' : 'bodySm'} tone="secondary">{prefix}: </Text> : null}
              {current?.label ?? placeholder}
            </Text>
            <ChevronDown size={16} color={colors.textSecondary} />
          </Pressable>
        )}
      >
        {(close) => (
          <View>
            {options.map((o) => (
              <View key={o.value} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <MenuItem
                    label={o.label}
                    description={o.description}
                    selected={o.value === value}
                    disabled={o.disabled}
                    icon={o.value === value ? Check : undefined}
                    onPress={() => {
                      onChange(o.value);
                      close();
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </Popover>
    </FormField>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 44,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    cursor: 'pointer',
  } as ViewStyle,
  compact: { minHeight: 38 },
});
