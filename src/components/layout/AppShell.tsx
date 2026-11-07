import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronsLeft, ChevronsRight, FlaskConical, LogOut, Menu, RotateCcw, User as UserIcon, type LucideIcon } from '@/components/ui/icons';
import { colors, layout, radius, shadow, space } from '@/theme';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useCurrentUser } from '@/hooks/useDb';
import { authService } from '@/services/authService';
import { adminService } from '@/services/adminService';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useToast } from '@/contexts/ToastContext';
import { Text, IconButton, Avatar, DropdownMenu, Drawer, Divider } from '@/components/ui';
import { Logo, LogoMark } from '@/components/illustrations';
import { NotificationBell } from './NotificationPanel';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  /** Also mark active for these path prefixes. */
  match?: string[];
  section?: string;
}

interface AppShellProps {
  children: React.ReactNode;
  nav: NavItem[];
  /** Up to 5 items shown as a bottom tab bar on mobile. */
  mobileTabs?: NavItem[];
  variant: 'sidebar' | 'topnav';
  portalLabel: string;
  notificationsHref: string;
  profileHref: string;
  headerExtra?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
}

function isActive(pathname: string, item: NavItem) {
  if (pathname === item.href) return true;
  return [item.href, ...(item.match ?? [])].some((p) => p !== '/' && pathname.startsWith(p + '/'));
}

function useUserMenu(profileHref: string) {
  const confirm = useConfirm();
  const toast = useToast();
  return [
    { label: 'Profile & settings', icon: UserIcon, onPress: () => router.push(profileHref as never) },
    {
      label: 'Reset demo data',
      icon: RotateCcw,
      onPress: async () => {
        const r = await confirm({ title: 'Reset demo data?', message: 'All orders, stock changes, prescriptions and notifications created in this browser will be replaced with the original fictional dataset.', confirmLabel: 'Reset data', tone: 'danger' });
        if (!r.confirmed) return;
        await adminService.resetDemoData();
        toast.show({ tone: 'success', title: 'Demo data reset', message: 'The original fictional dataset has been restored.' });
      },
    },
    {
      label: 'Sign out',
      icon: LogOut,
      danger: true,
      onPress: () => {
        authService.logout();
        router.replace('/login');
      },
    },
  ];
}

export function DemoStrip() {
  return (
    <View style={styles.strip} accessibilityRole="text">
      <FlaskConical size={13} color={colors.navy} />
      <Text variant="caption" tone="navy" weight="medium" numberOfLines={1} style={{ flexShrink: 1 }}>
        Academic demo · all people, pharmacies, orders and payments are fictional · data stays in this browser
      </Text>
    </View>
  );
}

