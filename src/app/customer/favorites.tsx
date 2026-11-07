import React, { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Heart } from '@/components/ui/icons';
import { space } from '@/theme';
import { useCustomer } from '@/hooks/useCustomer';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAddToCart } from '@/hooks/useAddToCart';
import { searchProductsSync, type ProductSummary } from '@/services/productService';
import { Button, Card, EmptyState, PageHeader } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { PopularCard, useFavorites } from '@/components/customer/HomeParts';

export default function Favorites() {
  const { db, serviceArea } = useCustomer();
  const { isMobile, isDesktop } = useBreakpoint();
  const { add, pending } = useAddToCart();
  const { ids } = useFavorites();
  const all = useMemo(() => searchProductsSync(db, { serviceAreaId: serviceArea.id }), [db, serviceArea.id]);
  const list = ids.map((id) => all.find((s) => s.product.id === id)).filter((s): s is ProductSummary => !!s);
  const cols = isMobile ? 2 : isDesktop ? 5 : 3;
  return (
    <Page>
      <PageHeader title="Favourites" subtitle="Products you’ve saved for quick reordering." breadcrumbs={[{ label: 'Profile', href: '/customer/profile' }, { label: 'Favourites' }]} />
      {list.length === 0 ? (
        <Card>
          <EmptyState icon={Heart} title="No favourites yet" message="Tap the heart on any product to save it here." action={<Button label="Browse products" onPress={() => router.push('/customer/search')} />} />
        </Card>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
          {list.map((s) => (
            <View key={s.product.id} style={{ width: `${100 / cols}%`, padding: 6 }}>
              <PopularCard summary={s} adding={pending === `${s.product.id}:${s.best?.inventory.pharmacyId}`} onAdd={() => s.best && add(s.product.id, s.best.inventory.pharmacyId, s.product.name, { requiresPrescription: s.product.requiresPrescription })} />
            </View>
          ))}
        </View>
      )}
      <View style={{ height: space[4] }} />
    </Page>
  );
}
