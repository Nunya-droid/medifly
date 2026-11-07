import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Boxes, Minus, Pencil, Plus, TriangleAlert } from '@/components/ui/icons';
import { colors, space } from '@/theme';
import { useDb } from '@/hooks/useDb';
import { useAction } from '@/hooks/useAction';
import { usePharmacyScope } from '@/contexts/PharmacyScope';
import { pharmacyService } from '@/services/pharmacyService';
import { CATEGORIES, PRODUCT_TYPES, categoryLabel } from '@/constants/catalog';
import { formatGHS, formatRelative } from '@/utils/format';
import type { InventoryItem, Product, ProductCategory, ProductType } from '@/types';
import { Badge, Button, Callout, Checkbox, Chips, DataTable, IconButton, Input, Modal, PageHeader, Pagination, SearchInput, Select, StatCard, Switch, Text, usePagination } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { ProductVisual } from '@/components/illustrations';

type Row = { item: InventoryItem; product: Product };

/** Mounted per row (keyed), so form state initialises from that row. */
function EditModal({ row, onClose }: { row: Row; onClose: () => void }) {
  const { run, loading } = useAction();
  const [stock, setStock] = useState(String(row.item.stock));
  const [price, setPrice] = useState(String(row.item.price));
  const [threshold, setThreshold] = useState(String(row.item.lowStockThreshold));
  const [available, setAvailable] = useState(row.item.available);
  const [name, setName] = useState(row.product.name);
  const [rx, setRx] = useState(row.product.requiresPrescription);
  const [err, setErr] = useState<string>();
  const own = !!row.product.createdByPharmacyId;
  const save = async () => {
    const s = Number(stock);
    const p = Number(price);
    const t = Number(threshold);
    if (!Number.isInteger(s) || s < 0) return setErr('Stock must be a whole number of 0 or more.');
    if (!(p > 0)) return setErr('Price must be greater than 0.');
    if (!Number.isInteger(t) || t < 0) return setErr('Low-stock threshold must be a whole number.');
    const ok = await run(async () => {
      if (own && (name !== row.product.name || rx !== row.product.requiresPrescription)) await pharmacyService.updateProduct(row.product.id, row.item.pharmacyId, { name, requiresPrescription: rx });
      return pharmacyService.updateInventory(row.item.id, { stock: s, price: p, lowStockThreshold: t, available });
    }, { success: `${row.product.name} updated — visible to customers now` });
    if (ok) onClose();
  };
  return (
    <Modal visible onClose={onClose} title={`Edit ${row.product.name}`} subtitle={`${row.product.strength ?? ''} ${row.product.packSize}`} footer={<><Button label="Cancel" variant="outline" onPress={onClose} /><Button label="Save" loading={loading} onPress={save} /></>}>
      {own ? (
        <>
          <Input label="Product name" value={name} onChangeText={setName} />
          <Checkbox checked={rx} onChange={setRx} label="Prescription required" description="Prescription items need pharmacist approval before dispatch." />
        </>
      ) : (
        <Text variant="caption" tone="secondary">
          Shared catalogue product — name and prescription status are managed centrally.
        </Text>
      )}
      <View style={{ flexDirection: 'row', gap: space[3], flexWrap: 'wrap' }}>
        <Input containerStyle={{ flex: 1, minWidth: 140 }} label="Stock quantity" keyboardType="number-pad" value={stock} onChangeText={setStock} />
        <Input containerStyle={{ flex: 1, minWidth: 140 }} label="Price (GH₵)" keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
      </View>
      <Input label="Low-stock alert at" keyboardType="number-pad" value={threshold} onChangeText={setThreshold} />
      <Switch value={available} onChange={setAvailable} label="Available to customers" description="Turn off to hide this item from ordering without changing stock." />
      {err ? <Callout tone="danger">{err}</Callout> : null}
    </Modal>
  );
}

function AddModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const db = useDb();
  const { pharmacyId } = usePharmacyScope();
  const { run, loading } = useAction();
  const carried = new Set(db.inventory.filter((i) => i.pharmacyId === pharmacyId).map((i) => i.productId));
  const options = db.products.filter((p) => !carried.has(p.id));
  const [mode, setMode] = useState<'existing' | 'new'>(options.length ? 'existing' : 'new');
  const [existing, setExisting] = useState<string | undefined>(options[0]?.id);
  const [f, setF] = useState({ name: '', strength: '', dosageForm: 'Tablets', packSize: '', category: 'pain-fever' as ProductCategory, productType: 'medicine' as ProductType, rx: false, stock: '20', price: '' });
  const [err, setErr] = useState<string>();
  const set = (k: keyof typeof f) => (v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const submit = async () => {
    const stock = Number(f.stock);
    const price = Number(f.price);
    if (!Number.isInteger(stock) || stock < 0) return setErr('Stock must be a whole number.');
    if (!(price > 0)) return setErr('Enter a price above 0.');
    if (mode === 'new' && (f.name.trim().length < 2 || !f.packSize.trim())) return setErr('Name and pack size are required.');
    if (mode === 'existing' && !existing) return setErr('Choose a product.');
    setErr(undefined);
    const ok = await run(
      () =>
        pharmacyService.addProduct(pharmacyId, {
          existingProductId: mode === 'existing' ? existing : undefined,
          product:
            mode === 'new'
              ? { name: f.name.trim(), strength: f.strength.trim() || undefined, dosageForm: f.dosageForm, packSize: f.packSize.trim(), category: f.category, productType: f.productType, requiresPrescription: f.rx, handling: 'standard', weightKg: 0.1, droneSuitable: !f.rx, description: f.rx ? 'Prescription-only (demo). A pharmacist must review a prescription before supply.' : 'Product added by the pharmacy (demo). Not medical advice.', visual: 'box' }
              : undefined,
          stock,
          price,
        }),
      { success: 'Product added to inventory' }
    );
    if (ok) onClose();
  };
  return (
    <Modal visible={visible} onClose={onClose} title="Add product" width={600} footer={<><Button label="Cancel" variant="outline" onPress={onClose} /><Button label="Add product" loading={loading} onPress={submit} /></>}>
      <Chips value={mode} onChange={setMode} options={[{ value: 'existing', label: 'From catalogue' }, { value: 'new', label: 'New product' }]} />
      {mode === 'existing' ? (
        options.length ? (
          <Select label="Catalogue product" value={existing} onChange={setExisting} options={options.map((p) => ({ value: p.id, label: `${p.name} ${p.strength ?? ''}`, description: `${p.packSize}${p.requiresPrescription ? ' · Rx' : ''}` }))} width={360} />
        ) : (
          <Callout tone="info">You already carry every catalogue product. Create a new one instead.</Callout>
        )
      ) : (
        <>
          <Input label="Product name" value={f.name} onChangeText={set('name')} required />
          <View style={{ flexDirection: 'row', gap: space[3], flexWrap: 'wrap' }}>
            <Input containerStyle={{ flex: 1, minWidth: 140 }} label="Strength" value={f.strength} onChangeText={set('strength')} placeholder="e.g. 500 mg" />
            <Input containerStyle={{ flex: 1, minWidth: 140 }} label="Pack size" value={f.packSize} onChangeText={set('packSize')} placeholder="e.g. 20 tablets" required />
          </View>
          <View style={{ flexDirection: 'row', gap: space[3], flexWrap: 'wrap' }}>
            <Input containerStyle={{ flex: 1, minWidth: 140 }} label="Dosage form" value={f.dosageForm} onChangeText={set('dosageForm')} />
            <Select style={{ flex: 1, minWidth: 160 }} label="Category" value={f.category} onChange={set('category')} options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
          </View>
          <Select label="Product type" value={f.productType} onChange={set('productType')} options={PRODUCT_TYPES.map((t) => ({ value: t.id, label: t.label }))} />
          <Checkbox checked={f.rx} onChange={set('rx')} label="Prescription required" />
        </>
      )}
      <View style={{ flexDirection: 'row', gap: space[3], flexWrap: 'wrap' }}>
        <Input containerStyle={{ flex: 1, minWidth: 140 }} label="Opening stock" keyboardType="number-pad" value={f.stock} onChangeText={set('stock')} />
        <Input containerStyle={{ flex: 1, minWidth: 140 }} label="Price (GH₵)" keyboardType="decimal-pad" value={f.price} onChangeText={set('price')} />
      </View>
      {err ? <Callout tone="danger">{err}</Callout> : null}
    </Modal>
  );
}

