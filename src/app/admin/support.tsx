import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Save } from '@/components/ui/icons';
import { space } from '@/theme';
import { useDb } from '@/hooks/useDb';
import { useAction } from '@/hooks/useAction';
import { supportService } from '@/services/supportService';
import { TICKET_PRIORITY, TICKET_STATUS } from '@/constants/status';
import { TICKET_CATEGORY_LABEL } from '@/constants/catalog';
import { formatRelative } from '@/utils/format';
import type { SupportTicket, TicketPriority, TicketStatus } from '@/types';
import { Button, Card, CardHeader, DataTable, Drawer, KeyValue, PageHeader, SearchInput, Select, StatusBadge, Tabs, Text, TextArea } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { TicketThread } from '@/components/shared/TicketThread';
import { OrderStatusBadge } from '@/components/shared/OrderParts';

const STAFF = ['Efua Sarpong', 'Kojo Antwi (support)', 'Abena Asare (support)'];
const PRIORITY_RANK: Record<TicketPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function TicketDetail({ t }: { t: SupportTicket }) {
  const db = useDb();
  const { run, loading } = useAction();
  const [status, setStatus] = useState<TicketStatus>(t.status);
  const [priority, setPriority] = useState<TicketPriority>(t.priority);
  const [assignee, setAssignee] = useState(t.assignedTo ?? 'unassigned');
  const [notes, setNotes] = useState(t.resolutionNotes ?? '');
  const customer = db.users.find((u) => u.id === t.customerId);
  const order = db.orders.find((o) => o.id === t.orderId);
  return (
    <View style={{ gap: space[4] }}>
      <Card style={{ gap: 2 }}>
        <KeyValue label="Customer" value={`${customer?.name} · ${customer?.phone}`} />
        <KeyValue label="Category" value={TICKET_CATEGORY_LABEL[t.category]} />
        <KeyValue label="Opened" value={formatRelative(t.createdAt)} />
        {order ? (
          <KeyValue label="Related order">
            <View style={{ flex: 1, alignItems: 'flex-end', gap: 4 }}>
              <Button label={order.reference} variant="ghost" size="sm" onPress={() => router.push(`/admin/orders?id=${order.id}` as never)} />
              <OrderStatusBadge order={order} size="sm" />
            </View>
          </KeyValue>
        ) : null}
      </Card>
      <Card style={{ gap: space[3] }}>
        <CardHeader title="Manage ticket" />
        <View style={{ flexDirection: 'row', gap: space[3], flexWrap: 'wrap' }}>
          <Select style={{ flex: 1, minWidth: 160 }} label="Status" value={status} onChange={setStatus} options={(Object.keys(TICKET_STATUS) as TicketStatus[]).map((s) => ({ value: s, label: TICKET_STATUS[s].label }))} />
          <Select style={{ flex: 1, minWidth: 140 }} label="Priority" value={priority} onChange={setPriority} options={(Object.keys(TICKET_PRIORITY) as TicketPriority[]).map((s) => ({ value: s, label: TICKET_PRIORITY[s].label }))} />
        </View>
        <Select label="Assigned to" value={assignee} onChange={setAssignee} options={[{ value: 'unassigned', label: 'Unassigned' }, ...STAFF.map((s) => ({ value: s, label: s }))]} />
        <TextArea label="Resolution notes" value={notes} onChangeText={setNotes} hint="Required before resolving or closing." />
        <Button label="Save ticket" icon={Save} loading={loading} onPress={() => run(() => supportService.updateTicket(t.id, { status, priority, assignedTo: assignee === 'unassigned' ? undefined : assignee, resolutionNotes: notes.trim() || undefined }), { success: `${t.reference} updated` })} style={{ alignSelf: 'flex-start' }} />
      </Card>
      <Card>
        <CardHeader title="Conversation" />
        <TicketThread ticket={t} perspective="support" />
      </Card>
    </View>
  );
}

export default function AdminSupport() {
  const db = useDb();
  const [tab, setTab] = useState<'open' | 'all' | 'resolved'>('open');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useMemo(
    () =>
      db.tickets
        .filter((t) => (tab === 'open' ? ['open', 'in-progress', 'awaiting-customer'].includes(t.status) : tab === 'resolved' ? ['resolved', 'closed'].includes(t.status) : true))
        .filter((t) => !query.trim() || `${t.reference} ${t.subject} ${db.users.find((u) => u.id === t.customerId)?.name}`.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.updatedAt.localeCompare(a.updatedAt)),
    [db, tab, query]
  );
  const open = db.tickets.find((t) => t.id === openId);
  return (
    <Page maxWidth={1300}>
      <PageHeader title="Customer support" subtitle="Tickets raised by customers, linked to their orders." />
      <Tabs value={tab} onChange={setTab} style={{ marginBottom: space[3] }} tabs={[{ value: 'open', label: 'Open', count: db.tickets.filter((t) => ['open', 'in-progress', 'awaiting-customer'].includes(t.status)).length }, { value: 'resolved', label: 'Resolved', count: db.tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length }, { value: 'all', label: 'All', count: db.tickets.length }]} />
      <SearchInput value={query} onChangeText={setQuery} placeholder="Search tickets" style={{ marginBottom: space[4] }} />
      <DataTable<SupportTicket>
        rows={list}
        keyExtractor={(t) => t.id}
        onRowPress={(t) => setOpenId(t.id)}
        minTableWidth={860}
        emptyTitle="No tickets"
        columns={[
          { key: 'ref', title: 'Ticket', flex: 1.6, render: (t) => <View><Text variant="bodySm" weight="semibold" numberOfLines={1}>{t.subject}</Text><Text variant="caption" tone="muted">{t.reference}</Text></View> },
          { key: 'cust', title: 'Customer', flex: 1.1, render: (t) => db.users.find((u) => u.id === t.customerId)?.name ?? '' },
          { key: 'cat', title: 'Category', flex: 1.1, hideOnMobile: true, render: (t) => TICKET_CATEGORY_LABEL[t.category] },
          { key: 'pri', title: 'Priority', flex: 0.8, render: (t) => <StatusBadge meta={TICKET_PRIORITY[t.priority]} size="sm" /> },
          { key: 'status', title: 'Status', flex: 1.1, render: (t) => <StatusBadge meta={TICKET_STATUS[t.status]} size="sm" /> },
          { key: 'who', title: 'Assigned', flex: 1.1, hideOnMobile: true, render: (t) => t.assignedTo ?? <Text variant="caption" tone="muted">Unassigned</Text> },
          { key: 'upd', title: 'Updated', flex: 0.9, render: (t) => <Text variant="caption" tone="muted">{formatRelative(t.updatedAt)}</Text> },
        ]}
      />
      <Drawer visible={!!open} onClose={() => setOpenId(null)} title={open ? `${open.reference} · ${open.subject}` : ''} width={600}>
        {open ? <TicketDetail key={open.id} t={open} /> : null}
      </Drawer>
    </Page>
  );
}
