import React from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ArrowRight, ArrowUpRight, Bell, FileText, Heart, MapPin, Plus, ScanLine, SlidersHorizontal, Search } from '@/components/ui/icons';
import { colors, fonts, radius, shadow, space } from '@/theme';
import type { Product } from '@/types';
import type { ProductSummary } from '@/services/productService';
import { favoriteService } from '@/services/favoriteService';
import { useCurrentUser, useDb } from '@/hooks/useDb';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/services/api';
import { formatGHS, formatKm } from '@/utils/format';
import { Avatar, Badge, Button, Text } from '@/components/ui';
import { ProductVisual } from '@/components/illustrations';
import { useNotifications } from '@/components/layout/NotificationPanel';

/* ------------------------------------------------------------------ favourites */

export function useFavorites() {
  const db = useDb();
  const user = useCurrentUser();
  const toast = useToast();
  const ids = (user && db.favorites?.[user.id]) || [];
  const toggle = async (p: Product) => {
    try {
      const saved = await favoriteService.toggle(p.id);
      toast.show({ tone: saved ? 'success' : 'info', title: saved ? `${p.name} saved to favourites` : `${p.name} removed from favourites` });
    } catch (e) {
      toast.show({ tone: 'danger', title: 'Could not update favourites', message: getErrorMessage(e) });
    }
  };
  return { ids, isFavorite: (id: string) => ids.includes(id), toggle };
}

