import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * MediFly design tokens.
 * Navy typography, blue primary actions, teal highlights on light neutral surfaces.
 */
export const colors = {
  navy: '#153B56',
  navyDeep: '#0E2A3F',
  navySoft: '#24506F',
  blue: '#2878B8',
  blueHover: '#1F67A1',
  bluePressed: '#18568A',
  blueTint: '#EAF4FA',
  blueTintStrong: '#D4E8F5',
  teal: '#20A89A',
  tealDark: '#178A7E',
  tealTint: '#E6F6F4',
  background: '#F6F9FC',
  surface: '#FFFFFF',
  surfaceMuted: '#F9FBFD',
  surfaceSunken: '#F1F5F9',
  text: '#183044',
  textSecondary: '#5E7184',
  textMuted: '#8A9AAB',
  textInverse: '#FFFFFF',
  border: '#E3EAF0',
  borderStrong: '#CBD6E0',
  success: '#21966F',
  successTint: '#E5F5EF',
  warning: '#E9A23B',
  warningText: '#A86A0E',
  warningTint: '#FDF3E3',
  danger: '#D9535D',
  dangerText: '#B83A44',
  dangerTint: '#FBEBEC',
  info: '#2878B8',
  infoTint: '#EAF4FA',
  violet: '#6D5BD0',
  violetTint: '#EFEDFB',
  overlay: 'rgba(14, 42, 63, 0.45)',
} as const;

/**
 * Categorical chart palette, assigned in fixed order. Validated with the dataviz palette
 * validator (lightness, chroma, CVD and normal-vision separation all pass on white).
 * Teal and amber are below 3:1 contrast, so every chart shows values as text (legend/labels/tooltip).
 * Status colours (success/warning/danger) are deliberately NOT in this list.
 */
export const chartColors = ['#2878B8', '#20A89A', '#E9A23B', '#6D5BD0', '#C2569B', '#7A8F2E'];

export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export type FontWeightKey = keyof typeof fonts;

type TypeStyle = { size: number; lineHeight: number; weight: FontWeightKey; letterSpacing?: number };

export const typeScale = {
  display: { size: 48, lineHeight: 56, weight: 'bold', letterSpacing: -1.2 },
  h1: { size: 30, lineHeight: 38, weight: 'bold', letterSpacing: -0.6 },
  h2: { size: 22, lineHeight: 30, weight: 'semibold', letterSpacing: -0.3 },
  h3: { size: 17, lineHeight: 24, weight: 'semibold', letterSpacing: -0.1 },
  title: { size: 15, lineHeight: 22, weight: 'semibold' },
  body: { size: 15, lineHeight: 23, weight: 'regular' },
  bodySm: { size: 14, lineHeight: 21, weight: 'regular' },
  label: { size: 13, lineHeight: 18, weight: 'medium' },
  caption: { size: 12, lineHeight: 17, weight: 'regular' },
  overline: { size: 11, lineHeight: 16, weight: 'semibold', letterSpacing: 0.8 },
  metric: { size: 28, lineHeight: 34, weight: 'bold', letterSpacing: -0.6 },
} satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof typeScale;

export function textStyle(variant: TypeVariant): TextStyle {
  const t: TypeStyle = typeScale[variant];
  return {
    fontFamily: fonts[t.weight],
    fontSize: t.size,
    lineHeight: t.lineHeight,
    letterSpacing: t.letterSpacing,
  };
}

export const shadow = {
  sm: Platform.select<ViewStyle>({
    web: { boxShadow: '0 1px 2px rgba(21, 59, 86, 0.06)' } as ViewStyle,
    default: { shadowColor: '#153B56', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  }),
  md: Platform.select<ViewStyle>({
    web: { boxShadow: '0 4px 14px rgba(21, 59, 86, 0.08), 0 1px 3px rgba(21, 59, 86, 0.05)' } as ViewStyle,
    default: { shadowColor: '#153B56', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  }),
  lg: Platform.select<ViewStyle>({
    web: { boxShadow: '0 18px 48px rgba(14, 42, 63, 0.18)' } as ViewStyle,
    default: { shadowColor: '#0E2A3F', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  }),
};

export const breakpoints = {
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const;

export const layout = {
  sidebarWidth: 248,
  sidebarCollapsed: 72,
  topBarHeight: 64,
  contentMaxWidth: 1240,
  touchTarget: 44,
} as const;