function UserButton({ profileHref, compact }: { profileHref: string; compact?: boolean }) {
  const user = useCurrentUser();
  const items = useUserMenu(profileHref);
  if (!user) return null;
  return (
    <DropdownMenu
      items={items}
      width={230}
      trigger={({ onPress, ref }) => (
        <Pressable ref={ref} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Account menu for ${user.name}`} style={styles.userBtn}>
          <Avatar name={user.name} size={34} />
          {!compact ? (
            <View style={{ maxWidth: 150 }}>
              <Text variant="label" numberOfLines={1}>
                {user.name}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1} style={{ fontSize: 11 }}>
                Demo {user.role === 'admin' ? 'administrator' : user.role}
              </Text>
            </View>
          ) : null}
        </Pressable>
      )}
    />
  );
}

function SideNavLink({ item, active, collapsed, onPress }: { item: NavItem; active: boolean; collapsed?: boolean; onPress: () => void }) {
  const Icon = item.icon;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      style={(state) => {
        const { hovered } = state as typeof state & { hovered?: boolean };
        return [styles.sideLink, collapsed && styles.sideLinkCollapsed, hovered && !active && { backgroundColor: 'rgba(255,255,255,0.06)' }, active && styles.sideLinkActive];
      }}
    >
      <Icon size={19} color={active ? '#fff' : 'rgba(255,255,255,0.68)'} />
      {!collapsed ? (
        <Text variant="label" style={{ flex: 1, color: active ? '#fff' : 'rgba(255,255,255,0.78)' }} numberOfLines={1}>
          {item.label}
        </Text>
      ) : null}
      {item.badge ? (
        <View style={[styles.navBadge, collapsed && styles.navBadgeCollapsed]}>
          <Text style={styles.navBadgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function SidebarContent({ nav, collapsed, portalLabel, onNavigate, footer, onToggle }: { nav: NavItem[]; collapsed?: boolean; portalLabel: string; onNavigate: (href: string) => void; footer?: React.ReactNode; onToggle?: () => void }) {
  const pathname = usePathname();
  return (
    <View style={styles.sidebarInner}>
      <View style={[styles.sideBrand, collapsed && { justifyContent: 'center', paddingHorizontal: 0 }]}>
        {collapsed ? <LogoMark size={32} inverse /> : <Logo size={30} inverse />}
      </View>
      {!collapsed ? (
        <Text variant="overline" uppercase style={styles.portalLabel}>
          {portalLabel}
        </Text>
      ) : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 2, paddingHorizontal: collapsed ? space[2] : space[3], paddingBottom: space[4] }}>
        {nav.map((item, i) => {
          const header = item.section && item.section !== nav[i - 1]?.section && !collapsed ? item.section : null;
          return (
            <React.Fragment key={item.href}>
              {header ? (
                <Text variant="overline" uppercase style={[styles.portalLabel, { marginTop: space[4], paddingHorizontal: space[3] }]}>
                  {header}
                </Text>
              ) : null}
              <SideNavLink item={item} active={isActive(pathname, item)} collapsed={collapsed} onPress={() => onNavigate(item.href)} />
            </React.Fragment>
          );
        })}
      </ScrollView>
      {footer && !collapsed ? <View style={{ padding: space[3] }}>{footer}</View> : null}
      {onToggle ? (
        <Pressable onPress={onToggle} style={styles.collapseBtn} accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronsRight size={18} color="rgba(255,255,255,0.7)" /> : <ChevronsLeft size={18} color="rgba(255,255,255,0.7)" />}
          {!collapsed ? (
            <Text variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Collapse
            </Text>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

function BottomTabs({ tabs }: { tabs: NavItem[] }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bottomWrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.bottomTabs} accessibilityRole="tablist">
        {tabs.map((t) => {
          const active = isActive(pathname, t);
          const Icon = t.icon;
          return (
            <Pressable key={t.href} onPress={() => router.push(t.href as never)} style={[styles.bottomTab, active && styles.bottomTabActive]} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={t.label}>
              <View>
                <Icon size={21} color={active ? '#fff' : colors.textSecondary} strokeWidth={active ? 2.3 : 2} />
                {t.badge ? (
                  <View style={styles.tabBadge}>
                    <Text style={styles.navBadgeText}>{t.badge > 9 ? '9+' : t.badge}</Text>
                  </View>
                ) : null}
              </View>
              {active ? (
                <Text style={[styles.bottomTabLabel, { color: '#fff' }]} numberOfLines={1}>
                  {t.label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function AppShell({ children, nav, mobileTabs, variant, portalLabel, notificationsHref, profileHref, headerExtra, sidebarFooter }: AppShellProps) {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean | null>(null);
  const isCollapsed = collapsed ?? isTablet;
  const showSidebar = variant === 'sidebar' && !isMobile;
  const showBottomTabs = isMobile && !!mobileTabs?.length;
  const showTopLinks = variant === 'topnav' && !isMobile;

  const navigate = (href: string) => {
    setDrawer(false);
    router.push(href as never);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <DemoStrip />
      <View style={styles.body}>
        {showSidebar ? (
          <View style={[styles.sidebar, { width: isCollapsed ? layout.sidebarCollapsed : layout.sidebarWidth }]}>
            <SidebarContent nav={nav} collapsed={isCollapsed} portalLabel={portalLabel} onNavigate={navigate} footer={sidebarFooter} onToggle={() => setCollapsed(!isCollapsed)} />
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={[styles.topBar, variant === 'topnav' && !isMobile && styles.topBarWide]}>
            {(variant === 'sidebar' && isMobile) || (variant === 'topnav' && isMobile && !showBottomTabs) ? <IconButton icon={Menu} label="Open navigation" onPress={() => setDrawer(true)} /> : null}
            {variant === 'topnav' || isMobile ? (
              <Pressable onPress={() => router.push(nav[0].href as never)} accessibilityRole="link" accessibilityLabel="MediFly home">
                {isMobile ? <Logo size={26} /> : <Logo size={28} />}
              </Pressable>
            ) : (
              <Text variant="title" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
                {portalLabel}
              </Text>
            )}
            {showTopLinks ? (
              <View style={styles.topLinks}>
                {nav
                  .filter((n) => !n.section)
                  .map((item) => {
                    const active = isActive(pathname, item);
                    return (
                      <Pressable
                        key={item.href}
                        onPress={() => navigate(item.href)}
                        accessibilityRole="link"
                        style={(state) => {
                          const { hovered } = state as typeof state & { hovered?: boolean };
                          return [styles.topLink, hovered && { backgroundColor: colors.surfaceSunken }, active && styles.topLinkActive];
                        }}
                      >
                        <Text variant="label" weight={active ? 'semibold' : 'medium'} tone={active ? 'navy' : 'secondary'}>
                          {item.label}
                        </Text>
                        {item.badge ? (
                          <View style={[styles.navBadge, { marginLeft: 4 }]}>
                            <Text style={styles.navBadgeText}>{item.badge}</Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <View style={styles.topRight}>
              {headerExtra}
              <NotificationBell viewAllHref={notificationsHref} />
              <UserButton profileHref={profileHref} compact={!isDesktop} />
            </View>
          </View>
          <View style={{ flex: 1 }}>{children}</View>
          {showBottomTabs ? <BottomTabs tabs={mobileTabs!} /> : null}
        </View>
      </View>
      <Drawer visible={drawer} onClose={() => setDrawer(false)} side="left" width={layout.sidebarWidth + 24}>
        <View style={[styles.sidebar, { width: '100%', flex: 1, minHeight: '100%' as unknown as number }]}>
          <SidebarContent nav={nav} portalLabel={portalLabel} onNavigate={navigate} footer={sidebarFooter} />
        </View>
      </Drawer>
    </View>
  );
}

/** Standard scrollable page body with responsive gutters and max width. */
export function Page({ children, maxWidth = layout.contentMaxWidth, padded = true, refreshKey }: { children: React.ReactNode; maxWidth?: number; padded?: boolean; refreshKey?: string }) {
  const { isMobile } = useBreakpoint();
  return (
    <ScrollView key={refreshKey} style={{ flex: 1 }} contentContainerStyle={[{ paddingHorizontal: padded ? (isMobile ? space[4] : space[8]) : 0, paddingTop: isMobile ? space[5] : space[8], paddingBottom: space[16] }]} keyboardShouldPersistTaps="handled">
      <View style={{ width: '100%', maxWidth, alignSelf: 'center' }}>{children}</View>
    </ScrollView>
  );
}

export function SidebarHelp({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.help}>
      <Text variant="label" style={{ color: '#fff' }}>
        {title}
      </Text>
      <Text variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>
        {body}
      </Text>
    </View>
  );
}

export { Divider };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, flexDirection: 'row' },
  strip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: space[4], paddingVertical: 5, backgroundColor: colors.blueTint, borderBottomWidth: 1, borderBottomColor: colors.blueTintStrong },
  sidebar: { backgroundColor: colors.navy },
  sidebarInner: { flex: 1 },
  sideBrand: { height: layout.topBarHeight, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[5] },
  portalLabel: { color: 'rgba(255,255,255,0.45)', paddingHorizontal: space[5], marginBottom: space[2] },
  sideLink: { flexDirection: 'row', alignItems: 'center', gap: space[3], height: 42, paddingHorizontal: space[3], borderRadius: radius.md, cursor: 'pointer' } as ViewStyle,
  sideLinkCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  sideLinkActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  navBadge: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  navBadgeCollapsed: { position: 'absolute', top: 4, right: 6, minWidth: 16, height: 16, paddingHorizontal: 3 },
  navBadgeText: { color: '#fff', fontSize: 11, lineHeight: 14, fontFamily: 'Inter_600SemiBold' },
  collapseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  topBar: { height: layout.topBarHeight, flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  topBarWide: { paddingHorizontal: space[8] },
  topLinks: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: space[6] },
  topLink: { flexDirection: 'row', alignItems: 'center', height: 38, paddingHorizontal: space[3], borderRadius: radius.md, cursor: 'pointer' } as ViewStyle,
  topLinkActive: { backgroundColor: colors.blueTint },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  userBtn: { flexDirection: 'row', alignItems: 'center', gap: space[2], padding: 4, paddingRight: space[2], borderRadius: radius.pill, cursor: 'pointer' } as ViewStyle,
  bottomWrap: { paddingHorizontal: space[4], paddingTop: 8, backgroundColor: colors.background },
  bottomTabs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.pill, padding: 6, ...shadow.lg },
  bottomTab: { height: 48, minWidth: 48, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, backgroundColor: colors.surfaceSunken },
  bottomTabActive: { backgroundColor: colors.blue, paddingHorizontal: 16 },
  bottomTabLabel: { fontSize: 13, lineHeight: 16, fontFamily: 'Inter_600SemiBold' },
  tabBadge: { position: 'absolute', top: -6, right: -10, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  help: { padding: space[3], borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.07)', gap: 4 },
});