export function FavoriteButton({ product, size = 36, tint = 'light' }: { product: Product; size?: number; tint?: 'light' | 'glass' }) {
  const { isFavorite, toggle } = useFavorites();
  const on = isFavorite(product.id);
  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation?.();
        toggle(product);
      }}
      accessibilityRole="button"
      accessibilityLabel={on ? `Remove ${product.name} from favourites` : `Save ${product.name} to favourites`}
      accessibilityState={{ selected: on }}
      hitSlop={6}
      style={[styles.fav, { width: size, height: size, borderRadius: size / 2 }, tint === 'glass' && styles.favGlass]}
    >
      <Heart size={size * 0.48} color={on ? colors.danger : tint === 'glass' ? '#fff' : colors.textSecondary} fill={on ? colors.danger : 'transparent'} />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ header */

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function GreetingHeader({ location, showBell = true, onLocationPress }: { location?: string; showBell?: boolean; onLocationPress?: () => void }) {
  const user = useCurrentUser();
  const { unread } = useNotifications();
  if (!user) return null;
  return (
    <View style={styles.greet}>
      <Pressable onPress={() => router.push('/customer/profile')} accessibilityRole="button" accessibilityLabel="Open profile">
        <Avatar name={user.name} size={48} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="caption" tone="secondary">
          {greeting()}
        </Text>
        <Text variant="h3" numberOfLines={1}>
          {user.name}
        </Text>
        {location ? (
          <Pressable onPress={onLocationPress ?? (() => router.push('/customer/addresses'))} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} accessibilityRole="link" accessibilityLabel={`Delivering to ${location}. Change address`}>
            <MapPin size={13} color={colors.teal} />
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {location}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {showBell ? (
        <Pressable onPress={() => router.push('/customer/notifications')} style={styles.bell} accessibilityRole="button" accessibilityLabel={`Notifications${unread ? `, ${unread} unread` : ''}`}>
          <Bell size={20} color={colors.navy} />
          {unread ? <View style={styles.bellDot} /> : null}
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ search pill */

export function SearchPill({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.searchRow}>
      <Pressable onPress={onPress} style={styles.searchPill} accessibilityRole="search" accessibilityLabel="Search medicine">
        <Search size={19} color={colors.textMuted} />
        <Text variant="body" tone="muted">
          Search medicine or health products
        </Text>
      </Pressable>
      <Pressable onPress={onPress} style={styles.filterBtn} accessibilityRole="button" accessibilityLabel="Search with filters">
        <SlidersHorizontal size={20} color="#fff" />
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------------ category pills */

export function CategoryPills<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2], paddingVertical: 4 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="tab" accessibilityState={{ selected: active }} style={[styles.pill, active && styles.pillActive]}>
            <Text variant="label" style={{ color: active ? '#fff' : colors.textSecondary }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ banners */

function GradientFill({ from, to, id }: { from: string; to: string; id: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect width="100" height="100" fill={`url(#${id})`} />
      <Circle cx="92" cy="12" r="26" fill="#fff" opacity={0.1} />
      <Circle cx="8" cy="98" r="20" fill="#fff" opacity={0.08} />
    </Svg>
  );
}

export function PromoBanner({ variant, style }: { variant: 'shop' | 'scan'; style?: StyleProp<ViewStyle> }) {
  const shop = variant === 'shop';
  return (
    <View style={[styles.banner, style]}>
      <GradientFill id={`banner-${variant}`} from={shop ? '#D4E8F5' : '#D2F0EC'} to={shop ? '#EAF4FA' : '#EEF8F6'} />
      <View style={{ flex: 1, gap: space[2], zIndex: 1 }}>
        <Text variant="h2" style={{ maxWidth: 220 }}>
          {shop ? 'Find your perfect medicine' : 'Have a prescription?'}
        </Text>
        <Text variant="caption" tone="secondary" style={{ maxWidth: 230 }}>
          {shop ? 'Confirmed stock from participating pharmacies near you.' : 'Scan it with your camera for pharmacist review.'}
        </Text>
        <Button
          label={shop ? 'Shop now' : 'Scan prescription'}
          icon={shop ? undefined : ScanLine}
          size="sm"
          variant={shop ? 'primary' : 'teal'}
          onPress={() => router.push(shop ? '/customer/search' : '/customer/scan')}
          style={{ alignSelf: 'flex-start', borderRadius: radius.pill, marginTop: space[1] }}
        />
      </View>
      <View style={{ zIndex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {shop ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <ProductVisual visual="bottle" size={64} style={{ transform: [{ rotate: '-8deg' }] }} />
            <ProductVisual visual="kit" size={78} style={{ marginLeft: -12, zIndex: 1 }} />
            <ProductVisual visual="capsule" size={58} style={{ marginLeft: -12, transform: [{ rotate: '10deg' }] }} />
          </View>
        ) : (
          <View style={styles.scanIcon}>
            <FileText size={34} color={colors.tealDark} />
          </View>
        )}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ pharmacy chips */

export function PharmacyChip({ id, name, distanceKm, open }: { id: string; name: string; distanceKm: number; open: boolean }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
  return (
    <Pressable onPress={() => router.push(`/customer/search?pharmacy=${id}` as never)} style={styles.phChip} accessibilityRole="link" accessibilityLabel={`Browse ${name}`}>
      <View style={styles.phLogo}>
        <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 12 }}>{initials}</Text>
      </View>
      <View>
        <Text variant="label" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" tone={open ? 'success' : 'muted'} style={{ fontSize: 11 }}>
          {open ? 'Open' : 'Closed'} · {formatKm(distanceKm)}
        </Text>
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ featured card (large, tinted) */

const featuredTints: [string, string][] = [
  ['#3E8CC4', '#1E5F8F'],
  ['#2BB3A5', '#178A7E'],
  ['#4E6F9A', '#153B56'],
  ['#5AA9C9', '#2878B8'],
];

export function FeaturedCard({ summary, index, onAdd }: { summary: ProductSummary; index: number; onAdd: () => void }) {
  const { product, minPrice, inStock } = summary;
  const [from, to] = featuredTints[index % featuredTints.length];
  return (
    <Pressable onPress={() => router.push(`/customer/product/${product.id}` as never)} style={styles.featured} accessibilityRole="link" accessibilityLabel={`${product.name}, ${minPrice != null ? formatGHS(minPrice) : 'unavailable'}`}>
      <GradientFill id={`feat-${product.id}`} from={from} to={to} />
      <View style={{ flexDirection: 'row', gap: space[2], zIndex: 1 }}>
        <View style={{ flex: 1 }}>
          <Text variant="h3" style={{ color: '#fff' }} numberOfLines={2}>
            {product.name} {product.strength ?? ''}
          </Text>
          <Text variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {product.packSize}
          </Text>
          <Text variant="h3" style={{ color: '#fff', marginTop: space[2] }} tabular>
            {minPrice != null ? formatGHS(minPrice) : '—'}
          </Text>
        </View>
        <View style={styles.glassBtn}>
          <ArrowUpRight size={18} color="#fff" />
        </View>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <View style={styles.featuredHalo} />
        <ProductVisual visual={product.visual} size={130} style={{ backgroundColor: 'rgba(255,255,255,0.92)', transform: [{ rotate: '-8deg' }] }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
        {product.requiresPrescription ? <Badge label="Rx · pharmacist review" tone="violet" size="sm" /> : <Badge label={inStock ? 'In stock' : 'Unavailable'} tone={inStock ? 'success' : 'neutral'} size="sm" />}
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onAdd();
          }}
          disabled={!inStock}
          style={[styles.addCircle, !inStock && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel={`Add ${product.name} to cart`}
        >
          <Plus size={18} color={colors.navy} />
        </Pressable>
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ popular grid card */

export function PopularCard({ summary, onAdd, adding }: { summary: ProductSummary; onAdd: () => void; adding?: boolean }) {
  const { product, minPrice, inStock } = summary;
  return (
    <Pressable onPress={() => router.push(`/customer/product/${product.id}` as never)} style={styles.popular} accessibilityRole="link" accessibilityLabel={product.name}>
      <View style={styles.popularVisual}>
        <ProductVisual visual={product.visual} size={92} style={{ backgroundColor: 'transparent' }} />
        <View style={{ position: 'absolute', top: space[2], right: space[2] }}>
          <FavoriteButton product={product} size={32} />
        </View>
        {product.requiresPrescription ? (
          <View style={{ position: 'absolute', top: space[2], left: space[2] }}>
            <Badge label="Rx" tone="violet" size="sm" />
          </View>
        ) : null}
      </View>
      <View style={{ padding: space[3], gap: 2, flex: 1 }}>
        <Text variant="label" numberOfLines={2}>
          {product.name} {product.strength ?? ''}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {product.packSize}
        </Text>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space[2] }}>
          <Text variant="title" tabular>
            {minPrice != null ? formatGHS(minPrice) : '—'}
          </Text>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onAdd();
            }}
            disabled={!inStock || adding}
            style={[styles.addSmall, (!inStock || adding) && { opacity: 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel={`Add ${product.name} to cart`}
          >
            <Plus size={16} color="#fff" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export function SectionHead({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space[3] }}>
      <Text variant="h3" style={{ flex: 1 }}>
        {title}
      </Text>
      {actionLabel ? (
        <Pressable onPress={onAction} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text variant="label" tone="primary">
            {actionLabel}
          </Text>
          <ArrowRight size={14} color={colors.blue} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fav: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, ...shadow.sm },
  favGlass: { backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  greet: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  bell: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  bellDot: { position: 'absolute', top: 12, right: 13, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger, borderWidth: 2, borderColor: '#fff' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], backgroundColor: colors.surface, borderRadius: radius.pill, padding: 6, paddingLeft: space[4], ...shadow.md },
  searchPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 44 },
  filterBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  pill: { height: 42, paddingHorizontal: space[5], borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  pillActive: { backgroundColor: colors.teal },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space[3], borderRadius: 24, padding: space[5], overflow: 'hidden', minHeight: 160 },
  scanIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  phChip: { flexDirection: 'row', alignItems: 'center', gap: space[2], backgroundColor: colors.surface, borderRadius: radius.pill, paddingVertical: 6, paddingLeft: 6, paddingRight: space[4], ...shadow.sm },
  phLogo: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' },
  featured: { width: 250, height: 330, borderRadius: 28, padding: space[5], overflow: 'hidden', justifyContent: 'space-between' },
  featuredHalo: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.14)' },
  glassBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  addCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  popular: { flex: 1, backgroundColor: colors.surface, borderRadius: 22, overflow: 'hidden', ...shadow.sm },
  popularVisual: { height: 130, margin: 6, borderRadius: 18, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  addSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
});
