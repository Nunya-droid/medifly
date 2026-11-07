import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, FileText, Minus, Plus, ShoppingCart, Store, Trash2, TriangleAlert } from '@/components/ui/icons';
import { colors, radius, space } from '@/theme';
import { useCustomer } from '@/hooks/useCustomer';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAction } from '@/hooks/useAction';
import { cartService, type CartGroup } from '@/services/cartService';
import { evaluateMethods } from '@/services/deliveryRecommendationService';
import { DELIVERY_METHOD_LABEL } from '@/constants/catalog';
import { formatEta, formatGHS } from '@/utils/format';
import { Badge, Button, Callout, Card, CardHeader, EmptyState, KeyValue, PageHeader, Text } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { ProductVisual } from '@/components/illustrations';

function GroupCard({ group }: { group: CartGroup }) {
  const { db, user, serviceArea, selected } = useCustomer();
  const { run } = useAction();
  const rec = evaluateMethods(db, { serviceAreaId: serviceArea.id, pharmacyId: group.pharmacyId, items: group.lines.map((l) => ({ productId: l.product.id, quantity: l.item.quantity })) });
  const fee = rec.recommended?.fee ?? 0;
  const setQty = (productId: string, q: number) => user && run(() => cartService.setQuantity(user.id, productId, group.pharmacyId, q));

  return (
    <Card style={{ gap: space[4] }}>
      <CardHeader title={group.pharmacyName} subtitle={`${group.lines.length} item${group.lines.length > 1 ? 's' : ''} · one order per pharmacy`} icon={Store} />
      <View style={{ gap: space[3] }}>
        {group.lines.map((l) => (
          <View key={l.product.id} style={styles.line}>
            <ProductVisual visual={l.product.visual} size={56} />
            <View style={{ flex: 1, minWidth: 140, gap: 3 }}>
              <Pressable onPress={() => router.push(`/customer/product/${l.product.id}` as never)}>
                <Text variant="bodySm" weight="semibold">
                  {l.product.name} {l.product.strength ?? ''}
                </Text>
              </Pressable>
              <Text variant="caption" tone="secondary">
                {l.product.packSize} · {formatGHS(l.unitPrice)} each
              </Text>
              <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
                {l.product.requiresPrescription ? <Badge label="Prescription required" tone="violet" size="sm" icon={FileText} /> : null}
                {l.issue ? <Badge label={l.issue} tone="danger" size="sm" icon={TriangleAlert} /> : null}
              </View>
            </View>
            <View style={styles.stepper}>
              <Pressable onPress={() => setQty(l.product.id, l.item.quantity - 1)} style={styles.stepBtn} accessibilityLabel={`Decrease ${l.product.name}`}>
                <Minus size={15} color={colors.navy} />
              </Pressable>
              <Text variant="bodySm" weight="semibold" tabular style={{ minWidth: 24, textAlign: 'center' }}>
                {l.item.quantity}
              </Text>
              <Pressable onPress={() => setQty(l.product.id, l.item.quantity + 1)} disabled={!!l.inventory && l.item.quantity >= Math.min(10, l.inventory.stock)} style={styles.stepBtn} accessibilityLabel={`Increase ${l.product.name}`}>
                <Plus size={15} color={l.inventory && l.item.quantity >= Math.min(10, l.inventory.stock) ? colors.textMuted : colors.navy} />
              </Pressable>
            </View>
            <View style={{ alignItems: 'flex-end', minWidth: 90, gap: 4 }}>
              <Text variant="bodySm" weight="semibold" tabular>
                {formatGHS(l.lineTotal)}
              </Text>
              <Pressable onPress={() => user && run(() => cartService.removeItem(user.id, l.product.id, group.pharmacyId), { success: `${l.product.name} removed` })} accessibilityLabel={`Remove ${l.product.name}`} hitSlop={8} style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                <Trash2 size={14} color={colors.dangerText} />
                <Text variant="caption" tone="danger">
                  Remove
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
      <View>
        <KeyValue label="Subtotal" value={formatGHS(group.subtotal)} />
        <KeyValue label="Delivery estimate">
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            {rec.recommended ? (
              <>
                <Text variant="bodySm" weight="medium">
                  {formatGHS(fee)} · {DELIVERY_METHOD_LABEL[rec.recommended.method]}
                </Text>
                <Text variant="caption" tone="secondary">
                  {formatEta(rec.recommended.etaMinutes)} to {selected?.label ?? serviceArea.name}
                </Text>
              </>
            ) : (
              <Text variant="bodySm" tone="danger" align="right">
                Not available to {serviceArea.name}
              </Text>
            )}
          </View>
        </KeyValue>
        <KeyValue label="Estimated total" value={formatGHS(group.subtotal + fee)} strong />
      </View>
      {group.requiresPrescription ? <Callout tone="violet" icon={FileText}>You will attach a prescription during checkout. A pharmacist reviews it before your order is prepared.</Callout> : null}
      <Button
        label="Proceed to checkout"
        iconRight={ArrowRight}
        size="lg"
        disabled={group.hasIssues || !rec.recommended}
        onPress={() => router.push(`/customer/checkout?pharmacy=${group.pharmacyId}` as never)}
      />
      {group.hasIssues ? (
        <Text variant="caption" tone="danger">
          Adjust the highlighted items before checking out.
        </Text>
      ) : null}
    </Card>
  );
}

export default function CartScreen() {
  const { cart, cartCount } = useCustomer();
  const { isDesktop } = useBreakpoint();
  const total = cart.reduce((s, g) => s + g.subtotal, 0);

  return (
    <Page maxWidth={1080}>
      <PageHeader title="Your cart" subtitle={cartCount ? `${cartCount} item${cartCount > 1 ? 's' : ''} from ${cart.length} pharmac${cart.length > 1 ? 'ies' : 'y'}` : undefined} actions={<Button label="Continue shopping" variant="outline" onPress={() => router.push('/customer/search')} />} />
      {cart.length === 0 ? (
        <Card>
          <EmptyState icon={ShoppingCart} title="Your cart is empty" message="Search for medicines and health products from participating pharmacies." action={<Button label="Browse products" onPress={() => router.push('/customer/search')} />} />
        </Card>
      ) : (
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space[6] }}>
          <View style={{ flex: 2, gap: space[5] }}>
            {cart.length > 1 ? <Callout tone="info">Items from different pharmacies are delivered as separate orders. Check out each pharmacy group in turn.</Callout> : null}
            {cart.map((g) => (
              <GroupCard key={g.pharmacyId} group={g} />
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <Card style={{ gap: space[3] }}>
              <Text variant="h3">Summary</Text>
              <KeyValue label="Items" value={String(cartCount)} />
              <KeyValue label="Medicine subtotal" value={formatGHS(total)} strong />
              <Text variant="caption" tone="secondary">
                Delivery fees depend on the method recommended for each pharmacy and your selected address. You will see the final total before paying.
              </Text>
            </Card>
          </View>
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[3], paddingBottom: space[3], borderBottomWidth: 1, borderBottomColor: colors.border },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md },
  stepBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
