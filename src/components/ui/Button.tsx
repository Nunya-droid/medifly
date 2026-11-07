import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from '@/components/ui/icons';
import { colors, radius, fonts } from '@/theme';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'teal' | 'inverse';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const palette: Record<ButtonVariant, { bg: string; hover: string; press: string; fg: string; border: string }> = {
  primary: { bg: colors.blue, hover: colors.blueHover, press: colors.bluePressed, fg: '#fff', border: colors.blue },
  secondary: { bg: colors.blueTint, hover: colors.blueTintStrong, press: colors.blueTintStrong, fg: colors.navy, border: colors.blueTint },
  outline: { bg: colors.surface, hover: colors.surfaceMuted, press: colors.surfaceSunken, fg: colors.text, border: colors.borderStrong },
  ghost: { bg: 'transparent', hover: colors.surfaceSunken, press: colors.border, fg: colors.navy, border: 'transparent' },
  danger: { bg: colors.danger, hover: '#C94650', press: '#B83A44', fg: '#fff', border: colors.danger },
  teal: { bg: colors.teal, hover: colors.tealDark, press: colors.tealDark, fg: '#fff', border: colors.teal },
  inverse: { bg: '#fff', hover: '#F1F5F9', press: '#E3EAF0', fg: colors.navy, border: '#fff' },
};

const sizes: Record<ButtonSize, { h: number; px: number; font: number; icon: number; gap: number }> = {
  sm: { h: 36, px: 12, font: 13, icon: 16, gap: 6 },
  md: { h: 44, px: 16, font: 14, icon: 18, gap: 8 },
  lg: { h: 52, px: 22, font: 15, icon: 20, gap: 10 },
};

export function Button({ label, variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, loading, fullWidth, disabled, style, ...rest }: ButtonProps) {
  const p = palette[variant];
  const s = sizes[size];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      accessibilityLabel={label}
      disabled={isDisabled}
      {...rest}
      style={(state) => {
        const { pressed, hovered } = state as typeof state & { hovered?: boolean };
        return [
          styles.base,
          { height: s.h, paddingHorizontal: s.px, backgroundColor: pressed ? p.press : hovered ? p.hover : p.bg, borderColor: p.border, gap: s.gap },
          fullWidth && styles.full,
          isDisabled && styles.disabled,
          style,
        ];
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={p.fg} />
      ) : (
        <>
          {Icon ? <Icon size={s.icon} color={p.fg} strokeWidth={2} /> : null}
          <Text style={{ color: p.fg, fontSize: s.font, fontFamily: fonts.semibold, lineHeight: s.font + 6 }} numberOfLines={1}>
            {label}
          </Text>
          {IconRight ? <IconRight size={s.icon} color={p.fg} strokeWidth={2} /> : null}
        </>
      )}
    </Pressable>
  );
}

interface IconButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  icon: LucideIcon;
  label: string;
  variant?: 'ghost' | 'outline' | 'secondary' | 'primary';
  size?: number;
  badge?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ icon: Icon, label, variant = 'ghost', size = 44, badge, color, style, disabled, ...rest }: IconButtonProps) {
  const p = palette[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      {...rest}
      style={(state) => {
        const { pressed, hovered } = state as typeof state & { hovered?: boolean };
        return [
          styles.icon,
          { width: size, height: size, backgroundColor: pressed ? p.press : hovered ? p.hover : p.bg, borderColor: p.border },
          disabled && styles.disabled,
          style,
        ];
      }}
    >
      <Icon size={Math.round(size * 0.45)} color={color ?? p.fg} strokeWidth={2} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    cursor: 'pointer',
  } as ViewStyle,
  full: { alignSelf: 'stretch', width: '100%' },
  disabled: { opacity: 0.5 },
  icon: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, cursor: 'pointer' } as ViewStyle,
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 10, lineHeight: 12, fontFamily: fonts.bold },
});
