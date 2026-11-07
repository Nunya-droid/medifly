import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal as RNModal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from '@/components/ui/icons';
import { colors, radius, shadow, space } from '@/theme';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Text } from './Text';
import { IconButton } from './Button';
import type { ViewRef } from './refs';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
  dismissable?: boolean;
}

/** Centered dialog on desktop, bottom sheet on mobile. */
export function Modal({ visible, onClose, title, subtitle, children, footer, width = 520, dismissable = true }: ModalProps) {
  const { isMobile } = useBreakpoint();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const anim = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (visible) Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
    else anim.setValue(0);
  }, [visible, anim]);

  return (
    <RNModal visible={visible} transparent animationType="none" onRequestClose={dismissable ? onClose : undefined}>
      <View style={[styles.backdropWrap, isMobile ? styles.sheetWrap : styles.centerWrap]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissable ? onClose : undefined} accessibilityLabel="Close dialog">
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: anim }]} />
        </Pressable>
        <Animated.View
          accessibilityViewIsModal
          role="dialog"
          style={[
            styles.panel,
            isMobile ? [styles.sheet, { maxHeight: height * 0.92, paddingBottom: insets.bottom }] : { width, maxWidth: '92%', maxHeight: height * 0.88 },
            { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [isMobile ? 40 : 12, 0] }) }] },
          ]}
        >
          {title ? (
            <View style={styles.header}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="h3">{title}</Text>
                {subtitle ? (
                  <Text variant="bodySm" tone="secondary">
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              {dismissable ? <IconButton icon={X} label="Close" onPress={onClose} size={36} /> : null}
            </View>
          ) : null}
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </View>
    </RNModal>
  );
}

/** Side drawer (right on desktop for details, left for navigation). */
export function Drawer({ visible, onClose, side = 'right', width = 440, title, children, footer }: { visible: boolean; onClose: () => void; side?: 'left' | 'right'; width?: number; title?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  const { width: screenW } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const w = Math.min(width, screenW * (side === 'left' ? 0.86 : 1));
  const anim = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (visible) Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
    else anim.setValue(0);
  }, [visible, anim]);
  return (
    <RNModal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={[StyleSheet.absoluteFill, { flexDirection: side === 'left' ? 'row' : 'row-reverse' }]}>
        <Animated.View
          style={[
            styles.drawer,
            { width: w, paddingTop: insets.top, paddingBottom: insets.bottom },
            { transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [side === 'left' ? -w : w, 0] }) }] },
          ]}
        >
          {title ? (
            <View style={styles.header}>
              <Text variant="h3" style={{ flex: 1 }}>
                {title}
              </Text>
              <IconButton icon={X} label="Close" onPress={onClose} size={36} />
            </View>
          ) : null}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={title ? styles.body : undefined}>
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close panel">
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: anim }]} />
        </Pressable>
      </View>
    </RNModal>
  );
}

type Anchor = { x: number; y: number; width: number; height: number };

