import React from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radius, space } from '@/theme';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Text } from './Text';
import { Card, EmptyState } from './Display';

export interface Column<T> {
  key: string;
  title: string;
  flex?: number;
  minWidth?: number;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => React.ReactNode;
  /** Hide this column in the mobile card view. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyExtractor: (row: T) => string;
  onRowPress?: (row: T) => void;
  emptyTitle?: string;
  emptyMessage?: string;
  /** Custom mobile card renderer; defaults to label/value pairs. */
  renderMobileCard?: (row: T) => React.ReactNode;
  selectedKey?: string;
  minTableWidth?: number;
}

/** Real table on tablet/desktop; readable cards on mobile. */
export function DataTable<T>({ columns, rows, keyExtractor, onRowPress, emptyTitle = 'Nothing to show', emptyMessage, renderMobileCard, selectedKey, minTableWidth = 720 }: DataTableProps<T>) {
  const { isMobile } = useBreakpoint();

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState title={emptyTitle} message={emptyMessage} compact />
      </Card>
    );
  }

  if (isMobile) {
    return (
      <View style={{ gap: space[3] }}>
        {rows.map((row) => {
          const key = keyExtractor(row);
          const body = renderMobileCard ? (
            renderMobileCard(row)
          ) : (
            <View style={{ gap: space[2] }}>
              {columns
                .filter((c) => !c.hideOnMobile)
                .map((c) => (
                  <View key={c.key} style={styles.mobileRow}>
                    <Text variant="caption" tone="secondary" style={{ width: 96 }}>
                      {c.title}
                    </Text>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>{wrap(c.render(row))}</View>
                  </View>
                ))}
            </View>
          );
          return (
            <Card key={key} onPress={onRowPress ? () => onRowPress(row) : undefined} style={selectedKey === key ? { borderColor: colors.blue } : undefined} padded>
              {body}
            </Card>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.tableWrap}>
      <ScrollView horizontal contentContainerStyle={{ flexGrow: 1, minWidth: minTableWidth }} showsHorizontalScrollIndicator>
        <View style={{ flex: 1 }} accessibilityRole="list">
          <View style={styles.headRow}>
            {columns.map((c) => (
              <View key={c.key} style={[cellStyle(c), styles.cell]}>
                <Text variant="overline" tone="secondary" uppercase align={c.align}>
                  {c.title}
                </Text>
              </View>
            ))}
          </View>
          {rows.map((row, i) => {
            const key = keyExtractor(row);
            const selected = key === selectedKey;
            const inner = columns.map((c) => (
              <View key={c.key} style={[cellStyle(c), styles.cell]}>
                {wrap(c.render(row), c.align)}
              </View>
            ));
            return onRowPress ? (
              <Pressable
                key={key}
                onPress={() => onRowPress(row)}
                accessibilityRole="button"
                style={(state) => {
                  const { hovered } = state as typeof state & { hovered?: boolean };
                  return [styles.row, i === rows.length - 1 && styles.lastRow, hovered && { backgroundColor: colors.surfaceMuted }, selected && { backgroundColor: colors.blueTint }, { cursor: 'pointer' } as ViewStyle];
                }}
              >
                {inner}
              </Pressable>
            ) : (
              <View key={key} style={[styles.row, i === rows.length - 1 && styles.lastRow]}>
                {inner}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function wrap(node: React.ReactNode, align?: 'left' | 'right' | 'center') {
  if (typeof node === 'string' || typeof node === 'number') {
    return (
      <Text variant="bodySm" align={align} numberOfLines={2}>
        {node}
      </Text>
    );
  }
  return node;
}

function cellStyle<T>(c: Column<T>): ViewStyle {
  return { flex: c.flex ?? 1, minWidth: c.minWidth ?? 80, alignItems: c.align === 'right' ? 'flex-end' : c.align === 'center' ? 'center' : 'flex-start' };
}

const styles = StyleSheet.create({
  tableWrap: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  headRow: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: space[2], minHeight: 56 },
  lastRow: { borderBottomWidth: 0 },
  cell: { paddingHorizontal: space[2], paddingVertical: space[3], justifyContent: 'center' },
  mobileRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
});
