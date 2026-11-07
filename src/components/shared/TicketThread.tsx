import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Send } from '@/components/ui/icons';
import { colors, radius, space } from '@/theme';
import type { SupportTicket } from '@/types';
import { useAction } from '@/hooks/useAction';
import { supportService } from '@/services/supportService';
import { formatDateTime } from '@/utils/format';
import { Button, Text, TextArea } from '@/components/ui';

export function TicketThread({ ticket, perspective }: { ticket: SupportTicket; perspective: 'customer' | 'support' }) {
  const [reply, setReply] = useState('');
  const { run, loading } = useAction();
  const closed = ticket.status === 'closed';
  return (
    <View style={{ gap: space[3] }}>
      {ticket.messages.map((m, i) => {
        const mine = (perspective === 'customer') === (m.from === 'customer');
        return (
          <View key={i} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
            <Text variant="caption" weight="semibold" style={{ color: mine ? 'rgba(255,255,255,0.85)' : colors.textSecondary }}>
              {m.author} · {formatDateTime(m.at)}
            </Text>
            <Text variant="bodySm" style={{ color: mine ? '#fff' : colors.text }}>
              {m.body}
            </Text>
          </View>
        );
      })}
      {ticket.resolutionNotes ? (
        <View style={styles.resolution}>
          <Text variant="caption" weight="semibold" tone="success">
            Resolution
          </Text>
          <Text variant="bodySm">{ticket.resolutionNotes}</Text>
        </View>
      ) : null}
      {!closed ? (
        <View style={{ gap: space[2] }}>
          <TextArea label="Reply" value={reply} onChangeText={setReply} placeholder={perspective === 'support' ? 'Write a reply to the customer…' : 'Add more detail for the support team…'} />
          <Button
            label="Send reply"
            icon={Send}
            size="sm"
            disabled={!reply.trim()}
            loading={loading}
            onPress={async () => {
              const r = await run(() => supportService.addMessage(ticket.id, reply), { success: 'Reply sent' });
              if (r) setReply('');
            }}
            style={{ alignSelf: 'flex-end' }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '88%', padding: space[3], borderRadius: radius.lg, gap: 4 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.blue, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surfaceSunken, borderBottomLeftRadius: 4 },
  resolution: { padding: space[3], borderRadius: radius.md, backgroundColor: colors.successTint, gap: 2 },
});
