import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ChevronLeft, CircleCheck, FileText, Minus, PackageX, Plus, ShieldCheck, ShoppingCart, Snowflake, Truck, Zap } from '@/components/ui/icons';
import { colors, radius, shadow, space } from '@/theme';
import { useCustomer } from '@/hooks/useCustomer';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAddToCart } from '@/hooks/useAddToCart';
import { listingsFor, isListingInStock } from '@/services/productService';
import { isOpenNow } from '@/services/pharmacyService';
import { cartService } from '@/services/cartService';
import { getErrorMessage } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { categoryLabel } from '@/constants/catalog';
import { formatGHS, formatKm } from '@/utils/format';
import { Badge, Button, Callout, EmptyState, Text } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { ProductVisual } from '@/components/illustrations';
import { FavoriteButton } from '@/components/customer/HomeParts';

type Tab = 'description' | 'availability' | 'how';

export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, user, serviceArea } = useCustomer();
  const { isDesktop, isMobile } = useBreakpoint();
  const { add, pending } = useAddToCart();
  const toast = useToast();
  const product = db.products.find((p) => p.id === id);
  const listings = useMemo(() => (product ? listingsFor(db, product.id, serviceArea.id) : []), [db, product, serviceArea.id]);
  const firstInStock = listings.find((l) => isListingInStock(l.inventory));
  const [pharmacyId, setPharmacyId] = useState<string | undefined>(undefined);
  const selected = listings.find((l) => l.inventory.pharmacyId === (pharmacyId ?? firstInStock?.inventory.pharmacyId)) ?? listings[0];
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<Tab>('description');
  const [buying, setBuying] = useState(false);

  if (!product) {
    return (
      <Page>
        <EmptyState icon={PackageX} title="Product not found" message="It may have been removed from the demo catalogue." action={<Button label="Back to search" onPress={() => router.replace('/customer/search')} />} />
      </Page>
    );
  }

  const maxQty = Math.min(10, selected?.inventory.stock ?? 0);
  const canAdd = !!selected && isListingInStock(selected.inventory);
  const total = (selected?.inventory.price ?? 0) * qty;
  const pendingKey = selected ? `${product.id}:${selected.inventory.pharmacyId}` : '';

  const buyNow = async () => {
    if (!selected || !user) return;
    setBuying(true);
    try {
      await cartService.addItem(user.id, product.id, selected.inventory.pharmacyId, qty);
      router.push(`/customer/checkout?pharmacy=${selected.inventory.pharmacyId}` as never);
    } catch (e) {
      toast.show({ tone: 'danger', title: 'Could not start checkout', message: getErrorMessage(e) });
    } finally {
      setBuying(false);
    }
  };

  const hero = (
    <View style={[styles.hero, { height: isDesktop ? 520 : isMobile ? 340 : 420 }]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="pd-hero" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#7FB3DA" />
            <Stop offset="1" stopColor="#2B8FA0" />
          </LinearGradient>
        </Defs>
        <Rect width="100" height="100" fill="url(#pd-hero)" />
        <Circle cx="85" cy="18" r="22" fill="#fff" opacity={0.12} />
        <Circle cx="12" cy="80" r="18" fill="#fff" opacity={0.1} />
        <Circle cx="60" cy="92" r="8" fill="#fff" opacity={0.14} />
      </Svg>
      <View style={styles.heroTop}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/customer/search'))} style={styles.glass} accessibilityRole="button" accessibilityLabel="Go back">
          <ChevronLeft size={20} color="#fff" />
        </Pressable>
        <Text variant="title" style={{ color: '#fff' }}>
          Details
        </Text>
        <FavoriteButton product={product} size={44} tint="glass" />
      </View>
      <View style={styles.heroCenter}>
        <View style={styles.halo} />
        <ProductVisual visual={product.visual} size={isMobile ? 170 : 220} style={{ backgroundColor: 'rgba(255,255,255,0.94)', transform: [{ rotate: '-10deg' }], ...shadow.lg }} />
        {/* Floating spec chips */}
        {product.strength ? (
          <View style={[styles.specChip, { left: isMobile ? space[4] : space[8], top: '18%' }]}>
            <Zap size={14} color={colors.teal} />
            <View>
              <Text variant="label">{product.strength}</Text>
              <Text variant="caption" tone="muted" style={{ fontSize: 11 }}>
                Strength
              </Text>
            </View>
          </View>
        ) : null}
        <View style={[styles.specChip, { right: isMobile ? space[4] : space[8], bottom: '22%' }]}>
          <FileText size={14} color={colors.blue} />
          <View>
            <Text variant="label">{product.packSize}</Text>
            <Text variant="caption" tone="muted" style={{ fontSize: 11 }}>
              {product.dosageForm}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const sheet = (
    <View style={[styles.sheet, !isDesktop && { marginTop: -36 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space[3] }}>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text variant="h1" style={isMobile ? { fontSize: 26, lineHeight: 32 } : undefined}>
            {product.name}
            {product.strength ? ` ${product.strength}` : ''}
          </Text>
          <Text variant="bodySm" tone="secondary">
            {categoryLabel(product.category)} · {product.dosageForm}
          </Text>
        </View>
        <View style={styles.stepper} accessibilityLabel={`Quantity ${qty}`}>
          <Pressable onPress={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1} style={styles.stepBtn} accessibilityRole="button" accessibilityLabel="Decrease quantity">
            <Minus size={16} color={qty <= 1 ? colors.textMuted : colors.navy} />
          </Pressable>
          <Text variant="h3" tabular style={{ minWidth: 26, textAlign: 'center' }}>
            {qty}
          </Text>
          <Pressable onPress={() => setQty(Math.min(maxQty, qty + 1))} disabled={qty >= maxQty} style={styles.stepBtn} accessibilityRole="button" accessibilityLabel="Increase quantity">
            <Plus size={16} color={qty >= maxQty ? colors.textMuted : colors.navy} />
          </Pressable>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
        {product.requiresPrescription ? <Badge label="Prescription required" tone="violet" icon={FileText} /> : <Badge label="Over the counter" tone="success" />}
        {product.handling === 'cold-chain' ? <Badge label="Cold-chain handling" tone="info" icon={Snowflake} /> : null}
        {product.handling === 'fragile' ? <Badge label="Fragile" tone="warning" /> : null}
        {selected ? <Badge label={canAdd ? (selected.inventory.stock <= selected.inventory.lowStockThreshold ? `${selected.inventory.stock} left` : 'In stock') : 'Unavailable'} tone={canAdd ? 'success' : 'neutral'} dot /> : null}
      </View>

      <View style={styles.segment} accessibilityRole="tablist">
        {(
          [
            ['description', 'Description'],
            ['availability', isMobile ? 'Stock' : `Pharmacies (${listings.length})`],
            ['how', 'How to use'],
          ] as [Tab, string][]
        ).map(([k, l]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[styles.segBtn, tab === k && styles.segActive]} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
            <Text variant="label" weight={tab === k ? 'semibold' : 'medium'} tone={tab === k ? 'navy' : 'secondary'} numberOfLines={1}>
              {l}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'description' ? (
        <View style={{ gap: space[3] }}>
          <Text variant="body" tone="secondary">
            {product.description}
          </Text>
          {product.requiresPrescription ? (
            <Callout tone="violet" icon={ShieldCheck} title="Pharmacist review required">
              Add it to your cart and attach a prescription at checkout. The pharmacy won’t prepare or dispatch it until a pharmacist approves (simulated review).
            </Callout>
          ) : null}
        </View>
      ) : null}

      {tab === 'availability' ? (
        <View style={{ gap: space[2] }}>
          {listings.length === 0 ? <Text variant="bodySm" tone="secondary">No participating pharmacy lists this product right now.</Text> : null}
          {listings.map((l) => {
            const ph = db.pharmacies.find((p) => p.id === l.inventory.pharmacyId)!;
            const inStock = isListingInStock(l.inventory);
            const sel = selected?.inventory.id === l.inventory.id;
            return (
              <Pressable
                key={l.inventory.id}
                disabled={!inStock}
                onPress={() => {
                  setPharmacyId(l.inventory.pharmacyId);
                  setQty(1);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: sel, disabled: !inStock }}
                style={[styles.listing, sel && styles.listingSel, !inStock && { opacity: 0.5 }]}
              >
                <View style={[styles.radio, sel && { borderColor: colors.blue }]}>{sel ? <View style={styles.radioDot} /> : null}</View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodySm" weight="semibold">
                    {l.pharmacyName}
                  </Text>
                  <Text variant="caption" tone="secondary">
                    {l.distanceKm != null ? formatKm(l.distanceKm) : ''} · {isOpenNow(ph) ? 'Open now' : 'Closed now'} · prep ~{ph.prepMinutes} min
                  </Text>
                </View>
                <Text variant="title" tabular>
                  {inStock ? formatGHS(l.inventory.price) : 'Out'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {tab === 'how' ? (
        <View style={{ gap: space[3] }}>
          {[
            { icon: FileText, text: 'Always follow the directions on the pack label, or those given by your pharmacist or doctor.' },
            { icon: ShieldCheck, text: 'MediFly does not give dosage advice. Ask a pharmacist whether this product is right for you.' },
            { icon: product.handling === 'cold-chain' ? Snowflake : CircleCheck, text: product.handling === 'cold-chain' ? 'Needs refrigerated handling — delivered by vehicle with a cool box. Store as directed on the pack.' : 'Store as directed on the pack, out of reach of children.' },
          ].map((r) => (
            <View key={r.text} style={{ flexDirection: 'row', gap: space[3], alignItems: 'flex-start' }}>
              <r.icon size={18} color={colors.teal} style={{ marginTop: 2 }} />
              <Text variant="bodySm" style={{ flex: 1 }}>
                {r.text}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Truck size={16} color={colors.textMuted} />
        <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
          From {selected?.pharmacyName ?? '—'} · delivery to {serviceArea.name}, method and fee confirmed at checkout
        </Text>
      </View>
    </View>
  );

  const bar = (
    <View style={[styles.bar, isDesktop && styles.barInline]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="caption" tone="secondary">
          Total cost
        </Text>
        <Text variant={isMobile ? 'h3' : 'h2'} tabular numberOfLines={1}>
          {canAdd ? formatGHS(total) : '—'}
        </Text>
      </View>
      <Button label={isMobile ? 'Add' : 'Add to cart'} icon={ShoppingCart} variant="outline" size="lg" disabled={!canAdd} loading={pending === pendingKey} onPress={() => selected && add(product.id, selected.inventory.pharmacyId, product.name, { quantity: qty, requiresPrescription: product.requiresPrescription })} style={styles.pillBtn} />
      <Button label="Buy now" size="lg" variant="teal" disabled={!canAdd} loading={buying} onPress={buyNow} style={[styles.pillBtn, { minWidth: isMobile ? 120 : 160 }]} />
    </View>
  );

  if (isDesktop) {
    return (
      <Page maxWidth={1200}>
        <View style={{ flexDirection: 'row', gap: space[8], alignItems: 'flex-start' }}>
          <View style={{ flex: 1.1 }}>{hero}</View>
          <View style={{ flex: 1, gap: space[4] }}>
            {sheet}
            {bar}
          </View>
        </View>
      </Page>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Page padded>
        <View style={{ marginHorizontal: isMobile ? -space[4] : 0, marginTop: isMobile ? -space[5] : 0 }}>
          {hero}
          <View style={{ paddingHorizontal: isMobile ? space[3] : 0 }}>{sheet}</View>
        </View>
      </Page>
      {bar}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 32, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space[4], zIndex: 2 },
  glass: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  heroCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: space[8] },
  halo: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.16)' },
  specChip: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.95)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, ...shadow.md },
  sheet: { backgroundColor: colors.surface, borderRadius: 28, padding: space[5], gap: space[4], ...shadow.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceSunken, borderRadius: radius.pill, padding: 4 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  segment: { flexDirection: 'row', backgroundColor: colors.surfaceSunken, borderRadius: radius.pill, padding: 4, gap: 4 },
  segBtn: { flex: 1, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, cursor: 'pointer' } as ViewStyle,
  segActive: { backgroundColor: colors.surface, ...shadow.sm },
  listing: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderRadius: 18, borderWidth: 1, borderColor: colors.border, cursor: 'pointer' } as ViewStyle,
  listingSel: { borderColor: colors.blue, backgroundColor: colors.blueTint },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space[2], backgroundColor: colors.surface, paddingHorizontal: space[4], paddingVertical: space[3], borderTopWidth: 1, borderTopColor: colors.border },
  barInline: { borderRadius: 28, borderTopWidth: 0, padding: space[5], ...shadow.md },
  pillBtn: { borderRadius: radius.pill },
});
