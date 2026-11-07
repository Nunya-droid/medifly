import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Headphones, Mail, MessageSquarePlus, Phone } from '@/components/ui/icons';
import { colors, space } from '@/theme';
import { useCurrentUser, useDb } from '@/hooks/useDb';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAction } from '@/hooks/useAction';
import { supportService } from '@/services/supportService';
import { TICKET_STATUS } from '@/constants/status';
import { TICKET_CATEGORY_LABEL } from '@/constants/catalog';
import { formatRelative } from '@/utils/format';
import type { SupportTicket, TicketCategory } from '@/types';
import { Button, Callout, Card, CardHeader, EmptyState, Input, Modal, PageHeader, Select, StatusBadge, Text, TextArea } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { TicketThread } from '@/components/shared/TicketThread';

export default function Support() {
  const params = useLocalSearchParams<{ order?: string }>();
  const db = useDb();
  const user = useCurrentUser();
  const { isDesktop } = useBreakpoint();
  const { run, loading } = useAction();
  const myOrders = db.orders.filter((o) => o.customerId === user?.id);
  const tickets = db.tickets.filter((t) => t.customerId === user?.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const [form, setForm] = useState({ orderId: params.order ?? '', category: (params.order ? 'delivery-delay' : 'other') as TicketCategory, subject: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const open: SupportTicket | undefined = tickets.find((t) => t.id === openId);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (form.subject.trim().length < 4) e.subject = 'Add a short subject (4+ characters)';
    if (form.message.trim().length < 10) e.message = 'Please describe the issue (10+ characters)';
    setErrors(e);
    if (Object.keys(e).length) return;
    const t = await run(() => supportService.createTicket({ ...form, orderId: form.orderId || undefined }), { success: (x) => `Ticket ${x.reference} created` });
    if (t) {
      setForm({ orderId: '', category: 'other', subject: '', message: '' });
      setOpenId(t.id);
    }
  };

  return (
    <Page>
      <PageHeader title="Support" subtitle="Report a problem with an order or ask a question. Replies appear here and in your notifications." />
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space[6] }}>
        <View style={{ flex: 1.2, gap: space[4] }}>
          <Card style={{ gap: space[4] }}>
            <CardHeader title="New support request" icon={MessageSquarePlus} />
            <Select
              label="Related order (optional)"
              value={form.orderId || 'none'}
              onChange={(v) => setForm((f) => ({ ...f, orderId: v === 'none' ? '' : v }))}
              options={[{ value: 'none', label: 'Not about a specific order' }, ...myOrders.map((o) => ({ value: o.id, label: o.reference, description: o.items.map((i) => i.name).join(', ') }))]}
              width={320}
            />
            <Select label="Category" value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} options={(Object.keys(TICKET_CATEGORY_LABEL) as TicketCategory[]).map((c) => ({ value: c, label: TICKET_CATEGORY_LABEL[c] }))} />
            <Input label="Subject" value={form.subject} onChangeText={(v) => setForm((f) => ({ ...f, subject: v }))} error={errors.subject} required />
            <TextArea label="Message" value={form.message} onChangeText={(v) => setForm((f) => ({ ...f, message: v }))} error={errors.message} required />
            <Callout tone="warning">Please do not share real medical details in this demo. For urgent health concerns, contact a healthcare professional or emergency services.</Callout>
            <Button label="Submit request" loading={loading} onPress={submit} style={{ alignSelf: 'flex-start' }} />
          </Card>
          <Card style={{ gap: space[2] }}>
            <CardHeader title="Contact (fictional)" icon={Headphones} />
            <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center' }}>
              <Phone size={15} color={colors.textMuted} />
              <Text variant="bodySm">{db.settings.supportPhone}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center' }}>
              <Mail size={15} color={colors.textMuted} />
              <Text variant="bodySm">{db.settings.supportEmail}</Text>
            </View>
          </Card>
        </View>
        <View style={{ flex: 1, gap: space[3] }}>
          <Text variant="h3">Your requests</Text>
          {tickets.length === 0 ? (
            <Card>
              <EmptyState icon={Headphones} title="No support requests" compact />
            </Card>
          ) : (
            tickets.map((t) => (
              <Card key={t.id} onPress={() => setOpenId(t.id)} style={{ gap: 6 }} accessibilityLabel={`Ticket ${t.reference}`}>
                <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center' }}>
                  <Text variant="bodySm" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
                    {t.subject}
                  </Text>
                  <StatusBadge meta={TICKET_STATUS[t.status]} size="sm" />
                </View>
                <Text variant="caption" tone="secondary">
                  {t.reference} · {TICKET_CATEGORY_LABEL[t.category]} · updated {formatRelative(t.updatedAt)}
                </Text>
              </Card>
            ))
          )}
        </View>
      </View>
      <Modal visible={!!open} onClose={() => setOpenId(null)} title={open ? `${open.reference} · ${open.subject}` : ''} subtitle={open ? `${TICKET_STATUS[open.status].label}${open.orderId ? ` · ${db.orders.find((o) => o.id === open.orderId)?.reference}` : ''}` : undefined} width={600}>
        {open ? <TicketThread ticket={open} perspective="customer" /> : null}
      </Modal>
    </Page>
  );
}
