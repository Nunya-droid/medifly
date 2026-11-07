import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { space } from '@/theme';
import { useDb } from '@/hooks/useDb';
import { auditService } from '@/services/auditService';
import { formatDateTime } from '@/utils/format';
import type { AuditAction, AuditLog } from '@/types';
import { Badge, DataTable, PageHeader, Pagination, SearchInput, Select, Text, usePagination } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';

const ACTIONS: AuditAction[] = ['order.created', 'order.status', 'order.cancelled', 'stock.updated', 'product.created', 'product.updated', 'prescription.submitted', 'prescription.reviewed', 'courier.assigned', 'delivery.updated', 'partner.status', 'payment.processed', 'refund.processed', 'support.updated', 'service-area.updated', 'settings.updated', 'auth.login', 'demo.reset'];

export default function AuditLogs() {
  const db = useDb();
  const [action, setAction] = useState<AuditAction | 'all'>('all');
  const [query, setQuery] = useState('');
  // Recompute when the dataset changes.
  const list = useMemo(() => auditService.list({ action, query }), [db.auditLogs, action, query]); // eslint-disable-line react-hooks/exhaustive-deps
  const pg = usePagination(list, 15);
  return (
    <Page maxWidth={1350}>
      <PageHeader title="Audit logs" subtitle="Every important demo action: orders, stock, prescriptions, courier assignments, deliveries, partners and refunds." />
      <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap', marginBottom: space[4] }}>
        <SearchInput value={query} onChangeText={(v) => { setQuery(v); pg.setPage(1); }} placeholder="Search summary, actor or entity" style={{ flex: 1, minWidth: 240 }} />
        <Select compact prefix="Action" value={action} onChange={(v) => { setAction(v); pg.setPage(1); }} options={[{ value: 'all', label: 'All actions' }, ...ACTIONS.map((a) => ({ value: a, label: a }))]} style={{ minWidth: 220 }} width={260} />
      </View>
      <DataTable<AuditLog>
        rows={pg.slice}
        keyExtractor={(l) => l.id}
        minTableWidth={900}
        emptyTitle="No log entries"
        columns={[
          { key: 'at', title: 'Time', flex: 1.1, render: (l) => <Text variant="caption" tone="secondary">{formatDateTime(l.at)}</Text> },
          { key: 'action', title: 'Action', flex: 1.1, render: (l) => <Badge label={l.action} tone={l.action.startsWith('order') ? 'info' : l.action.startsWith('prescription') ? 'violet' : l.action.startsWith('delivery') || l.action.startsWith('courier') ? 'teal' : l.action.startsWith('refund') || l.action.startsWith('payment') ? 'warning' : 'neutral'} size="sm" /> },
          { key: 'actor', title: 'Actor', flex: 1.1, render: (l) => <View><Text variant="bodySm">{l.actorName}</Text><Text variant="caption" tone="muted">{l.actorRole}</Text></View> },
          { key: 'summary', title: 'Summary', flex: 2.6, render: (l) => <Text variant="bodySm">{l.summary}</Text> },
          { key: 'entity', title: 'Entity', flex: 1, hideOnMobile: true, render: (l) => <Text variant="caption" tone="muted" numberOfLines={1}>{l.entityType} · {l.entityId}</Text> },
        ]}
      />
      <View style={{ marginTop: space[3] }}>
        <Pagination page={pg.page} pages={pg.pages} total={pg.total} pageSize={pg.pageSize} onChange={pg.setPage} />
      </View>
    </Page>
  );
}
