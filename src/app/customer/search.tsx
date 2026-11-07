import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { FileText, SearchX, SlidersHorizontal } from '@/components/ui/icons';
import { space } from '@/theme';
import { useCustomer } from '@/hooks/useCustomer';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAddToCart } from '@/hooks/useAddToCart';
import { productService, type ProductSearchFilters, type ProductSummary } from '@/services/productService';
import { getCollectionVersion } from '@/services/db';
import { useResource } from '@/hooks/useResource';
import { CATEGORIES, PRODUCT_TYPES } from '@/constants/catalog';
import { Button, Callout, Chips, EmptyState, ErrorState, PageHeader, SearchInput, Select, Skeleton, Card, Text } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { ProductCard } from '@/components/shared/ProductCard';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string; category?: string; pharmacy?: string }>();
  const { db, serviceArea } = useCustomer();
  const { isMobile, isDesktop } = useBreakpoint();
  const { add, pending } = useAddToCart();
  const [query, setQuery] = useState(params.q ?? '');
  const [debounced, setDebounced] = useState(params.q ?? '');
  const [filters, setFilters] = useState<ProductSearchFilters>({
    category: (params.category as ProductSearchFilters['category']) ?? 'all',
    productType: 'all',
    pharmacyId: params.pharmacy ?? 'all',
    availability: 'all',
    prescription: 'all',
    sort: 'relevance',
  });
  const [showFilters, setShowFilters] = useState(!isMobile);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Re-fetch when filters change or when stock/catalogue data changes (e.g. in another tab).
  const key = JSON.stringify({ debounced, filters, area: serviceArea.id, inv: getCollectionVersion('inventory'), prod: getCollectionVersion('products'), retry });
  const { data: results, error } = useResource<ProductSummary[]>(key, () => productService.searchProducts({ ...filters, query: debounced, serviceAreaId: serviceArea.id }));

  const set = <K extends keyof ProductSearchFilters>(k: K) => (v: ProductSearchFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const cols = isMobile ? 1 : isDesktop ? 4 : 2;
  const pharmacyOptions = [{ value: 'all', label: 'All pharmacies' }, ...db.pharmacies.filter((p) => p.verification === 'verified').map((p) => ({ value: p.id, label: p.name }))];
  const activeFilterCount = [filters.category !== 'all', filters.productType !== 'all', filters.pharmacyId !== 'all', filters.availability !== 'all', filters.prescription !== 'all'].filter(Boolean).length;

  return (
    <Page>
      <PageHeader title="Find medicines & health products" subtitle={`Showing participating pharmacies near ${serviceArea.name}. Prices and stock are confirmed by the pharmacy.`} />
      <View style={{ gap: space[3], marginBottom: space[5] }}>
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          <SearchInput value={query} onChangeText={setQuery} placeholder="Search by medicine name, e.g. paracetamol" style={{ flex: 1 }} autoFocus={!isMobile} />
          {isMobile ? <Button label={activeFilterCount ? `Filters (${activeFilterCount})` : 'Filters'} icon={SlidersHorizontal} variant="outline" onPress={() => setShowFilters(!showFilters)} /> : null}
        </View>
        {showFilters || !isMobile ? (
          <View style={{ gap: space[3] }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
              <Select compact prefix="Category" value={filters.category} onChange={set('category')} options={[{ value: 'all', label: 'All' }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.label }))]} style={{ minWidth: 200 }} />
              <Select compact prefix="Type" value={filters.productType} onChange={set('productType')} options={[{ value: 'all', label: 'All' }, ...PRODUCT_TYPES.map((t) => ({ value: t.id, label: t.label }))]} style={{ minWidth: 150 }} />
              <Select compact prefix="Pharmacy" value={filters.pharmacyId} onChange={set('pharmacyId')} options={pharmacyOptions} style={{ minWidth: 220 }} width={260} />
              <Select
                compact
                prefix="Sort"
                value={filters.sort}
                onChange={set('sort')}
                options={[
                  { value: 'relevance', label: 'Relevance' },
                  { value: 'price-asc', label: 'Price: low to high' },
                  { value: 'price-desc', label: 'Price: high to low' },
                  { value: 'distance', label: 'Nearest pharmacy' },
                ]}
                style={{ minWidth: 190 }}
              />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[4], alignItems: 'center' }}>
              <Chips value={filters.availability!} onChange={set('availability')} options={[{ value: 'all', label: 'Any availability' }, { value: 'in-stock', label: 'In stock only' }]} />
              <Chips value={filters.prescription!} onChange={set('prescription')} options={[{ value: 'all', label: 'All products' }, { value: 'otc', label: 'Over the counter' }, { value: 'rx', label: 'Prescription only' }]} />
              {activeFilterCount ? <Button label="Clear filters" variant="ghost" size="sm" onPress={() => setFilters({ category: 'all', productType: 'all', pharmacyId: 'all', availability: 'all', prescription: 'all', sort: 'relevance' })} /> : null}
            </View>
          </View>
        ) : null}
        {filters.prescription === 'rx' ? (
          <Callout tone="violet" icon={FileText}>
            Prescription-only products can be ordered with a prescription, which a pharmacist must review before the order is prepared or dispatched.
          </Callout>
        ) : null}
      </View>

      {error ? (
        <ErrorState message={error} onRetry={() => setRetry((r) => r + 1)} />
      ) : results == null ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space[2] }}>
          {Array.from({ length: cols * 2 }).map((_, i) => (
            <View key={i} style={{ width: `${100 / cols}%`, padding: space[2] }}>
              <Card style={{ gap: space[3] }}>
                <Skeleton height={100} radius={8} />
                <Skeleton width="70%" />
                <Skeleton width="40%" height={11} />
              </Card>
            </View>
          ))}
        </View>
      ) : results.length === 0 ? (
        <Card>
          <EmptyState icon={SearchX} title="No products match" message="Try a different name or clear some filters. Only participating pharmacies are listed." action={<Button label="Clear search" variant="outline" onPress={() => { setQuery(''); setFilters({ category: 'all', productType: 'all', pharmacyId: 'all', availability: 'all', prescription: 'all', sort: 'relevance' }); }} />} />
        </Card>
      ) : (
        <>
          <Text variant="caption" tone="secondary" style={{ marginBottom: space[2] }}>
            {results.length} product{results.length === 1 ? '' : 's'}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space[2] }}>
            {results.map((s) => (
              <View key={s.product.id} style={{ width: `${100 / cols}%`, padding: space[2] }}>
                <ProductCard
                  summary={s}
                  layout={isMobile ? 'row' : 'grid'}
                  adding={pending === `${s.product.id}:${s.best?.inventory.pharmacyId}`}
                  onAdd={(x) => (x.listings.length > 1 && filters.pharmacyId === 'all' && x.product.requiresPrescription ? router.push(`/customer/product/${x.product.id}` as never) : x.best && add(x.product.id, x.best.inventory.pharmacyId, x.product.name, { requiresPrescription: x.product.requiresPrescription }))}
                />
              </View>
            ))}
          </View>
          <Text variant="caption" tone="muted" style={{ marginTop: space[4] }}>
            Product information is illustrative. MediFly does not provide medical recommendations, diagnoses or dosage advice — please consult a pharmacist or doctor.
          </Text>
        </>
      )}
    </Page>
  );
}