export default function Inventory() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const db = useDb();
  const { pharmacyId } = usePharmacyScope();
  const { run } = useAction();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'unavailable' | 'rx'>((params.filter as 'low') ?? 'all');
  const [category, setCategory] = useState<'all' | ProductCategory>('all');
  const [editing, setEditing] = useState<Row | null>(null);
  const [adding, setAdding] = useState(false);

  const rows: Row[] = useMemo(
    () =>
      db.inventory
        .filter((i) => i.pharmacyId === pharmacyId)
        .map((item) => ({ item, product: db.products.find((p) => p.id === item.productId)! }))
        .filter((r) => !!r.product)
        .sort((a, b) => a.product.name.localeCompare(b.product.name)),
    [db, pharmacyId]
  );
  const shown = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (q && !`${r.product.name} ${r.product.strength ?? ''} ${r.product.category}`.toLowerCase().includes(q)) return false;
    if (category !== 'all' && r.product.category !== category) return false;
    if (filter === 'low') return r.item.stock <= r.item.lowStockThreshold;
    if (filter === 'unavailable') return !r.item.available || r.item.stock === 0;
    if (filter === 'rx') return r.product.requiresPrescription;
    return true;
  });
  const pg = usePagination(shown, 12);
  const low = rows.filter((r) => r.item.stock <= r.item.lowStockThreshold).length;
  const adjust = (r: Row, delta: number) => run(() => pharmacyService.updateInventory(r.item.id, { stock: Math.max(0, r.item.stock + delta) }));

  return (
    <Page maxWidth={1400}>
      <PageHeader title="Inventory" subtitle="Changes to stock, price and availability update the customer marketplace immediately." actions={<Button label="Add product" icon={Plus} onPress={() => setAdding(true)} />} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3], marginBottom: space[5] }}>
        <StatCard label="Products listed" value={rows.length} icon={Boxes} />
        <StatCard label="Low stock" value={low} icon={TriangleAlert} tone="warning" onPress={() => setFilter('low')} />
        <StatCard label="Unavailable" value={rows.filter((r) => !r.item.available || r.item.stock === 0).length} tone="neutral" onPress={() => setFilter('unavailable')} />
        <StatCard label="Stock value (illustrative)" value={formatGHS(rows.reduce((s, r) => s + r.item.stock * r.item.price, 0), { decimals: false })} tone="teal" />
      </View>
      {low ? <Callout tone="warning" icon={TriangleAlert} title={`${low} product${low > 1 ? 's are' : ' is'} at or below the low-stock threshold`}>Restock soon to keep these items orderable.</Callout> : null}
      <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap', marginVertical: space[4], alignItems: 'center' }}>
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search products" style={{ flex: 1, minWidth: 220 }} />
        <Select compact prefix="Category" value={category} onChange={setCategory} options={[{ value: 'all', label: 'All' }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.label }))]} style={{ minWidth: 210 }} />
        <Chips value={filter} onChange={(v) => { setFilter(v); pg.setPage(1); }} options={[{ value: 'all', label: 'All' }, { value: 'low', label: 'Low stock' }, { value: 'unavailable', label: 'Unavailable' }, { value: 'rx', label: 'Prescription' }]} />
      </View>
      <DataTable<Row>
        rows={pg.slice}
        keyExtractor={(r) => r.item.id}
        minTableWidth={900}
        emptyTitle="No products match"
        columns={[
          { key: 'product', title: 'Product', flex: 2.4, minWidth: 220, render: (r) => <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}><ProductVisual visual={r.product.visual} size={38} /><View style={{ flex: 1 }}><Text variant="bodySm" weight="semibold" numberOfLines={1}>{r.product.name} {r.product.strength ?? ''}</Text><Text variant="caption" tone="muted">{r.product.packSize}</Text></View></View> },
          { key: 'cat', title: 'Category', flex: 1.2, hideOnMobile: true, render: (r) => categoryLabel(r.product.category) },
          { key: 'rx', title: 'Rx', flex: 0.8, render: (r) => (r.product.requiresPrescription ? <Badge label="Rx" tone="violet" size="sm" /> : <Text variant="caption" tone="muted">OTC</Text>) },
          { key: 'stock', title: 'Stock', flex: 1.4, render: (r) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><IconButton icon={Minus} label={`Decrease ${r.product.name} stock`} size={30} variant="outline" onPress={() => adjust(r, -1)} disabled={r.item.stock === 0} /><Text variant="bodySm" weight="semibold" tabular style={{ minWidth: 32, textAlign: 'center', color: r.item.stock <= r.item.lowStockThreshold ? colors.warningText : colors.text }}>{r.item.stock}</Text><IconButton icon={Plus} label={`Increase ${r.product.name} stock`} size={30} variant="outline" onPress={() => adjust(r, 1)} /></View> },
          { key: 'price', title: 'Price', flex: 0.9, align: 'right', render: (r) => formatGHS(r.item.price) },
          { key: 'avail', title: 'Status', flex: 1.2, render: (r) => (!r.item.available ? <Badge label="Unavailable" size="sm" /> : r.item.stock === 0 ? <Badge label="Out of stock" tone="danger" size="sm" /> : r.item.stock <= r.item.lowStockThreshold ? <Badge label="Low stock" tone="warning" size="sm" /> : <Badge label="Available" tone="success" size="sm" dot />) },
          { key: 'updated', title: 'Updated', flex: 1, hideOnMobile: true, render: (r) => <Text variant="caption" tone="muted">{formatRelative(r.item.updatedAt)}</Text> },
          { key: 'actions', title: '', flex: 1.8, minWidth: 170, align: 'right', render: (r) => <View style={{ flexDirection: 'row', gap: 6 }}><Button label={r.item.available ? 'Mark unavailable' : 'Mark available'} size="sm" variant="ghost" onPress={() => run(() => pharmacyService.updateInventory(r.item.id, { available: !r.item.available }), { success: `${r.product.name} ${r.item.available ? 'hidden from' : 'shown to'} customers` })} /><IconButton icon={Pencil} label={`Edit ${r.product.name}`} size={34} variant="outline" onPress={() => setEditing(r)} /></View> },
        ]}
      />
      <View style={{ marginTop: space[3] }}>
        <Pagination page={pg.page} pages={pg.pages} total={pg.total} pageSize={pg.pageSize} onChange={pg.setPage} />
      </View>
      {editing ? <EditModal key={editing.item.id} row={editing} onClose={() => setEditing(null)} /> : null}
      {adding ? <AddModal visible onClose={() => setAdding(false)} /> : null}
    </Page>
  );
}