/** Anchored popover. Measures the trigger and positions content below it (or as a sheet on mobile). */
export function Popover({
  trigger,
  children,
  width = 280,
  align = 'left',
  open,
  onOpenChange,
}: {
  trigger: (props: { onPress: () => void; ref: React.RefObject<ViewRef | null> }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  width?: number;
  align?: 'left' | 'right';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const ref = useRef<ViewRef>(null);
  const [internal, setInternal] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const { isMobile } = useBreakpoint();
  const { width: sw, height: sh } = useWindowDimensions();
  const isOpen = open ?? internal;
  const setOpen = (v: boolean) => {
    setInternal(v);
    onOpenChange?.(v);
  };
  const show = () => {
    if (ref.current && typeof ref.current.measureInWindow === 'function') {
      ref.current.measureInWindow((x: number, y: number, w: number, h: number) => {
        setAnchor({ x, y, width: w, height: h });
        setOpen(true);
      });
    } else setOpen(true);
  };
  const close = () => setOpen(false);

  let pos: ViewStyle = {};
  if (anchor && !isMobile) {
    const w = Math.max(width, anchor.width);
    let left = align === 'right' ? anchor.x + anchor.width - w : anchor.x;
    left = Math.max(8, Math.min(left, sw - w - 8));
    const below = anchor.y + anchor.height + 6;
    const maxH = Math.max(200, sh - below - 16);
    pos = { position: 'absolute', top: below, left, width: w, maxHeight: Math.min(420, maxH) };
  }

  return (
    <>
      {trigger({ onPress: show, ref })}
      <RNModal visible={isOpen} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={[StyleSheet.absoluteFill, isMobile && styles.backdrop]} onPress={close} accessibilityLabel="Close menu" />
        {isMobile ? (
          <View style={styles.mobileMenuWrap} pointerEvents="box-none">
            <View style={[styles.panel, styles.sheet, { maxHeight: sh * 0.7 }]}>
              <ScrollView contentContainerStyle={{ padding: space[2] }}>{children(close)}</ScrollView>
            </View>
          </View>
        ) : (
          <View style={[styles.popover, pos]}>
            <ScrollView contentContainerStyle={{ padding: 6 }}>{children(close)}</ScrollView>
          </View>
        )}
      </RNModal>
    </>
  );
}

export function MenuItem({ label, onPress, icon: Icon, selected, danger, description, disabled }: { label: string; onPress: () => void; icon?: React.ComponentType<{ size?: number; color?: string }>; selected?: boolean; danger?: boolean; description?: string; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="menuitem"
      accessibilityState={{ selected, disabled }}
      style={(state) => {
        const { hovered, pressed } = state as typeof state & { hovered?: boolean };
        return [styles.menuItem, (hovered || pressed) && { backgroundColor: colors.surfaceSunken }, selected && { backgroundColor: colors.blueTint }, disabled && { opacity: 0.45 }];
      }}
    >
      {Icon ? <Icon size={17} color={danger ? colors.danger : selected ? colors.blue : colors.textSecondary} /> : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodySm" weight={selected ? 'semibold' : 'medium'} tone={danger ? 'danger' : selected ? 'primary' : 'default'}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function DropdownMenu({ trigger, items, align = 'right', width = 220 }: { trigger: (p: { onPress: () => void; ref: React.RefObject<ViewRef | null> }) => React.ReactNode; items: { label: string; onPress: () => void; icon?: React.ComponentType<{ size?: number; color?: string }>; danger?: boolean; disabled?: boolean }[]; align?: 'left' | 'right'; width?: number }) {
  return (
    <Popover trigger={trigger} align={align} width={width}>
      {(close) =>
        items.map((i) => (
          <MenuItem
            key={i.label}
            {...i}
            onPress={() => {
              close();
              i.onPress();
            }}
          />
        ))
      }
    </Popover>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: colors.border, alignSelf: 'stretch' }, style]} />;
}

const styles = StyleSheet.create({
  backdropWrap: { flex: 1 },
  centerWrap: { alignItems: 'center', justifyContent: 'center', padding: space[4] },
  sheetWrap: { justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.overlay },
  panel: { backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden', ...shadow.lg },
  sheet: { width: '100%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], paddingHorizontal: space[5], paddingTop: space[5], paddingBottom: space[3] },
  body: { paddingHorizontal: space[5], paddingBottom: space[5], paddingTop: space[1], gap: space[4] },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: space[2], paddingHorizontal: space[5], paddingVertical: space[4], borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surfaceMuted },
  drawer: { backgroundColor: colors.surface, height: '100%', ...shadow.lg },
  popover: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadow.lg, overflow: 'hidden' },
  mobileMenuWrap: { flex: 1, justifyContent: 'flex-end' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 44, paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.md, cursor: 'pointer' } as ViewStyle,
});
