import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, Bike, Car, Clock, Drone, Heart, MapPin, Plus, RotateCcw } from '@/components/ui/icons';
import { colors, radius, shadow, space } from '@/theme';
import { useCustomer } from '@/hooks/useCustomer';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAddToCart } from '@/hooks/useAddToCart';
import { useAction } from '@/hooks/useAction';
import { searchProductsSync, type ProductSummary } from '@/services/productService';
import { nearbyPharmacies } from '@/services/pharmacyService';
import { orderService } from '@/services/orderService';
import { userService } from '@/services/userService';
import { ACTIVE_ORDER_STATUSES } from '@/constants/status';
import { CATEGORIES, DELIVERY_METHOD_LABEL } from '@/constants/catalog';
import { formatEta, formatGHS } from '@/utils/format';
import type { ProductCategory } from '@/types';
import { Badge, Button, Card, EmptyState, Modal, OptionCard, Text } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { OrderStatusBadge } from '@/components/shared/OrderParts';
import { AddressForm } from '@/components/shared/AddressForm';
import { CategoryPills, FeaturedCard, GreetingHeader, PharmacyChip, PopularCard, PromoBanner, SearchPill, SectionHead, useFavorites } from '@/components/customer/HomeParts';

const FEATURED_IDS = ['prd-vitamin-c', 'prd-first-aid-kit', 'prd-thermometer', 'prd-multivitamin', 'prd-cough-syrup', 'prd-bp-monitor'];
const POPULAR_IDS = ['prd-paracetamol', 'prd-ors', 'prd-ibuprofen', 'prd-sanitiser', 'prd-zinc', 'prd-antacid', 'prd-bandages', 'prd-masks', 'prd-saline-spray', 'prd-glucose-strips'];

