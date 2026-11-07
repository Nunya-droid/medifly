import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Bike, Car, Drone, Info } from '@/components/ui/icons';
import type { DeliveryMethod, Product } from '@/types';
import { colors, fonts, radius, space } from '@/theme';
import { Text } from '@/components/ui/Text';

/* ------------------------------------------------------------------ Logo */

export function LogoMark({ size = 32, inverse }: { size?: number; inverse?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" accessibilityLabel="MediFly logo">
      <Rect width={32} height={32} rx={9} fill={inverse ? '#fff' : colors.navy} />
      <Path d="M13 8h6v5h5v6h-5v5h-6v-5H8v-6h5z" fill={colors.teal} />
      <Path d="M21 7.5l4.5-1.5-1.5 4.5" stroke={inverse ? colors.navy : '#fff'} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function Logo({ size = 30, inverse, showTagline }: { size?: number; inverse?: boolean; showTagline?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <LogoMark size={size} inverse={inverse} />
      <View>
        <Text style={{ fontFamily: fonts.bold, fontSize: size * 0.62, lineHeight: size * 0.75, color: inverse ? '#fff' : colors.navy, letterSpacing: -0.4 }}>
          Medi<Text style={{ fontFamily: fonts.bold, fontSize: size * 0.62, color: colors.teal }}>Fly</Text>
        </Text>
        {showTagline ? (
          <Text variant="caption" style={{ color: inverse ? 'rgba(255,255,255,0.7)' : colors.textSecondary, fontSize: 11, lineHeight: 14 }}>
            Healthcare at Your Doorstep
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ Product visual */

const visualTints: Record<Product['visual'], [string, string]> = {
  tablet: ['#EAF4FA', '#2878B8'],
  capsule: ['#FBEBEC', '#D9535D'],
  bottle: ['#E6F6F4', '#20A89A'],
  sachet: ['#FDF3E3', '#E9A23B'],
  device: ['#EFEDFB', '#6D5BD0'],
  kit: ['#FBEBEC', '#D9535D'],
  tube: ['#E6F6F4', '#178A7E'],
  inhaler: ['#EAF4FA', '#153B56'],
  pen: ['#EFEDFB', '#6D5BD0'],
  box: ['#F1F5F9', '#5E7184'],
};

/** Illustrated placeholder product image (no real packaging or brands). */
export function ProductVisual({ visual, size = 64, style }: { visual: Product['visual']; size?: number; style?: StyleProp<ViewStyle> }) {
  const [bg, fg] = visualTints[visual];
  const s = size;
  let art: React.ReactNode;
  switch (visual) {
    case 'tablet':
      art = (
        <G>
          <Circle cx={22} cy={30} r={10} fill={fg} />
          <Line x1={14} y1={30} x2={30} y2={30} stroke="#fff" strokeWidth={2} />
          <Circle cx={40} cy={36} r={9} fill={fg} opacity={0.55} />
        </G>
      );
      break;
    case 'capsule':
      art = (
        <G transform="rotate(-35 32 32)">
          <Rect x={14} y={25} width={36} height={14} rx={7} fill={fg} />
          <Rect x={32} y={25} width={18} height={14} rx={7} fill="#fff" opacity={0.85} />
        </G>
      );
      break;
    case 'bottle':
      art = (
        <G>
          <Rect x={25} y={12} width={14} height={7} rx={2} fill={colors.navy} />
          <Rect x={20} y={18} width={24} height={34} rx={6} fill={fg} />
          <Rect x={24} y={28} width={16} height={12} rx={2} fill="#fff" opacity={0.9} />
        </G>
      );
      break;
    case 'sachet':
      art = (
        <G>
          <Path d="M18 14h28l-3 36H21z" fill={fg} />
          <Path d="M18 14h28v6H18z" fill={colors.navy} opacity={0.25} />
          <Rect x={26} y={28} width={12} height={10} rx={2} fill="#fff" opacity={0.9} />
        </G>
      );
      break;
    case 'device':
      art = (
        <G>
          <Rect x={18} y={14} width={28} height={36} rx={6} fill={fg} />
          <Rect x={22} y={19} width={20} height={12} rx={2} fill="#fff" />
          <Circle cx={32} cy={41} r={4} fill="#fff" opacity={0.85} />
        </G>
      );
      break;
    case 'kit':
      art = (
        <G>
          <Rect x={14} y={20} width={36} height={28} rx={5} fill={fg} />
          <Rect x={26} y={15} width={12} height={7} rx={2} fill={colors.navy} opacity={0.6} />
          <Path d="M29 27h6v4h4v6h-4v4h-6v-4h-4v-6h4z" fill="#fff" />
        </G>
      );
      break;
    case 'tube':
      art = (
        <G transform="rotate(-25 32 32)">
          <Path d="M22 16h20l-3 32H25z" fill={fg} />
          <Rect x={27} y={48} width={10} height={6} rx={1.5} fill={colors.navy} />
        </G>
      );
      break;
    case 'inhaler':
      art = (
        <G>
          <Rect x={26} y={12} width={12} height={28} rx={4} fill={fg} />
          <Path d="M22 38h20v8a4 4 0 01-4 4H26a4 4 0 01-4-4z" fill={colors.blue} />
        </G>
      );
      break;
    case 'pen':
      art = (
        <G transform="rotate(-40 32 32)">
          <Rect x={12} y={28} width={36} height={9} rx={4} fill={fg} />
          <Rect x={46} y={30} width={8} height={5} rx={1} fill={colors.navy} />
          <Rect x={20} y={30} width={10} height={5} rx={1} fill="#fff" opacity={0.85} />
        </G>
      );
      break;
    default:
      art = (
        <G>
          <Rect x={16} y={18} width={32} height={28} rx={4} fill={fg} />
          <Rect x={16} y={18} width={32} height={8} rx={2} fill={colors.navy} opacity={0.25} />
          <Rect x={22} y={32} width={20} height={4} rx={2} fill="#fff" opacity={0.9} />
        </G>
      );
  }
  return (
    <View style={[{ width: s, height: s, borderRadius: Math.max(8, s * 0.18), backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={s * 0.8} height={s * 0.8} viewBox="0 0 64 64">
        {art}
      </Svg>
    </View>
  );
}

/* ------------------------------------------------------------------ Delivery method icon */

export const METHOD_ICON: Record<DeliveryMethod, typeof Bike> = { motorcycle: Bike, vehicle: Car, drone: Drone };

export function MethodIcon({ method, size = 18, color = colors.navy }: { method: DeliveryMethod; size?: number; color?: string }) {
  const Icon = METHOD_ICON[method];
  return <Icon size={size} color={color} />;
}

/* ------------------------------------------------------------------ Route map (simulated) */

/**
 * Stylised map with pickup, destination and a progress marker derived from order status.
 * It is explicitly labelled as simulated — it is NOT live GPS.
 */
export function RouteMap({ progress, pickupLabel, dropLabel, method = 'motorcycle', height = 220, compact, failed }: { progress: number; pickupLabel: string; dropLabel: string; method?: DeliveryMethod; height?: number; compact?: boolean; failed?: boolean }) {
  // Route as a polyline in a 400x220 viewBox.
  const pts: [number, number][] = method === 'drone' ? [[70, 160], [330, 60]] : [[70, 160], [150, 160], [150, 105], [250, 105], [250, 60], [330, 60]];
  const segLens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = segLens.reduce((a, b) => a + b, 0);
  const at = (t: number): [number, number] => {
    let d = Math.max(0, Math.min(1, t)) * total;
    for (let i = 0; i < segLens.length; i++) {
      if (d <= segLens[i]) {
        const r = segLens[i] ? d / segLens[i] : 0;
        return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * r, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * r];
      }
      d -= segLens[i];
    }
    return pts[pts.length - 1];
  };
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const [cx, cy] = at(progress);
  const Icon = METHOD_ICON[method];

  return (
    <View style={[styles.map, { height }]} accessibilityLabel={`Simulated route from ${pickupLabel} to ${dropLabel}`}>
      <Svg width="100%" height="100%" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice">
        <Rect width={400} height={220} fill="#EEF4F8" />
        {/* blocks */}
        {[
          [10, 10, 120, 70],
          [170, 10, 60, 75],
          [270, 85, 120, 60],
          [10, 185, 120, 30],
          [170, 125, 60, 90],
          [270, 165, 120, 50],
          [10, 90, 120, 50],
          [290, 10, 100, 30],
        ].map(([x, y, w, h], i) => (
          <Rect key={i} x={x} y={y} width={w} height={h} rx={6} fill={i % 3 === 0 ? '#E3EDF4' : '#E8F0F5'} />
        ))}
        <Path d="M0 200 C 120 180, 220 230, 400 190 L400 220 L0 220Z" fill="#D6E9F3" />
        <Rect x={300} y={110} width={60} height={28} rx={8} fill="#DCEFE9" />
        {/* streets */}
        {[[0, 160, 400, 160], [0, 105, 400, 105], [0, 60, 400, 60], [150, 0, 150, 220], [250, 0, 250, 220], [70, 0, 70, 220], [330, 0, 330, 220]].map(([x1, y1, x2, y2], i) => (
          <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth={9} />
        ))}
        {/* route */}
        <Path d={path} stroke={colors.blue} strokeOpacity={0.25} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={method === 'drone' ? '2 10' : undefined} />
        <Path d={path} stroke={failed ? colors.danger : colors.blue} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={method === 'drone' ? '6 8' : '0'} />
        {/* pickup */}
        <G>
          <Circle cx={70} cy={160} r={14} fill={colors.teal} opacity={0.18} />
          <Circle cx={70} cy={160} r={8} fill={colors.teal} stroke="#fff" strokeWidth={3} />
        </G>
        {/* destination */}
        <G>
          <Path d="M330 30c-9 0-15 7-15 15 0 11 15 22 15 22s15-11 15-22c0-8-6-15-15-15z" fill={colors.navy} />
          <Circle cx={330} cy={45} r={5} fill="#fff" />
        </G>
        {/* courier */}
        {progress > 0 && progress < 1 ? (
          <G>
            <Circle cx={cx} cy={cy} r={16} fill={failed ? colors.danger : colors.blue} opacity={0.16} />
            <Circle cx={cx} cy={cy} r={11} fill={failed ? colors.danger : colors.blue} stroke="#fff" strokeWidth={3} />
          </G>
        ) : null}
      </Svg>
      {progress > 0 && progress < 1 ? (
        <View pointerEvents="none" style={[styles.courierIcon, { left: `${(cx / 400) * 100}%`, top: `${(cy / 220) * 100}%` }]}>
          <Icon size={11} color="#fff" />
        </View>
      ) : null}
      <View style={[styles.mapLabel, { left: space[3], bottom: space[3] }]}>
        <View style={[styles.legendDot, { backgroundColor: colors.teal }]} />
        <Text variant="caption" weight="semibold" numberOfLines={1} style={{ maxWidth: 140 }}>
          {pickupLabel}
        </Text>
      </View>
      <View style={[styles.mapLabel, { right: space[3], top: space[3] }]}>
        <View style={[styles.legendDot, { backgroundColor: colors.navy }]} />
        <Text variant="caption" weight="semibold" numberOfLines={1} style={{ maxWidth: 140 }}>
          {dropLabel}
        </Text>
      </View>
      {!compact ? (
        <View style={[styles.simTag]}>
          <Info size={12} color={colors.navy} />
          <Text variant="caption" weight="semibold" tone="navy" style={{ fontSize: 11 }}>
            Simulated tracking · not live GPS
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ Hero illustration */

export function HeroIllustration() {
  return (
    <View style={styles.hero} accessibilityLabel="Illustration of a pharmacy-to-doorstep delivery journey">
      <Svg width="100%" height="100%" viewBox="0 0 520 420">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#EAF4FA" />
            <Stop offset="1" stopColor="#F6F9FC" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={520} height={420} rx={24} fill="url(#sky)" />
        {/* ground */}
        <Path d="M0 330 C 140 300, 360 360, 520 320 L520 420 L0 420Z" fill="#E3EFF6" />
        {/* route arc */}
        <Path d="M120 250 C 200 120, 330 120, 410 230" stroke={colors.blue} strokeWidth={3} strokeDasharray="2 10" strokeLinecap="round" fill="none" />
        {/* pharmacy */}
        <G>
          <Rect x={40} y={200} width={150} height={130} rx={10} fill="#fff" stroke={colors.border} strokeWidth={2} />
          <Rect x={40} y={186} width={150} height={30} rx={8} fill={colors.navy} />
          <Rect x={60} y={240} width={40} height={40} rx={6} fill={colors.blueTint} />
          <Rect x={130} y={250} width={40} height={80} rx={6} fill={colors.tealTint} />
          <Path d="M110 144h20v14h14v20h-14v14h-20v-14H96v-20h14z" fill={colors.teal} />
        </G>
        {/* home */}
        <G>
          <Path d="M360 240 L420 196 L480 240 V330 H360Z" fill="#fff" stroke={colors.border} strokeWidth={2} />
          <Path d="M350 244 L420 190 L490 244" stroke={colors.navy} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Rect x={404} y={280} width={32} height={50} rx={4} fill={colors.blue} />
          <Rect x={372} y={258} width={22} height={22} rx={3} fill={colors.blueTint} />
          <Rect x={446} y={258} width={22} height={22} rx={3} fill={colors.blueTint} />
        </G>
        {/* courier bubble */}
        <G>
          <Circle cx={265} cy={150} r={34} fill="#fff" stroke={colors.blueTintStrong} strokeWidth={2} />
          <Circle cx={265} cy={150} r={24} fill={colors.blue} />
          <Path d="M252 156h10l5-9h7l4 9M256 160a4 4 0 100-0.1M276 160a4 4 0 100-0.1" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </G>
        {/* status chips */}
        <G>
          <Rect x={46} y={70} width={168} height={52} rx={12} fill="#fff" stroke={colors.border} />
          <Circle cx={70} cy={96} r={10} fill={colors.successTint} />
          <Path d="M65 96l3.5 3.5L75 93" stroke={colors.success} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          <Rect x={88} y={86} width={96} height={8} rx={4} fill={colors.navy} opacity={0.8} />
          <Rect x={88} y={100} width={70} height={6} rx={3} fill={colors.textMuted} opacity={0.5} />
        </G>
        <G>
          <Rect x={318} y={66} width={170} height={60} rx={12} fill="#fff" stroke={colors.border} />
          <Rect x={334} y={82} width={60} height={8} rx={4} fill={colors.teal} />
          <Rect x={334} y={98} width={120} height={6} rx={3} fill={colors.textMuted} opacity={0.5} />
          <Rect x={334} y={110} width={90} height={6} rx={3} fill={colors.blue} opacity={0.5} />
        </G>
      </Svg>
    </View>
  );
}

/* ------------------------------------------------------------------ Sample prescription preview */

/** Generated preview for seeded sample records — clearly fictional. */
export function SamplePrescription({ patient, pharmacy, height = 260 }: { patient: string; pharmacy: string; height?: number }) {
  return (
    <View style={[styles.rx, { height }]}>
      <View style={styles.rxHead}>
        <Text variant="overline" tone="inverse" uppercase>
          Sample document · fictional
        </Text>
      </View>
      <View style={{ padding: space[4], gap: space[2], flex: 1 }}>
        <Text variant="title">Demo Prescription Form</Text>
        <Text variant="caption" tone="secondary">
          Patient: {patient}
        </Text>
        <Text variant="caption" tone="secondary">
          For: {pharmacy}
        </Text>
        <View style={{ gap: 6, marginTop: space[2] }}>
          {[0.9, 0.7, 0.8, 0.5].map((w, i) => (
            <View key={i} style={{ height: 7, width: `${w * 100}%`, backgroundColor: colors.border, borderRadius: 4 }} />
          ))}
        </View>
        <View style={{ flex: 1 }} />
        <Text variant="caption" tone="muted" style={{ fontSize: 11 }}>
          Not a real prescription. Generated for the MediFly academic demo.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#EEF4F8', borderWidth: 1, borderColor: colors.border },
  mapLabel: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  simTag: { position: 'absolute', left: space[3], top: space[3], flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  courierIcon: { position: 'absolute', width: 22, height: 22, marginLeft: -11, marginTop: -11, alignItems: 'center', justifyContent: 'center' },
  hero: { width: '100%', aspectRatio: 520 / 420, maxWidth: 560 },
  rx: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFEFB', overflow: 'hidden' },
  rxHead: { backgroundColor: colors.navySoft, paddingHorizontal: space[3], paddingVertical: 6 },
});
