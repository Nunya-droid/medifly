import React, { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { ChevronRight, ChevronsRight } from '@/components/ui/icons';
import { colors, radius, shadow, space } from '@/theme';
import { useCurrentUser } from '@/hooks/useDb';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { onboarding } from '@/utils/onboarding';
import { ROLE_HOME } from '@/constants/catalog';
import { Text } from '@/components/ui';
import { LogoMark } from '@/components/illustrations';

function Capsule({ x, y, rot, scale = 1, tone = 'blue' }: { x: number; y: number; rot: number; scale?: number; tone?: 'blue' | 'teal' | 'white' }) {
  const fills = { blue: ['#5AA9E0', '#2878B8'], teal: ['#5FD1C4', '#20A89A'], white: ['#FFFFFF', '#E3EAF0'] }[tone];
  return (
    <G transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      <Rect x={-46} y={-18} width={92} height={36} rx={18} fill={`url(#cap-${tone})`} />
      <Path d="M0 -18 H28 A18 18 0 0 1 28 18 H0 Z" fill={tone === 'white' ? '#F1F5F9' : '#FFFFFF'} opacity={tone === 'white' ? 1 : 0.92} />
      <Rect x={-38} y={-12} width={30} height={6} rx={3} fill="#fff" opacity={0.45} />
      <Defs>
        <LinearGradient id={`cap-${tone}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={fills[0]} />
          <Stop offset="1" stopColor={fills[1]} />
        </LinearGradient>
      </Defs>
    </G>
  );
}

function CapsuleHero({ slide }: { slide: number }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 360 300" accessibilityLabel="Illustration of medicine capsules">
      <Circle cx={180} cy={150} r={118} fill="#fff" opacity={0.45} />
      <Circle cx={180} cy={150} r={82} fill="#fff" opacity={0.5} />
      {[
        [60, 70, 4],
        [300, 90, 5],
        [90, 240, 3],
        [280, 230, 4],
        [140, 40, 3],
        [240, 270, 3],
        [40, 160, 3],
        [325, 170, 3],
      ].map(([cx, cy, r], i) => (
        <Circle key={i} cx={cx} cy={cy} r={r} fill={i % 2 ? colors.teal : colors.blue} opacity={0.7} />
      ))}
      {slide === 0 ? (
        <>
          <Capsule x={180} y={150} rot={-32} scale={1.9} tone="blue" />
          <Capsule x={80} y={110} rot={20} scale={0.7} tone="white" />
          <Capsule x={285} y={200} rot={-60} scale={0.75} tone="teal" />
          <Capsule x={270} y={70} rot={35} scale={0.55} tone="white" />
          <Capsule x={95} y={225} rot={-15} scale={0.6} tone="blue" />
        </>
      ) : slide === 1 ? (
        <>
          <Rect x={115} y={70} width={130} height={165} rx={16} fill="#fff" />
          <Rect x={115} y={70} width={130} height={34} rx={16} fill={colors.navySoft} />
          {[124, 144, 164, 184].map((y, i) => (
            <Rect key={y} x={135} y={y} width={i % 2 ? 70 : 90} height={8} rx={4} fill={colors.border} />
          ))}
          <Circle cx={232} cy={214} r={30} fill={colors.teal} />
          <Path d="M218 214 l10 10 l18 -20" stroke="#fff" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Capsule x={85} y={215} rot={-25} scale={0.6} tone="blue" />
        </>
      ) : (
        <>
          <Path d="M70 220 C 120 120, 240 120, 290 200" stroke={colors.blue} strokeWidth={4} strokeDasharray="3 12" strokeLinecap="round" fill="none" />
          <Circle cx={70} cy={220} r={22} fill={colors.teal} />
          <Rect x={60} y={209} width={20} height={22} rx={3} fill="#fff" />
          <Path d="M260 200 L290 176 L320 200 V236 H260 Z" fill="#fff" />
          <Rect x={282} y={212} width={16} height={24} rx={2} fill={colors.blue} />
          <Circle cx={180} cy={128} r={34} fill={colors.blue} />
          <Path d="M164 134 h12 l6 -11 h8 l5 11" stroke="#fff" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </Svg>
  );
}

const SLIDES = [
  { title: 'Healthcare at your doorstep', body: 'Search medicines from participating pharmacies near you, with stock confirmed before you pay.' },
  { title: 'Pharmacist review, built in', body: 'Scan or upload a prescription. A pharmacist reviews it before prescription items are prepared.' },
  { title: 'Track every step', body: 'Get updates from pharmacy confirmation to doorstep handover by a verified courier.' },
];

/** Swipe-style "Get Started" pill (tap to continue). */
function GetStarted({ label, onPress }: { label: string; onPress: () => void }) {
  const nudge = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(nudge, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(nudge, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [nudge]);
  return (
    <Pressable onPress={onPress} style={styles.cta} accessibilityRole="button" accessibilityLabel={label}>
      <Animated.View style={[styles.ctaKnob, { transform: [{ translateX: nudge.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }) }] }]}>
        <ChevronRight size={22} color={colors.blue} />
      </Animated.View>
      <Text variant="title" style={{ color: '#fff', flex: 1, textAlign: 'center', marginRight: 40 }}>
        {label}
      </Text>
      <ChevronsRight size={22} color="rgba(255,255,255,0.7)" style={{ position: 'absolute', right: 22 }} />
    </Pressable>
  );
}

export default function Welcome() {
  const user = useCurrentUser();
  const insets = useSafeAreaInsets();
  const { isMobile } = useBreakpoint();
  const [slide, setSlide] = useState(0);
  if (!user) return <Redirect href="/login" />;
  const finish = () => {
    onboarding.markSeen(user.id);
    router.replace(ROLE_HOME[user.role] as never);
  };
  const last = slide === SLIDES.length - 1;
  const s = SLIDES[slide];

  return (
    <View style={[styles.root, { paddingTop: insets.top + space[4], paddingBottom: insets.bottom + space[6] }]}>
      <View style={[styles.card, !isMobile && styles.cardDesktop]}>
        <View style={styles.top}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <LogoMark size={28} />
            <Text variant="title" tone="navy">
              MediFly
            </Text>
          </View>
          <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel="Skip introduction" hitSlop={10}>
            <Text variant="label" tone="secondary">
              Skip
            </Text>
          </Pressable>
        </View>
        <Text variant="display" align="center" style={{ fontSize: isMobile ? 34 : 42, lineHeight: isMobile ? 40 : 50, marginTop: space[4] }}>
          {s.title}
        </Text>
        <View style={{ flex: 1, minHeight: 240, maxHeight: 360, width: '100%' }}>
          <CapsuleHero slide={slide} />
        </View>
        <Text variant="body" tone="secondary" align="center" style={{ maxWidth: 360, alignSelf: 'center' }}>
          {s.body}
        </Text>
        <View style={styles.dots} accessibilityLabel={`Slide ${slide + 1} of ${SLIDES.length}`}>
          {SLIDES.map((_, i) => (
            <Pressable key={i} onPress={() => setSlide(i)} accessibilityLabel={`Go to slide ${i + 1}`} hitSlop={8}>
              <View style={[styles.dot, i === slide && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
        <GetStarted label={last ? 'Get started' : 'Next'} onPress={() => (last ? finish() : setSlide(slide + 1))} />
        <Text variant="caption" tone="muted" align="center">
          Academic demo · fictional data only
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E4F1F8', alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[4] },
  card: { flex: 1, width: '100%', maxWidth: 480, gap: space[4], alignItems: 'stretch' },
  cardDesktop: { flex: 0, minHeight: 720, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 36, padding: space[8], ...shadow.lg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 8, alignSelf: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blueTintStrong },
  dotActive: { width: 26, backgroundColor: colors.blue },
  cta: { height: 64, borderRadius: radius.pill, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, ...shadow.md },
  ctaKnob: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