export default function CustomerHome() {
  const { db, user, addresses, selected, setSelectedId, serviceArea } = useCustomer();
  const { isMobile, isDesktop, width } = useBreakpoint();
  const { add, pending } = useAddToCart();
  const { run } = useAction();
  const { ids: favIds } = useFavorites();
  const [category, setCategory] = useState<'all' | ProductCategory>('all');
  const [addressOpen, setAddressOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const all = useMemo(() => searchProductsSync(db, { serviceAreaId: serviceArea.id }), [db, serviceArea.id]);
  const byId = (id: string) => all.find((s) => s.product.id === id);
  const inCategory = (s: ProductSummary) => category === 'all' || s.product.category === category;
  const featured = (category === 'all' ? FEATURED_IDS.map(byId).filter((s): s is ProductSummary => !!s) : all.filter(inCategory)).slice(0, 8);
  const popular = (category === 'all' ? POPULAR_IDS.map(byId).filter((s): s is ProductSummary => !!s) : all.filter(inCategory)).slice(0, isDesktop ? 10 : 6);
  const favourites = favIds.map(byId).filter((s): s is ProductSummary => !!s);
  const pharmacies = useMemo(() => nearbyPharmacies(db, serviceArea.id).slice(0, 6), [db, serviceArea.id]);
  const myOrders = db.orders.filter((o) => o.customerId === user?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const active = myOrders.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status));
  const lastDelivered = myOrders.find((o) => o.status === 'delivered');
  const categoryOptions = [{ value: 'all' as const, label: 'All' }, ...CATEGORIES.filter((c) => all.some((s) => s.product.category === c.id)).map((c) => ({ value: c.id, label: c.label }))];
  const cols = isMobile ? 2 : isDesktop ? 5 : 3;
  const addSummary = (s: ProductSummary) => s.best && add(s.product.id, s.best.inventory.pharmacyId, s.product.name, { requiresPrescription: s.product.requiresPrescription });

  return (
    <Page>
      <View style={{ gap: space[6] }}>
        <GreetingHeader location={selected ? `${selected.label} · ${serviceArea.name}` : 'Add a delivery address'} onLocationPress={() => setAddressOpen(true)} showBell={false} />

        <View style={{ gap: space[5] }}>
          <Text variant="display" style={isMobile ? { fontSize: 32, lineHeight: 40 } : { fontSize: width < 1200 ? 42 : 48, lineHeight: width < 1200 ? 50 : 56 }}>
            Your trusted{'\n'}
            <Text variant="display" style={[{ color: colors.teal }, isMobile ? { fontSize: 32, lineHeight: 40 } : { fontSize: width < 1200 ? 42 : 48, lineHeight: width < 1200 ? 50 : 56 }]}>
              online pharmacy
            </Text>
          </Text>
          <View style={{ maxWidth: 720 }}>
            <SearchPill onPress={() => router.push('/customer/search')} />
          </View>
          <CategoryPills options={categoryOptions} value={category} onChange={setCategory} />
        </View>

        {/* Active order strip */}
        {active.length ? (
          <Pressable onPress={() => router.push(`/customer/orders/${active[0].id}` as never)} style={styles.activeStrip} accessibilityRole="link" accessibilityLabel={`Track order ${active[0].reference}`}>
            <View style={styles.activeIcon}>
              <Clock size={20} color="#fff" />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text variant="caption" style={{ color: 'rgba(255,255,255,0.75)' }} numberOfLines={1}>
                {active[0].reference}
                {active.length > 1 ? ` · +${active.length - 1} more` : ''}
              </Text>
              <Text variant="title" style={{ color: '#fff' }} numberOfLines={1}>
                {active[0].items.map((i) => i.name).join(', ')}
              </Text>
              {isMobile ? (
                <View style={{ marginTop: 4 }}>
                  <OrderStatusBadge order={active[0]} size="sm" />
                </View>
              ) : (
                <Text variant="caption" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  ETA {formatEta(active[0].etaMinutes)} (simulated)
                </Text>
              )}
            </View>
            {!isMobile ? <OrderStatusBadge order={active[0]} size="sm" /> : null}
            <ArrowRight size={18} color="#fff" />
          </Pressable>
        ) : null}

        {/* Promo banners */}
        {category === 'all' ? (
          isMobile ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[3] }} style={{ marginHorizontal: -space[4] }} snapToInterval={width - 40}>
              <View style={{ width: width - 48, marginLeft: space[4] }}>
                <PromoBanner variant="shop" />
              </View>
              <View style={{ width: width - 48, marginRight: space[4] }}>
                <PromoBanner variant="scan" />
              </View>
            </ScrollView>
          ) : (
            <View style={{ flexDirection: 'row', gap: space[4] }}>
              <PromoBanner variant="shop" style={{ flex: 1 }} />
              <PromoBanner variant="scan" style={{ flex: 1 }} />
            </View>
          )
        ) : null}

        {/* Featured carousel */}
        <View>
          <SectionHead title={category === 'all' ? 'Featured for you' : CATEGORIES.find((c) => c.id === category)?.label ?? 'Products'} actionLabel="See all" onAction={() => router.push((category === 'all' ? '/customer/search' : `/customer/search?category=${category}`) as never)} />
          {featured.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[4], paddingVertical: 4, paddingHorizontal: isMobile ? space[4] : 0 }} style={isMobile ? { marginHorizontal: -space[4] } : undefined}>
              {featured.map((s, i) => (
                <FeaturedCard key={s.product.id} summary={s} index={i} onAdd={() => addSummary(s)} />
              ))}
            </ScrollView>
          ) : (
            <Card>
              <EmptyState compact title="Nothing in this category nearby" />
            </Card>
          )}
        </View>

        {/* Nearby pharmacies */}
        <View>
          <SectionHead title={`Pharmacies near ${serviceArea.name}`} actionLabel="Browse" onAction={() => router.push('/customer/search')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2], paddingVertical: 4, paddingHorizontal: isMobile ? space[4] : 0 }} style={isMobile ? { marginHorizontal: -space[4] } : undefined}>
            {pharmacies.map((p) => (
              <PharmacyChip key={p.pharmacy.id} id={p.pharmacy.id} name={p.pharmacy.name} distanceKm={p.distanceKm} open={p.isOpen} />
            ))}
          </ScrollView>
        </View>

        {/* Popular grid */}
        <View>
          <SectionHead title="Popular products" actionLabel="See more" onAction={() => router.push('/customer/search')} />
          <View style={styles.grid}>
            {popular.map((s) => (
              <View key={s.product.id} style={{ width: `${100 / cols}%`, padding: 6 }}>
                <PopularCard summary={s} adding={pending === `${s.product.id}:${s.best?.inventory.pharmacyId}`} onAdd={() => addSummary(s)} />
              </View>
            ))}
          </View>
        </View>

        {/* Favourites */}
        <View>
          <SectionHead title="Your favourites" actionLabel={favourites.length ? 'View all' : undefined} onAction={() => router.push('/customer/favorites')} />
          {favourites.length ? (
            <View style={styles.grid}>
              {favourites.slice(0, cols).map((s) => (
                <View key={s.product.id} style={{ width: `${100 / cols}%`, padding: 6 }}>
                  <PopularCard summary={s} adding={pending === `${s.product.id}:${s.best?.inventory.pharmacyId}`} onAdd={() => addSummary(s)} />
                </View>
              ))}
            </View>
          ) : (
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
              <Heart size={20} color={colors.danger} />
              <Text variant="bodySm" tone="secondary" style={{ flex: 1 }}>
                Tap the heart on any product to save it here for quick reordering.
              </Text>
            </Card>
          )}
        </View>

        {/* Delivery + reorder */}
        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: space[4] }}>
          <View style={[styles.softCard, { flex: 1.4 }]}>
            <Text variant="h3">Delivery in {serviceArea.name}</Text>
            <Text variant="caption" tone="secondary">
              Typical {formatEta(serviceArea.etaRange)} · fees from {formatGHS(serviceArea.baseFee)} · final method confirmed at checkout
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[2] }}>
              {(['motorcycle', 'vehicle', 'drone'] as const).map((m) => {
                const Icon = m === 'motorcycle' ? Bike : m === 'vehicle' ? Car : Drone;
                const on = serviceArea.supportedMethods.includes(m);
                return (
                  <View key={m} style={[styles.methodChip, !on && { opacity: 0.5 }]}>
                    <Icon size={16} color={colors.navy} />
                    <Text variant="caption" weight="medium">
                      {DELIVERY_METHOD_LABEL[m]}
                    </Text>
                    <Badge label={on ? (m === 'drone' ? 'Simulated' : 'Available') : 'Not offered'} tone={on ? (m === 'drone' ? 'warning' : 'success') : 'neutral'} size="sm" />
                  </View>
                );
              })}
            </View>
          </View>
          {lastDelivered ? (
            <View style={[styles.softCard, { flex: 1 }]}>
              <Text variant="h3">Order again</Text>
              <Text variant="caption" tone="secondary" numberOfLines={2}>
                {lastDelivered.items.map((i) => i.name).join(', ')} · {lastDelivered.reference}
              </Text>
              <Button
                label="Reorder"
                icon={RotateCcw}
                variant="secondary"
                style={{ alignSelf: 'flex-start', marginTop: space[2], borderRadius: radius.pill }}
                onPress={async () => {
                  const r = await run(() => orderService.reorder(lastDelivered.id), { success: (x) => `${x.added} item(s) added to cart${x.skipped.length ? ` · unavailable: ${x.skipped.join(', ')}` : ''}` });
                  if (r?.added) router.push('/customer/cart');
                }}
              />
            </View>
          ) : null}
        </View>
      </View>

      {/* Address picker */}
      <Modal visible={addressOpen} onClose={() => { setAddressOpen(false); setAdding(false); }} title={adding ? 'Add a delivery address' : 'Deliver to'} subtitle={adding ? undefined : 'Choose where you or a family member should receive orders.'} width={620}>
        {adding ? (
          <AddressForm
            onCancel={() => setAdding(false)}
            onSubmit={async (v) => {
              const saved = await run(() => userService.saveAddress(v), { success: 'Address saved' });
              if (saved) {
                setSelectedId(saved.id);
                setAdding(false);
                setAddressOpen(false);
              }
            }}
          />
        ) : (
          <View style={{ gap: space[2] }}>
            {addresses.map((a) => {
              const area = db.serviceAreas.find((s) => s.id === a.serviceAreaId);
              return (
                <OptionCard
                  key={a.id}
                  selected={selected?.id === a.id}
                  onPress={() => {
                    setSelectedId(a.id);
                    setAddressOpen(false);
                  }}
                  icon={MapPin}
                  title={`${a.label} · ${area?.name}`}
                  description={`${a.recipientName} · ${a.area}`}
                  disabled={!area?.active}
                />
              );
            })}
            <Button label="Add a new address" icon={Plus} variant="outline" onPress={() => setAdding(true)} />
          </View>
        )}
      </Modal>
    </Page>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  activeStrip: { flexDirection: 'row', alignItems: 'center', gap: space[3], backgroundColor: colors.navy, borderRadius: 22, padding: space[4], ...shadow.md },
  activeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  softCard: { backgroundColor: colors.surface, borderRadius: 24, padding: space[5], gap: 4, ...shadow.sm },
  methodChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: space[3], borderRadius: radius.pill, backgroundColor: colors.surfaceSunken },
});
