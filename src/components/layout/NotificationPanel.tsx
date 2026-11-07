import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Bell, CheckCheck, CircleAlert, ClipboardList, FileText, Headphones, Package, ShieldCheck, Truck } from '@/components/ui/icons';
import { colors, radius, space } from '@/theme';
import { useCurrentUser, useDb } from '@/hooks/useDb';
import { selectNotificationsFor, notificationService } from '@/services/notificationService';
import { formatRelative } from '@/utils/format';
import type { AppNotification } from '@/types';
import { Text, IconButton, Popover, Button, EmptyState, Chips } from '@/components/ui';

const ICONS: Record<AppNotification['type'], typeof Bell> = {
  order: Package,
  prescription: FileText,
  delivery: Truck,
  exception: CircleAlert,
  support: Headphones,
  partner: ShieldCheck,
  system: ClipboardList,
};

export function NotificationRow({ n, onOpen }: { n: AppNotification; onOpen: (n: AppNotification) => void }) {
  const Icon = ICONS[n.type];
  const danger = n.type === 'exception';
  return (
    <Pressable
      onPress={() => onOpen(n)}
      accessibilityRole="button"
      accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}. ${n.body}`}
      style={(state) => {
        const { hovered } = state as typeof state & { hovered?: boolean };
        return [styles.row, !n.read && styles.unread, hovered && { backgroundColor: colors.surfaceSunken }];
      }}
    >
      <View style={[styles.icon, danger && { backgroundColor: colors.dangerTint }]}>
        <Icon size={16} color={danger ? colors.danger : colors.blue} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center' }}>
          <Text variant="bodySm" weight={n.read ? 'medium' : 'semibold'} style={{ flex: 1 }} numberOfLines={1}>
            {n.title}
          </Text>
          {!n.read ? <View style={styles.dot} /> : null}
        </View>
        <Text variant="caption" tone="secondary" numberOfLines={2}>
          {n.body}
        </Text>
        <Text variant="caption" tone="muted" style={{ fontSize: 11 }}>
          {formatRelative(n.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}

export function useNotifications() {
  const db = useDb();
  const user = useCurrentUser();
  const list = useMemo(() => selectNotificationsFor(db, user), [db, user]);
  const unread = list.filter((n) => !n.read).length;
  const open = (n: AppNotification) => {
    if (!n.read) notificationService.markRead(n.id);
    if (n.link) router.push(n.link as never);
  };
  return { list, unread, open, markAll: () => user && notificationService.markAllRead(user) };
}

export function NotificationBell({ viewAllHref }: { viewAllHref: string }) {
  const { list, unread, open, markAll } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const shown = (filter === 'unread' ? list.filter((n) => !n.read) : list).slice(0, 8);
  return (
    <Popover
      width={380}
      align="right"
      trigger={({ onPress, ref }) => (
        <View ref={ref} collapsable={false}>
          <IconButton icon={Bell} label={`Notifications${unread ? `, ${unread} unread` : ''}`} onPress={onPress} badge={unread} />
        </View>
      )}
    >
      {(close) => (
        <View>
          <View style={styles.head}>
            <Text variant="title" style={{ flex: 1 }}>
              Notifications
            </Text>
            {unread ? <Button label="Mark all read" icon={CheckCheck} variant="ghost" size="sm" onPress={() => markAll()} /> : null}
          </View>
          <View style={{ paddingHorizontal: space[2], paddingBottom: space[2] }}>
            <Chips value={filter} onChange={setFilter} options={[{ value: 'all', label: `All (${list.length})` }, { value: 'unread', label: `Unread (${unread})` }]} />
          </View>
          {shown.length === 0 ? (
            <EmptyState icon={Bell} title="You're all caught up" compact />
          ) : (
            shown.map((n) => (
              <NotificationRow
                key={n.id}
                n={n}
                onOpen={(x) => {
                  close();
                  open(x);
                }}
              />
            ))
          )}
          <View style={{ padding: space[2] }}>
            <Button
              label="View all notifications"
              variant="secondary"
              size="sm"
              fullWidth
              onPress={() => {
                close();
                router.push(viewAllHref as never);
              }}
            />
          </View>
        </View>
      )}
    </Popover>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[3], paddingTop: space[2], paddingBottom: space[2], minHeight: 44 },
  row: { flexDirection: 'row', gap: space[3], padding: space[3], borderRadius: radius.md, cursor: 'pointer' } as ViewStyle,
  unread: { backgroundColor: '#F4F9FD' },
  icon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue },
});
