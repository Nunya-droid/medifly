import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { CircleCheck, Undo2, Wallet, XCircle } from '@/components/ui/icons';
import { space } from '@/theme';
import { useDb } from '@/hooks/useDb';
import { useAction } from '@/hooks/useAction';
import { useConfirm } from '@/contexts/ConfirmContext';
import { paymentService } from '@/services/paymentService';
import { PAYMENT_STATUS } from '@/constants/status';
import { PAYMENT_METHOD_LABEL } from '@/constants/catalog';
import { formatDateTime, formatGHS } from '@/utils/format';
import type { Payment, PaymentStatus } from '@/types';
import { Button, Callout, DataTable, PageHeader, Pagination, SearchInput, Select, StatCard, StatusBadge, Text, usePagination } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';

export default function Payments() {
  const db = useDb();
  const { run, loading } = useAction();
  const confirm = useConfirm();
  const [status, setStatus] = useState<'all' | PaymentStatus>('all');
  const [query, setQuery] = useState('');
  const all = useMemo(() => [...db.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [db]);
  const refunds = all.filter((p) => p.status === 'refund-requested');
  const list = all.filter((p) => (status === 'all' || p.status === status) && (!query.trim() || `${p.reference} ${db.orders.find((o) => o.id === p.orderId)?.reference}`.toLowerCase().includes(query.trim().toLowerCase())));
  const pg = usePagination(list, 12);
  const order = (p: Payment) => db.orders.find((o) => o.id === p.orderId);

  const decide = async (p: Payment, decision: 'approve' | 'decline') => {
    const r = await confirm({
      title: decision === 'approve' ? `Process refund of ${formatGHS(p.amount)}?` : 'Decline refund request?',
      message: decision === 'approve' ? 'This is a simulated refund — no real money moves. The customer will be notified.' : 'The payment returns to "Paid" and the customer is notified.',
      confirmLabel: decision === 'approve' ? 'Process refund' : 'Decline',
      tone: decision === 'approve' ? 'teal' : 'danger',
      reason: { label: decision === 'approve' ? 'Note (optional)' : 'Reason', optional: decision === 'approve' },
    });
    if (r.confirmed) run(() => paymentService.processRefund(p.id, decision, r.reason || undefined), { success: decision === 'approve' ? 'Refund processed (simulated)' : 'Refund declined' });
  };

  const paid = all.filter((p) => p.status === 'paid');
  return (
    <Page maxWidth={1350}>
      <PageHeader title="Payments & refunds" subtitle="Simulated transactions. No real financial transactions are performed." />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3], marginBottom: space[5] }}>
        <StatCard label="Collected (simulated)" value={formatGHS(paid.reduce((s, p) => s + p.amount, 0), { decimals: false })} icon={Wallet} tone="success" hint={`${paid.length} payments`} />
        <StatCard label="Cash due on delivery" value={formatGHS(all.filter((p) => p.status === 'cash-due').reduce((s, p) => s + p.amount, 0))} tone="info" />
        <StatCard label="Refund requests" value={refunds.length} icon={Undo2} tone="violet" onPress={() => setStatus('refund-requested')} />
        <StatCard label="Refunded" value={formatGHS(all.filter((p) => p.status === 'refunded').reduce((s, p) => s + p.amount, 0))} tone="neutral" />
      </View>
      {refunds.length ? <Callout tone="violet" icon={Undo2} title={`${refunds.length} refund request${refunds.length > 1 ? 's' : ''} awaiting a decision`}>Use the actions in the table to process or decline.</Callout> : null}
      <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap', marginVertical: space[4] }}>
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search transaction or order reference" style={{ flex: 1, minWidth: 240 }} />
        <Select compact prefix="Status" value={status} onChange={(v) => { setStatus(v); pg.setPage(1); }} options={[{ value: 'all', label: 'All' }, ...(Object.keys(PAYMENT_STATUS) as PaymentStatus[]).map((s) => ({ value: s, label: PAYMENT_STATUS[s].label }))]} style={{ minWidth: 220 }} />
      </View>
      <DataTable<Payment>
        rows={pg.slice}
        keyExtractor={(p) => p.id}
        minTableWidth={1000}
        emptyTitle="No transactions"
        columns={[
          { key: 'ref', title: 'Transaction', flex: 1.2, render: (p) => <View><Text variant="bodySm" weight="semibold">{p.reference}</Text><Text variant="caption" tone="muted">{formatDateTime(p.createdAt)}</Text></View> },
          { key: 'order', title: 'Order', flex: 1, render: (p) => <Button label={order(p)?.reference ?? '—'} variant="ghost" size="sm" onPress={() => router.push(`/admin/orders?id=${p.orderId}` as never)} /> },
          { key: 'cust', title: 'Customer', flex: 1.1, hideOnMobile: true, render: (p) => db.users.find((u) => u.id === p.customerId)?.name ?? '' },
          { key: 'method', title: 'Method', flex: 1.4, render: (p) => <View><Text variant="bodySm">{PAYMENT_METHOD_LABEL[p.method]}</Text>{p.methodDetail ? <Text variant="caption" tone="muted">{p.methodDetail}</Text> : null}</View> },
          { key: 'amount', title: 'Amount', flex: 0.9, align: 'right', render: (p) => formatGHS(p.amount) },
          { key: 'status', title: 'Status', flex: 1.2, render: (p) => <View style={{ gap: 4 }}><StatusBadge meta={PAYMENT_STATUS[p.status]} size="sm" />{p.refundReason && p.status !== 'paid' ? <Text variant="caption" tone="muted" numberOfLines={2}>{p.refundReason}</Text> : null}</View> },
          { key: 'act', title: '', flex: 1.6, minWidth: 200, render: (p) => (p.status === 'refund-requested' ? <View style={{ flexDirection: 'row', gap: 6 }}><Button label="Refund" icon={CircleCheck} size="sm" variant="teal" loading={loading} onPress={() => decide(p, 'approve')} /><Button label="Decline" icon={XCircle} size="sm" variant="outline" onPress={() => decide(p, 'decline')} /></View> : null) },
        ]}
      />
      <View style={{ marginTop: space[3] }}>
        <Pagination page={pg.page} pages={pg.pages} total={pg.total} pageSize={pg.pageSize} onChange={pg.setPage} />
      </View>
    </Page>
  );
}
