import React from 'react';
import { Text as RNText, type TextProps, type TextStyle, StyleSheet } from 'react-native';
import { colors, fonts, textStyle, type TypeVariant, type FontWeightKey } from '@/theme';

export type TextTone = 'default' | 'secondary' | 'muted' | 'inverse' | 'primary' | 'teal' | 'success' | 'warning' | 'danger' | 'navy';

const toneColor: Record<TextTone, string> = {
  default: colors.text,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  inverse: colors.textInverse,
  primary: colors.blue,
  teal: colors.tealDark,
  success: colors.success,
  warning: colors.warningText,
  danger: colors.dangerText,
  navy: colors.navy,
};

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  tone?: TextTone;
  weight?: FontWeightKey;
  align?: TextStyle['textAlign'];
  uppercase?: boolean;
  tabular?: boolean;
}

export function Text({ variant = 'body', tone = 'default', weight, align, uppercase, tabular, style, ...rest }: AppTextProps) {
  return (
    <RNText
      {...rest}
      style={[
        textStyle(variant),
        { color: toneColor[tone] },
        weight && { fontFamily: fonts[weight] },
        align && { textAlign: align },
        uppercase && styles.upper,
        tabular && styles.tabular,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  upper: { textTransform: 'uppercase' },
  tabular: { fontVariant: ['tabular-nums'] },
});
