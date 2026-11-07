import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from '@/components/ui/icons';
import { colors, radius, shadow, space } from '@/theme';
import { Text } from '@/components/ui/Text';
import { useBreakpoint } from '@/hooks/useBreakpoint';

type ToastTone = 'success' | 'danger' | 'info' | 'warning';
interface ToastInput {
  tone?: ToastTone;
  title: string;
  message?: string;
  duration?: number;
}
interface ToastItem extends Required<Pick<ToastInput, 'tone' | 'title'>> {
  id: number;
  message?: string;
  anim: Animated.Value;
}

const ToastCtx = createContext<{ show: (t: ToastInput) => void } | null>(null);

const icons = { success: CircleCheck, danger: CircleAlert, info: Info, warning: TriangleAlert };
const tint = { success: colors.success, danger: colors.danger, info: colors.blue, warning: colors.warning };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const { isMobile } = useBreakpoint();
  const insets = useSafeAreaInsets();

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (t: ToastInput) => {
      const id = ++idRef.current;
      const anim = new Animated.Value(0);
      setToasts((list) => [...list.slice(-2), { id, tone: t.tone ?? 'info', title: t.title, message: t.message, anim }]);
      Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
      setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => dismiss(id));
      }, t.duration ?? (t.tone === 'danger' ? 5500 : 3800));
    },
    [dismiss]
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={[styles.host, isMobile ? { left: space[3], right: space[3], bottom: insets.bottom + 76 } : { right: space[6], top: space[6], width: 380 }]}>
        {toasts.map((t) => {
          const Icon = icons[t.tone];
          return (
            <Animated.View
              key={t.id}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={[styles.toast, { opacity: t.anim, transform: [{ translateY: t.anim.interpolate({ inputRange: [0, 1], outputRange: [isMobile ? 12 : -8, 0] }) }] }]}
            >
              <View style={[styles.bar, { backgroundColor: tint[t.tone] }]} />
              <Icon size={20} color={tint[t.tone]} style={{ marginTop: 1 }} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodySm" weight="semibold">
                  {t.title}
                </Text>
                {t.message ? (
                  <Text variant="caption" tone="secondary">
                    {t.message}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => dismiss(t.id)} accessibilityLabel="Dismiss notification" hitSlop={8}>
                <X size={16} color={colors.textMuted} />
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', gap: space[2], zIndex: 9999 },
  toast: { flexDirection: 'row', gap: space[3], alignItems: 'flex-start', backgroundColor: colors.surface, borderRadius: radius.lg, padding: space[4], paddingLeft: space[5], borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.lg },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
});
