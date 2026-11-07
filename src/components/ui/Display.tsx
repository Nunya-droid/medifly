import React, { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Inbox, RotateCcw, type LucideIcon } from '@/components/ui/icons';
import { colors, fonts, radius, shadow, space } from '@/theme';
import type { Tone } from '@/constants/status';
import { initials } from '@/utils/format';
import { Text } from './Text';
import { Button } from './Button';

/* ------------------------------------------------------------------ Card */

export function Card({ children, style, padded = true, onPress, accessibilityLabel }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean; onPress?: () => void; accessibilityLabel?: string }) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={(state) => {
          const { hovered } = state as typeof state & { hovered?: boolean };
          return [styles.card, padded && styles.cardPad, hovered && styles.cardHover, style];
        }}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, padded && styles.cardPad, style]}>{children}</View>;
}

export function CardHeader({ title, subtitle, action, icon: Icon }: { title: string; subtitle?: string; action?: React.ReactNode; icon?: LucideIcon }) {
  return (
    <View style={styles.cardHeader}>
      {Icon ? (
        <View style={styles.cardHeaderIcon}>
          <Icon size={18} color={colors.blue} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="h3">{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

const toneStyles: Record<Tone, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: colors.surfaceSunken, fg: colors.textSecondary, dot: colors.textMuted },
  info: { bg: colors.blueTint, fg: colors.blueHover, dot: colors.blue },
  success: { bg: colors.successTint, fg: colors.success, dot: colors.success },
  warning: { bg: colors.warningTint, fg: colors.warningText, dot: colors.warning },
  danger: { bg: colors.dangerTint, fg: colors.dangerText, dot: colors.danger },
  teal: { bg: colors.tealTint, fg: colors.tealDark, dot: colors.teal },
  violet: { bg: colors.violetTint, fg: colors.violet, dot: colors.violet },
};

export function toneColor(tone: Tone) {
  return toneStyles[tone];
}

export function Badge({ label, tone = 'neutral', icon: Icon, dot, size = 'md' }: { label: string; tone?: Tone; icon?: LucideIcon; dot?: boolean; size?: 'sm' | 'md' }) {
  const t = toneStyles[tone];
  return (
    <View style={[styles.badge, size === 'sm' && styles.badgeSm, { backgroundColor: t.bg }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: t.dot }]} /> : null}
      {Icon ? <Icon size={size === 'sm' ? 12 : 13} color={t.fg} /> : null}
      <Text style={[styles.badgeText, size === 'sm' && { fontSize: 11 }, { color: t.fg, flexShrink: 1 }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function StatusBadge({ meta, size }: { meta: { label: string; tone: Tone }; size?: 'sm' | 'md' }) {
  return <Badge label={meta.label} tone={meta.tone} dot size={size} />;
}

/* ------------------------------------------------------------------ StatCard */

export function StatCard({ label, value, icon: Icon, tone = 'info', hint, onPress, style }: { label: string; value: string | number; icon?: LucideIcon; tone?: Tone; hint?: string; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const t = toneStyles[tone];
  return (
    <Card onPress={onPress} style={[styles.stat, style]} accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.statTop}>
        <Text variant="label" tone="secondary" style={{ flex: 1 }} numberOfLines={2}>
          {label}
        </Text>
        {Icon ? (
          <View style={[styles.statIcon, { backgroundColor: t.bg }]}>
            <Icon size={17} color={t.fg} />
          </View>
        ) : null}
      </View>
      <Text variant="metric" tabular numberOfLines={1}>
        {value}
      </Text>
      {hint ? (
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ Avatar */

const avatarColors = ['#2878B8', '#20A89A', '#6D5BD0', '#153B56', '#C77A12', '#B83A44'];
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const idx = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % avatarColors.length;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColors[idx], alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={name}>
      <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: size * 0.38, lineHeight: size * 0.5 }}>{initials(name)}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ States */

export function EmptyState({ icon: Icon = Inbox, title, message, action, compact }: { icon?: LucideIcon; title: string; message?: string; action?: React.ReactNode; compact?: boolean }) {
  return (
    <View style={[styles.empty, compact && { paddingVertical: space[6] }]}>
      <View style={styles.emptyIcon}>
        <Icon size={24} color={colors.blue} />
      </View>
      <Text variant="title" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="bodySm" tone="secondary" align="center" style={{ maxWidth: 380 }}>
          {message}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: space[2] }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.dangerTint }]}>
        <AlertTriangle size={24} color={colors.danger} />
      </View>
      <Text variant="title" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="bodySm" tone="secondary" align="center" style={{ maxWidth: 400 }}>
          {message}
        </Text>
      ) : null}
      {onRetry ? <Button label="Try again" icon={RotateCcw} variant="outline" onPress={onRetry} /> : null}
    </View>
  );
}

export function Skeleton({ width = '100%', height = 14, radius: r = 6, style }: { width?: ViewStyle['width']; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const pulse = useState(() => new Animated.Value(0.5))[0];
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: colors.border, opacity: pulse }, style]} />;
}

