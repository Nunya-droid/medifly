import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { FileText, Plus, Store } from '@/components/ui/icons';
import { colors, space } from '@/theme';
import type { ProductSummary } from '@/services/productService';
import { formatGHS, formatKm } from '@/utils/format';
import { categoryLabel } from '@/constants/catalog';
import { Badge, Button, Card, Text } from '@/components/ui';
import { ProductVisual } from '@/components/illustrations';
import { FavoriteButton } from '@/components/customer/HomeParts';

export function ProductCard({ summary, onAdd, adding, layout = 'grid' }: { summary: ProductSummary; onAdd: (s: ProductSummary) => void; adding?: boolean; layout?: 'grid' | 'row' }) {
  const { product, best, inStock, listings } = summary;
  const open = () => router.push(`/customer/product/${product.id}` as never);
  const stockBadge = inStock ? (best && best.inventory.stock <= best.inventory.lowStockThreshold ? <Badge label={`Low stock · ${best.inventory.stock} left`} tone="warning" size="sm" /> : <Badge label="In stock" tone="success" size="sm" dot />) : <Badge label="Unavailable" tone="neutral" size="sm" />;

  if (layout === 'row') {
    return (
      <Card onPress={open} accessibilityLabel={product.name} style={styles.row}>
        <ProductVisual visual={product.visual} size={56} />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text variant="title" numberOfLines={1}>
            {product.name} {product.strength ?? ''}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {product.dosageForm} · {product.packSize}
          </Text>
          <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
            {product.requiresPrescription ? <Badge label="Prescription required" tone="violet" size="sm" icon={FileText} /> : null}
            {stockBadge}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: space[2] }}>
          <Text variant="title" tabular>
            {summary.minPrice != null ? formatGHS(summary.minPrice) : '—'}
          </Text>
          <Button label="Add" icon={Plus} size="sm" variant={product.requiresPrescription ? 'secondary' : 'primary'} disabled={!inStock} loading={adding} onPress={() => onAdd(summary)} />
        </View>
      </Card>
    );
  }

  return (
    <Card onPress={open} accessibilityLabel={product.name} style={styles.grid} padded={false}>
      <View style={styles.visualWrap}>
        <ProductVisual visual={product.visual} size={88} />
        {product.requiresPrescription ? (
          <View style={styles.rxFlag}>
            <Badge label="Rx · pharmacist review" tone="violet" size="sm" icon={FileText} />
          </View>
        ) : null}
        <View style={{ position: 'absolute', top: space[2], right: space[2] }}>
          <FavoriteButton product={product} size={34} />
        </View>
      </View>
      <View style={{ padding: space[4], gap: space[2], flex: 1 }}>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {categoryLabel(product.category)}
        </Text>
        <Text variant="title" numberOfLines={2}>
          {product.name} {product.strength ?? ''}
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={1}>
          {product.dosageForm} · {product.packSize}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Store size={13} color={colors.textMuted} />
          <Text variant="caption" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
            {best ? `${best.pharmacyName}${best.distanceKm != null ? ` · ${formatKm(best.distanceKm)}` : ''}` : '—'}
            {listings.length > 1 ? ` · +${listings.length - 1} more` : ''}
          </Text>
        </View>
        {stockBadge}
        <View style={{ flex: 1 }} />
        <View style={styles.priceRow}>
          <View>
            <Text variant="caption" tone="muted">
              {listings.length > 1 ? 'From' : 'Price'}
            </Text>
            <Text variant="h3" tabular>
              {summary.minPrice != null ? formatGHS(summary.minPrice) : '—'}
            </Text>
          </View>
          <Button label="Add" icon={Plus} size="sm" variant={product.requiresPrescription ? 'secondary' : 'primary'} disabled={!inStock} loading={adding} onPress={() => onAdd(summary)} accessibilityLabel={`Add ${product.name} to cart`} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3] },
  grid: { flex: 1, overflow: 'hidden', borderRadius: 22 },
  visualWrap: { height: 140, margin: 6, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSunken },
  rxFlag: { position: 'absolute', top: space[2], left: space[2] },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space[2], marginTop: space[2] },
});