export function LoadingState({ rows = 3, card = true }: { rows?: number; card?: boolean }) {
  const content = (
    <View style={{ gap: space[4] }} accessibilityLabel="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
          <Skeleton width={44} height={44} radius={10} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="55%" />
            <Skeleton width="35%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
  return card ? <Card>{content}</Card> : content;
}

/* ------------------------------------------------------------------ Tabs */

export function Tabs<T extends string>({ tabs, value, onChange, style }: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; style?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabsScroll, style]} contentContainerStyle={styles.tabs}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <Pressable
            key={t.value}
            onPress={() => onChange(t.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={(state) => {
              const { hovered } = state as typeof state & { hovered?: boolean };
              return [styles.tab, active && styles.tabActive, hovered && !active && { backgroundColor: colors.surfaceSunken }];
            }}
          >
            <Text variant="label" weight={active ? 'semibold' : 'medium'} tone={active ? 'navy' : 'secondary'}>
              {t.label}
            </Text>
            {t.count != null ? (
              <View style={[styles.tabCount, active && { backgroundColor: colors.navy }]}>
                <Text style={[styles.tabCountText, active && { color: '#fff' }]}>{t.count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Pill-style segmented filter chips. */
export function Chips<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2], paddingVertical: 2 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.chip, active && styles.chipActive]}>
            <Text variant="label" tone={active ? 'inverse' : 'default'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ Pagination */

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  // Clamp during render instead of syncing state in an effect.
  const safe = Math.min(page, pages);
  return { page: safe, pages, setPage, slice: items.slice((safe - 1) * pageSize, safe * pageSize), total: items.length, pageSize };
}

export function Pagination({ page, pages, total, pageSize, onChange }: { page: number; pages: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <View style={styles.pagination}>
      <Text variant="caption" tone="secondary">
        {from}–{to} of {total}
      </Text>
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        <Button label="Previous" icon={ChevronLeft} variant="outline" size="sm" disabled={page <= 1} onPress={() => onChange(page - 1)} />
        <Button label="Next" iconRight={ChevronRight} variant="outline" size="sm" disabled={page >= pages} onPress={() => onChange(page + 1)} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ Page header */

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <View style={styles.crumbs} accessibilityRole="navigation" accessibilityLabel="Breadcrumb">
      {items.map((c, i) => (
        <View key={c.label + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {c.href ? (
            <Pressable onPress={() => router.push(c.href as never)} accessibilityRole="link">
              <Text variant="caption" tone="primary">
                {c.label}
              </Text>
            </Pressable>
          ) : (
            <Text variant="caption" tone="secondary">
              {c.label}
            </Text>
          )}
          {i < items.length - 1 ? <ChevronRight size={12} color={colors.textMuted} /> : null}
        </View>
      ))}
    </View>
  );
}

export function PageHeader({ title, subtitle, actions, breadcrumbs, backHref }: { title: string; subtitle?: string; actions?: React.ReactNode; breadcrumbs?: { label: string; href?: string }[]; backHref?: string }) {
  return (
    <View style={styles.pageHeader}>
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
      <View style={styles.pageHeaderRow}>
        {backHref ? (
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace(backHref as never))} accessibilityLabel="Go back" style={styles.back}>
            <ChevronLeft size={20} color={colors.navy} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1, minWidth: 220, gap: 4 }}>
          <Text variant="h1" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" tone="secondary">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {actions ? <View style={styles.headerActions}>{actions}</View> : null}
      </View>
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text variant="h3" style={{ flex: 1 }}>
        {title}
      </Text>
      {action}
    </View>
  );
}

/* ------------------------------------------------------------------ Key/value */

export function KeyValue({ label, value, strong, children }: { label: string; value?: React.ReactNode; strong?: boolean; children?: React.ReactNode }) {
  return (
    <View style={styles.kv}>
      <Text variant="bodySm" tone="secondary" style={{ flexShrink: 0 }}>
        {label}
      </Text>
      {children ?? (
        <Text variant="bodySm" weight={strong ? 'bold' : 'medium'} align="right" style={{ flex: 1 }}>
          {value}
        </Text>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ Timeline */

export interface TimelineItem {
  title: string;
  description?: string;
  time?: string;
  state: 'done' | 'current' | 'upcoming' | 'error';
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <View>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        const color = it.state === 'done' ? colors.teal : it.state === 'current' ? colors.blue : it.state === 'error' ? colors.danger : colors.borderStrong;
        return (
          <View key={it.title + i} style={styles.tlRow}>
            <View style={styles.tlRail}>
              <View style={[styles.tlDot, { borderColor: color, backgroundColor: it.state === 'upcoming' ? colors.surface : color }]}>
                {it.state === 'done' ? <Check size={11} color="#fff" strokeWidth={3} /> : null}
                {it.state === 'current' ? <View style={styles.tlPulse} /> : null}
              </View>
              {!last ? <View style={[styles.tlLine, { backgroundColor: it.state === 'done' ? colors.teal : colors.border }]} /> : null}
            </View>
            <View style={[styles.tlBody, last && { paddingBottom: 0 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[2], flexWrap: 'wrap' }}>
                <Text variant="bodySm" weight={it.state === 'upcoming' ? 'regular' : 'semibold'} tone={it.state === 'upcoming' ? 'muted' : it.state === 'error' ? 'danger' : 'default'}>
                  {it.title}
                </Text>
                {it.time ? (
                  <Text variant="caption" tone="muted">
                    {it.time}
                  </Text>
                ) : null}
              </View>
              {it.description ? (
                <Text variant="caption" tone="secondary">
                  {it.description}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ Toggles */

export function Switch({ value, onChange, label, description, disabled }: { value: boolean; onChange: (v: boolean) => void; label?: string; description?: string; disabled?: boolean }) {
  return (
    <Pressable onPress={() => !disabled && onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value, disabled }} accessibilityLabel={label} style={[styles.switchRow, disabled && { opacity: 0.5 }]}>
      {label ? (
        <View style={{ flex: 1 }}>
          <Text variant="bodySm" weight="medium">
            {label}
          </Text>
          {description ? (
            <Text variant="caption" tone="secondary">
              {description}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={[styles.switchTrack, value && { backgroundColor: colors.teal }]}>
        <View style={[styles.switchThumb, value && { transform: [{ translateX: 18 }] }]} />
      </View>
    </Pressable>
  );
}

export function Checkbox({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <Pressable onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }} style={styles.checkRow}>
      <View style={[styles.checkBox, checked && { backgroundColor: colors.blue, borderColor: colors.blue }]}>{checked ? <Check size={13} color="#fff" strokeWidth={3} /> : null}</View>
      <View style={{ flex: 1 }}>
        <Text variant="bodySm" weight="medium">
          {label}
        </Text>
        {description ? (
          <Text variant="caption" tone="secondary">
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Selectable option card (radio semantics). */
export function OptionCard({ selected, onPress, title, description, icon: Icon, right, disabled, badge }: { selected: boolean; onPress: () => void; title: string; description?: string; icon?: LucideIcon; right?: React.ReactNode; disabled?: boolean; badge?: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      style={(state) => {
        const { hovered } = state as typeof state & { hovered?: boolean };
        return [styles.option, hovered && !disabled && { borderColor: colors.blue }, selected && styles.optionSelected, disabled && { opacity: 0.55 }];
      }}
    >
      <View style={[styles.radio, selected && { borderColor: colors.blue }]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      {Icon ? (
        <View style={[styles.optionIcon, selected && { backgroundColor: colors.blue }]}>
          <Icon size={18} color={selected ? '#fff' : colors.navy} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' }}>
          <Text variant="title">{title}</Text>
          {badge}
        </View>
        {description ? (
          <Text variant="caption" tone="secondary">
            {description}
          </Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

/** Informational callout. */
export function Callout({ tone = 'info', title, children, icon: Icon }: { tone?: Tone; title?: string; children?: React.ReactNode; icon?: LucideIcon }) {
  const t = toneStyles[tone];
  return (
    <View style={[styles.callout, { backgroundColor: t.bg, borderColor: t.dot + '40' }]}>
      {Icon ? <Icon size={18} color={t.fg} style={{ marginTop: 1 }} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        {title ? (
          <Text variant="bodySm" weight="semibold" style={{ color: t.fg }}>
            {title}
          </Text>
        ) : null}
        {typeof children === 'string' ? (
          <Text variant="bodySm" style={{ color: colors.text }}>
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadow.sm },
  cardPad: { padding: space[5] },
  cardHover: { borderColor: colors.blueTintStrong, ...shadow.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: space[4] },
  cardHeaderIcon: { width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', maxWidth: '100%', gap: 5, paddingHorizontal: 9, height: 24, borderRadius: radius.pill },
  badgeSm: { height: 20, paddingHorizontal: 7 },
  badgeText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  stat: { flex: 1, minWidth: 150, gap: space[2], padding: space[4] },
  statTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  statIcon: { width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: space[12], paddingHorizontal: space[4], gap: space[2] },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center', marginBottom: space[2] },
  tabsScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabs: { gap: 2, paddingBottom: 0 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: space[3], borderBottomWidth: 2, borderBottomColor: 'transparent', borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm, cursor: 'pointer' } as ViewStyle,
  tabActive: { borderBottomColor: colors.navy },
  tabCount: { minWidth: 20, height: 18, paddingHorizontal: 6, borderRadius: 9, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  tabCountText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, color: colors.textSecondary },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } as ViewStyle,
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3], paddingTop: space[3], flexWrap: 'wrap' },
  crumbs: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: space[2] },
  pageHeader: { marginBottom: space[6] },
  pageHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], flexWrap: 'wrap' },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], alignItems: 'center' },
  back: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: -2 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: space[3] },
  kv: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space[4], paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  tlRow: { flexDirection: 'row', gap: space[3] },
  tlRail: { alignItems: 'center', width: 20 },
  tlDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tlPulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  tlLine: { width: 2, flex: 1, minHeight: 18, marginVertical: 2 },
  tlBody: { flex: 1, paddingBottom: space[4], gap: 2, marginTop: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 44, cursor: 'pointer' } as ViewStyle,
  switchTrack: { width: 42, height: 24, borderRadius: 12, backgroundColor: colors.borderStrong, padding: 3 },
  switchThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', ...shadow.sm },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], minHeight: 36, cursor: 'pointer' } as ViewStyle,
  checkBox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', marginTop: 1, backgroundColor: colors.surface },
  option: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, cursor: 'pointer' } as ViewStyle,
  optionSelected: { borderColor: colors.blue, backgroundColor: colors.blueTint },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue },
  optionIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  callout: { flexDirection: 'row', gap: space[3], padding: space[4], borderRadius: radius.lg, borderWidth: 1 },
});
