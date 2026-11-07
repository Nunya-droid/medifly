import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  Building2,
  Car,
  CircleCheck,
  ClipboardCheck,
  Drone,
  FileText,
  Globe,
  Headphones,
  Lock,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  PackageCheck,
  Phone,
  Pill,
  Search,
  ShieldCheck,
  Stethoscope,
  Store,
  Truck,
  UserCheck,
  X,
  type LucideIcon,
} from '@/components/ui/icons';
import { colors, layout, radius, shadow, space } from '@/theme';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useCurrentUser } from '@/hooks/useDb';
import { useAction } from '@/hooks/useAction';
import { adminService } from '@/services/adminService';
import { DEMO_DISCLAIMER, ROLE_HOME } from '@/constants/catalog';
import { Badge, Button, Callout, Input, Modal, Select, Text, TextArea } from '@/components/ui';
import { HeroIllustration, Logo } from '@/components/illustrations';
import { DemoStrip } from '@/components/layout/AppShell';
import type { ScrollViewRef } from '@/components/ui/refs';

type SectionKey = 'home' | 'how' | 'services' | 'pharmacies' | 'about' | 'contact';
const NAV: { key: SectionKey; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'how', label: 'How It Works' },
  { key: 'services', label: 'Services' },
  { key: 'pharmacies', label: 'For Pharmacies' },
  { key: 'about', label: 'About' },
  { key: 'contact', label: 'Contact' },
];

function Container({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { isMobile } = useBreakpoint();
  return <View style={[{ width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: isMobile ? space[5] : space[8] }, style]}>{children}</View>;
}

function SectionHeading({ eyebrow, title, subtitle, center }: { eyebrow: string; title: string; subtitle?: string; center?: boolean }) {
  const { isMobile } = useBreakpoint();
  return (
    <View style={{ gap: space[3], alignItems: center ? 'center' : 'flex-start', marginBottom: space[10], maxWidth: center ? 720 : 640, alignSelf: center ? 'center' : 'flex-start' }}>
      <Text variant="overline" tone="teal" uppercase>
        {eyebrow}
      </Text>
      <Text variant={isMobile ? 'h1' : 'h1'} align={center ? 'center' : 'left'} style={!isMobile ? { fontSize: 36, lineHeight: 44 } : undefined}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" tone="secondary" align={center ? 'center' : 'left'} style={{ fontSize: 17, lineHeight: 27 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function FeatureCard({ icon: Icon, title, body, tone = 'blue' }: { icon: LucideIcon; title: string; body: string; tone?: 'blue' | 'teal' }) {
  return (
    <View style={styles.feature}>
      <View style={[styles.featureIcon, tone === 'teal' && { backgroundColor: colors.tealTint }]}>
        <Icon size={22} color={tone === 'teal' ? colors.tealDark : colors.blue} />
      </View>
      <Text variant="h3">{title}</Text>
      <Text variant="bodySm" tone="secondary">
        {body}
      </Text>
    </View>
  );
}

function PartnerForm({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ pharmacyName: '', contactName: '', phone: '', area: 'Madina', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const { run, loading } = useAction();
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    const e: Record<string, string> = {};
    if (form.pharmacyName.trim().length < 2) e.pharmacyName = 'Required';
    if (form.contactName.trim().length < 2) e.contactName = 'Required';
    if (!/^(\+233|0)[\s\d]{9,13}$/.test(form.phone.trim())) e.phone = 'Use a Ghanaian number, e.g. 024 555 0142';
    setErrors(e);
    if (Object.keys(e).length) return;
    const ok = await run(() => adminService.submitPartnerInterest(form));
    if (ok !== undefined) setDone(true);
  };
  const close = () => {
    setDone(false);
    setForm({ pharmacyName: '', contactName: '', phone: '', area: 'Madina', message: '' });
    onClose();
  };
  return (
    <Modal
      visible={visible}
      onClose={close}
      title={done ? 'Thank you' : 'Partner with MediFly'}
      subtitle={done ? undefined : 'Register your pharmacy’s interest. This demo form notifies the MediFly operations portal.'}
      footer={done ? <Button label="Close" onPress={close} /> : <><Button label="Cancel" variant="outline" onPress={close} /><Button label="Submit interest" loading={loading} onPress={submit} /></>}
    >
      {done ? (
        <Callout tone="success" icon={CircleCheck} title="Interest received (demo)">
          Your details were sent to the MediFly administrator notifications in this browser. No real partnership is created.
        </Callout>
      ) : (
        <View style={{ gap: space[4] }}>
          <Input label="Pharmacy name" value={form.pharmacyName} onChangeText={set('pharmacyName')} error={errors.pharmacyName} required />
          <Input label="Contact name" value={form.contactName} onChangeText={set('contactName')} error={errors.contactName} required />
          <Input label="Phone" placeholder="+233 24 555 0142" keyboardType="phone-pad" value={form.phone} onChangeText={set('phone')} error={errors.phone} required />
          <Select label="Area" value={form.area} onChange={set('area')} options={['Madina', 'East Legon', 'Adenta', 'Legon', 'Osu', 'Airport Residential', 'Tema', 'Other'].map((a) => ({ value: a, label: a }))} />
          <TextArea label="Message (optional)" value={form.message} onChangeText={set('message')} placeholder="Opening hours, number of pharmacists, current delivery arrangements…" />
        </View>
      )}
    </Modal>
  );
}

export default function Landing() {
  const { isMobile, isDesktop, width } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const user = useCurrentUser();
  const scroll = useRef<ScrollViewRef>(null);
  const offsets = useRef<Record<string, number>>({});
  const [menu, setMenu] = useState(false);
  const [partner, setPartner] = useState(false);
  const fade = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: false }).start();
  }, [fade]);

  const go = (key: SectionKey) => {
    setMenu(false);
    scroll.current?.scrollTo({ y: Math.max(0, (offsets.current[key] ?? 0) - 72), animated: true });
  };
  const mark = (key: SectionKey, e: { nativeEvent: { layout: { y: number } } }) => {
    offsets.current[key] = e.nativeEvent.layout.y;
  };
  const primaryCta = () => router.push((user ? ROLE_HOME[user.role] : '/login?redirect=/customer/dashboard') as never);
  const cols = (d: number, t: number, m = 1) => (isMobile ? m : isDesktop ? d : t);
  const cardWidth = (n: number) => ({ width: `${100 / n}%` as const, padding: space[2] });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <DemoStrip />
      {/* Nav */}
      <View style={styles.nav}>
        <Container style={{ flexDirection: 'row', alignItems: 'center', gap: space[4], height: 68 }}>
          <Pressable onPress={() => go('home')} accessibilityRole="link" accessibilityLabel="MediFly home">
            <Logo size={30} />
          </Pressable>
          {isDesktop ? (
            <View style={{ flexDirection: 'row', gap: 2, flex: 1, justifyContent: 'center' }}>
              {NAV.map((n) => (
                <Pressable
                  key={n.key}
                  onPress={() => go(n.key)}
                  accessibilityRole="link"
                  style={(state) => {
                    const { hovered } = state as typeof state & { hovered?: boolean };
                    return [styles.navLink, hovered && { backgroundColor: colors.surfaceSunken }];
                  }}
                >
                  <Text variant="label" tone="secondary">
                    {n.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {!isMobile ? (
            <View style={{ flexDirection: 'row', gap: space[2] }}>
              {user ? (
                <Button label="Open dashboard" onPress={primaryCta} iconRight={ArrowRight} />
              ) : (
                <>
                  <Button label="Sign In" variant="ghost" onPress={() => router.push('/login')} />
                  <Button label="Get Started" onPress={() => router.push('/register')} />
                </>
              )}
            </View>
          ) : null}
          {!isDesktop ? <Pressable onPress={() => setMenu(!menu)} accessibilityLabel={menu ? 'Close menu' : 'Open menu'} style={styles.menuBtn}>{menu ? <X size={22} color={colors.navy} /> : <Menu size={22} color={colors.navy} />}</Pressable> : null}
        </Container>
        {menu && !isDesktop ? (
          <View style={styles.mobileMenu}>
            {NAV.map((n) => (
              <Pressable key={n.key} onPress={() => go(n.key)} style={styles.mobileMenuItem} accessibilityRole="link">
                <Text variant="title">{n.label}</Text>
              </Pressable>
            ))}
            <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[3] }}>
              {user ? (
                <Button label="Open dashboard" onPress={primaryCta} fullWidth style={{ flex: 1 }} />
              ) : (
                <>
                  <Button label="Sign In" variant="outline" onPress={() => router.push('/login')} style={{ flex: 1 }} />
                  <Button label="Get Started" onPress={() => router.push('/register')} style={{ flex: 1 }} />
                </>
              )}
            </View>
          </View>
        ) : null}
      </View>

      <ScrollView ref={scroll} style={{ flex: 1 }} scrollEventThrottle={16}>
        {/* Hero */}
        <View onLayout={(e) => mark('home', e)} style={styles.heroBg}>
          <Container style={{ flexDirection: isDesktop ? 'row' : 'column', alignItems: isDesktop ? 'center' : 'stretch', gap: space[10], paddingVertical: isMobile ? space[10] : space[16] }}>
            <Animated.View style={{ flex: isDesktop ? 1 : undefined, minWidth: 0, gap: space[5], opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
              <Badge label="Licensed pharmacies · Doorstep delivery · Accra pilot (demo)" tone="teal" icon={BadgeCheck} />
              <Text variant="display" style={isMobile ? { fontSize: 36, lineHeight: 44 } : width < 1200 ? { fontSize: 44, lineHeight: 52 } : { fontSize: 54, lineHeight: 62 }}>
                Healthcare, Delivered to <Text variant="display" style={[{ color: colors.blue }, isMobile ? { fontSize: 36, lineHeight: 44 } : width < 1200 ? { fontSize: 44, lineHeight: 52 } : { fontSize: 54, lineHeight: 62 }]}>Your Doorstep.</Text>
              </Text>
              <Text variant="body" tone="secondary" style={{ fontSize: 18, lineHeight: 29, maxWidth: 560 }}>
                Search for medicines, confirm stock with participating pharmacies, have a pharmacist review prescriptions, and track a verified courier from counter to door.
              </Text>
              <View style={{ flexDirection: 'row', gap: space[3], flexWrap: 'wrap', marginTop: space[2] }}>
                <Button label="Order Medicine" size="lg" icon={Pill} onPress={primaryCta} />
                <Button label="Explore How It Works" size="lg" variant="outline" iconRight={ArrowRight} onPress={() => go('how')} />
              </View>
              <View style={{ flexDirection: 'row', gap: space[6], flexWrap: 'wrap', marginTop: space[4] }}>
                {[
                  ['Pharmacist review', 'for prescription items'],
                  ['35–50 min', 'typical simulated ETA'],
                  ['Clear pricing', 'before you pay'],
                ].map(([a, b]) => (
                  <View key={a}>
                    <Text variant="title">{a}</Text>
                    <Text variant="caption" tone="secondary">
                      {b}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>
            <Animated.View style={{ flex: isDesktop ? 1 : undefined, width: '100%', alignItems: 'center', opacity: fade }}>
              <HeroIllustration />
              <View style={[styles.journey, isMobile && { position: 'relative', marginTop: space[4], left: 0, right: 0, bottom: 0 }]}>
                {[
                  { icon: Store, label: 'Pharmacy confirms' },
                  { icon: Bike, label: 'Courier collects' },
                  { icon: MapPin, label: 'Delivered to you' },
                ].map((s, i) => (
                  <React.Fragment key={s.label}>
                    <View style={{ alignItems: 'center', gap: 4, flex: 1 }}>
                      <View style={[styles.journeyIcon, i === 2 && { backgroundColor: colors.teal }]}>
                        <s.icon size={16} color="#fff" />
                      </View>
                      <Text variant="caption" weight="semibold" align="center">
                        {s.label}
                      </Text>
                    </View>
                    {i < 2 ? <View style={styles.journeyLine} /> : null}
                  </React.Fragment>
                ))}
              </View>
            </Animated.View>
          </Container>
        </View>

        {/* How it works */}
        <View onLayout={(e) => mark('how', e)} style={styles.section}>
          <Container>
            <SectionHeading eyebrow="How MediFly works" title="From search to doorstep in four clear steps" subtitle="Every order stays visible — from pharmacy confirmation to handover." center />
            <View style={styles.grid}>
              {[
                { icon: Search, title: 'Search for medicine', body: 'Find medicines and health products by name or category across participating pharmacies.' },
                { icon: ClipboardCheck, title: 'Pharmacy confirms', body: 'The pharmacy confirms stock and a pharmacist reviews any prescription before supply.' },
                { icon: Truck, title: 'Choose a delivery method', body: 'Our delivery engine shows only eligible options, with the fee and estimated arrival.' },
                { icon: PackageCheck, title: 'Receive your order', body: 'Follow each step, then a verified courier hands the order to you or your recipient.' },
              ].map((s, i) => (
                <View key={s.title} style={cardWidth(cols(4, 2))}>
                  <View style={styles.step}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                      <View style={styles.stepNum}>
                        <Text variant="label" tone="inverse" weight="bold">
                          {i + 1}
                        </Text>
                      </View>
                      <s.icon size={22} color={colors.blue} />
                    </View>
                    <Text variant="h3">{s.title}</Text>
                    <Text variant="bodySm" tone="secondary">
                      {s.body}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Container>
        </View>

        {/* Services */}
        <View onLayout={(e) => mark('services', e)} style={[styles.section, { backgroundColor: colors.background }]}>
          <Container>
            <SectionHeading eyebrow="Services" title="Everything between you and your pharmacy" />
            <View style={styles.grid}>
              {[
                { icon: Store, title: 'Pharmacy discovery', body: 'See nearby participating pharmacies, opening status and confirmed stock.' },
                { icon: Pill, title: 'Medicine ordering', body: 'Order eligible over-the-counter products and clearly marked prescription items.' },
                { icon: FileText, title: 'Prescription submission', body: 'Upload a prescription for pharmacist review. Orders never bypass professional checks.' },
                { icon: Truck, title: 'Doorstep delivery', body: 'Delivery by verified partners, including ordering for a family member at another address.' },
                { icon: MapPin, title: 'Order tracking', body: 'Status updates at every stage, with a clearly labelled simulated route view.', tone: 'teal' as const },
                { icon: Headphones, title: 'Customer support', body: 'Raise an issue on any order and follow the conversation in the app.', tone: 'teal' as const },
              ].map((f) => (
                <View key={f.title} style={cardWidth(cols(3, 2))}>
                  <FeatureCard {...f} />
                </View>
              ))}
            </View>
          </Container>
        </View>

        {/* Delivery options */}
        <View style={styles.section}>
          <Container>
            <SectionHeading eyebrow="Delivery options" title="The right method for each order — explained" subtitle="The Intelligent Delivery Engine checks location, stock, product handling and partner availability, and only offers methods that are available and permitted." />
            <View style={styles.grid}>
              {[
                { icon: Bike, title: 'Motorcycle courier', badge: 'Primary method', tone: 'success' as const, body: 'A practical choice for most urban and peri-urban deliveries in Accra, from verified riders.' },
                { icon: Car, title: 'Vehicle delivery', badge: 'Available', tone: 'info' as const, body: 'For larger orders, longer routes or products needing a cool box or careful handling.' },
                { icon: Drone, title: 'Drone delivery', badge: 'Future · simulated only', tone: 'warning' as const, body: 'Shown only in simulated, eligible scenarios. MediFly has no approved real-world drone operations; any future service would depend on authorised operators and approvals.' },
              ].map((d) => (
                <View key={d.title} style={cardWidth(cols(3, 3))}>
                  <View style={[styles.feature, { minHeight: 230 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={styles.featureIcon}>
                        <d.icon size={22} color={colors.blue} />
                      </View>
                      <Badge label={d.badge} tone={d.tone} size="sm" />
                    </View>
                    <Text variant="h3">{d.title}</Text>
                    <Text variant="bodySm" tone="secondary">
                      {d.body}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.engineCard}>
              <Text variant="overline" uppercase style={{ color: 'rgba(255,255,255,0.6)' }}>
                Example recommendation (simulated)
              </Text>
              <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: space[6], marginTop: space[3] }}>
                {[
                  ['Recommended', 'Motorcycle courier'],
                  ['Estimated arrival', '35–50 min'],
                  ['Delivery fee', 'GH₵12.00'],
                ].map(([k, v]) => (
                  <View key={k}>
                    <Text variant="caption" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {k}
                    </Text>
                    <Text variant="h2" style={{ color: '#fff' }}>
                      {v}
                    </Text>
                  </View>
                ))}
              </View>
              <Text variant="bodySm" style={{ color: 'rgba(255,255,255,0.8)', marginTop: space[3] }}>
                Reason: a suitable motorcycle courier is available within the Madina service area. Drone delivery is not available for this simulated order.
              </Text>
            </View>
          </Container>
        </View>

        {/* Why MediFly */}
        <View onLayout={(e) => mark('about', e)} style={[styles.section, { backgroundColor: colors.background }]}>
          <Container style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space[10] }}>
            <View style={{ flex: 1 }}>
              <SectionHeading eyebrow="Why MediFly" title="Built for people who can’t easily get to a pharmacy" subtitle="Older adults, people with limited mobility, busy workers and caregivers ordering for relatives across Accra." />
              <Text variant="bodySm" tone="secondary" style={{ marginTop: -space[6] }}>
                MediFly is an academic concept for a medicine-ordering and delivery platform. It starts with a focused motorcycle-delivery pilot and verified pharmacies, and does not diagnose, prescribe or replace professional advice.
              </Text>
            </View>
            <View style={[styles.grid, { flex: 1.2 }]}>
              {[
                { icon: CircleCheck, title: 'Convenience', body: 'Order from home or for someone else, with saved addresses and reorder.' },
                { icon: Building2, title: 'Pharmacy connectivity', body: 'Stock confirmed by the pharmacy itself — not a guess from a listing.' },
                { icon: Truck, title: 'Delivery transparency', body: 'Fees, method and ETA shown before you pay; updates at every step.' },
                { icon: Headphones, title: 'Customer support', body: 'Order-linked support tickets with clear status and resolution notes.' },
              ].map((f) => (
                <View key={f.title} style={cardWidth(cols(2, 2))}>
                  <FeatureCard {...f} tone="teal" />
                </View>
              ))}
            </View>
          </Container>
        </View>

        {/* Pharmacy partnership */}
        <View onLayout={(e) => mark('pharmacies', e)} style={styles.section}>
          <Container>
            <View style={[styles.partner, { flexDirection: isDesktop ? 'row' : 'column' }]}>
              <View style={{ flex: 1, gap: space[4] }}>
                <Text variant="overline" uppercase style={{ color: colors.teal }}>
                  For pharmacies
                </Text>
                <Text variant="h1" style={{ color: '#fff' }}>
                  Reach more patients without adding counter staff
                </Text>
                <Text variant="body" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Receive orders in a dedicated portal, confirm stock, review prescriptions, manage inventory and hand over to verified couriers — with reporting on every order.
                </Text>
                <View style={{ flexDirection: 'row', gap: space[3], flexWrap: 'wrap', marginTop: space[2] }}>
                  <Button label="Register interest" variant="teal" size="lg" onPress={() => setPartner(true)} />
                  <Button label="Try the pharmacy demo" variant="inverse" size="lg" onPress={() => router.push('/login')} />
                </View>
              </View>
              <View style={{ flex: 1, gap: space[3] }}>
                {['1. Submit interest and licence details', '2. MediFly verifies the pharmacy (demo verification)', '3. Set up opening hours, inventory and prices', '4. Start receiving orders in your service area'].map((s) => (
                  <View key={s} style={styles.partnerStep}>
                    <CircleCheck size={18} color={colors.teal} />
                    <Text variant="bodySm" style={{ color: '#fff', flex: 1 }}>
                      {s}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Container>
        </View>

        {/* Trust & safety */}
        <View style={[styles.section, { backgroundColor: colors.background }]}>
          <Container>
            <SectionHeading eyebrow="Trust and safety" title="Professional checks stay in the workflow" subtitle="A product appearing in search does not mean it is appropriate for every customer or every delivery method." center />
            <View style={styles.grid}>
              {[
                { icon: BadgeCheck, title: 'Licensed pharmacy participation', body: 'Pharmacies are verified before activation (simulated in this demo).' },
                { icon: Stethoscope, title: 'Pharmacist review', body: 'Prescription-only items cannot be dispatched until a pharmacist approves the review.' },
                { icon: Lock, title: 'Secure information handling', body: 'Collect only what is needed. This demo stores fictional data in your browser only.' },
                { icon: UserCheck, title: 'Delivery partner verification', body: 'Couriers and operators are verified and trained on handling and privacy.' },
              ].map((f) => (
                <View key={f.title} style={cardWidth(cols(4, 2))}>
                  <FeatureCard {...f} />
                </View>
              ))}
            </View>
          </Container>
        </View>

        {/* Testimonials */}
        <View style={styles.section}>
          <Container>
            <SectionHeading eyebrow="What people say" title="Illustrative feedback" subtitle="Fictional testimonials written for this academic demonstration — not real customers." center />
            <View style={styles.grid}>
              {[
                { quote: 'I ordered for my mother in East Legon from my office and saw exactly when the courier collected it.', name: 'Illustrative caregiver', role: 'Demo persona · Madina' },
                { quote: 'The dashboard shows which orders need a prescription check before anything else happens.', name: 'Illustrative pharmacist', role: 'Demo persona · Community pharmacy' },
                { quote: 'Clear pickup details and a confirm-before-delivered step make handovers simple.', name: 'Illustrative courier', role: 'Demo persona · Motorcycle partner' },
              ].map((t) => (
                <View key={t.name} style={cardWidth(cols(3, 3))}>
                  <View style={[styles.feature, { minHeight: 200, justifyContent: 'space-between' }]}>
                    <MessageSquare size={20} color={colors.teal} />
                    <Text variant="body" style={{ fontSize: 16, lineHeight: 26 }}>
                      “{t.quote}”
                    </Text>
                    <View>
                      <Text variant="title">{t.name}</Text>
                      <Text variant="caption" tone="muted">
                        {t.role}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </Container>
        </View>

        {/* Footer */}
        <View onLayout={(e) => mark('contact', e)} style={styles.footer}>
          <Container style={{ gap: space[8] }}>
            <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: space[8], flexWrap: 'wrap' }}>
              <View style={{ flex: 1.4, minWidth: 240, gap: space[3] }}>
                <Logo inverse showTagline />
                <Text variant="bodySm" style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 360 }}>
                  Connecting customers, participating pharmacies and verified delivery partners.
                </Text>
              </View>
              <View style={styles.footerCol}>
                <Text variant="label" style={{ color: '#fff' }}>
                  Navigate
                </Text>
                {NAV.map((n) => (
                  <Pressable key={n.key} onPress={() => go(n.key)} accessibilityRole="link">
                    <Text variant="bodySm" style={styles.footerLink}>
                      {n.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.footerCol}>
                <Text variant="label" style={{ color: '#fff' }}>
                  Contact (fictional)
                </Text>
                {[
                  [Mail, 'hello@medifly.demo'],
                  [Phone, '+233 30 250 0000'],
                  [MapPin, 'Madina, Accra (demo)'],
                ].map(([Icon, t]) => {
                  const I = Icon as LucideIcon;
                  return (
                    <View key={t as string} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <I size={14} color="rgba(255,255,255,0.6)" />
                      <Text variant="bodySm" style={styles.footerLink}>
                        {t as string}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.footerCol}>
                <Text variant="label" style={{ color: '#fff' }}>
                  Social & legal
                </Text>
                {['Instagram (demo)', 'X / Twitter (demo)', 'LinkedIn (demo)'].map((s) => (
                  <View key={s} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Globe size={14} color="rgba(255,255,255,0.6)" />
                    <Text variant="bodySm" style={styles.footerLink}>
                      {s}
                    </Text>
                  </View>
                ))}
                <Text variant="bodySm" style={styles.footerLink}>
                  Terms of use (demo)
                </Text>
                <Text variant="bodySm" style={styles.footerLink}>
                  Privacy notice (demo)
                </Text>
              </View>
            </View>
            <View style={styles.disclaimer}>
              <ShieldCheck size={18} color={colors.teal} />
              <Text variant="bodySm" style={{ color: 'rgba(255,255,255,0.85)', flex: 1 }}>
                {DEMO_DISCLAIMER}
              </Text>
            </View>
            <Text variant="caption" style={{ color: 'rgba(255,255,255,0.5)' }}>
              © {new Date().getFullYear()} MediFly academic demonstration project. Not a licensed healthcare service.
            </Text>
          </Container>
        </View>
      </ScrollView>
      <PartnerForm visible={partner} onClose={() => setPartner(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { backgroundColor: 'rgba(255,255,255,0.97)', borderBottomWidth: 1, borderBottomColor: colors.border, zIndex: 10 },
  navLink: { height: 38, paddingHorizontal: space[3], borderRadius: radius.md, justifyContent: 'center', cursor: 'pointer' } as ViewStyle,
  menuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  mobileMenu: { paddingHorizontal: space[5], paddingBottom: space[5], gap: 2 },
  mobileMenuItem: { height: 48, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  heroBg: { backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border },
  journey: { position: 'absolute', left: '8%', right: '8%', bottom: -18, flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.surface, borderRadius: radius.lg, padding: space[3], borderWidth: 1, borderColor: colors.border, ...shadow.md },
  journeyIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  journeyLine: { height: 2, flex: 0.5, backgroundColor: colors.blueTintStrong, marginTop: 15 },
  section: { paddingVertical: space[20] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space[2] },
  step: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space[5], gap: space[3], height: '100%' },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  feature: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space[6], gap: space[3], height: '100%' },
  featureIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' },
  engineCard: { marginTop: space[6], backgroundColor: colors.navy, borderRadius: radius.xl, padding: space[8] },
  partner: { backgroundColor: colors.navy, borderRadius: radius.xl, padding: space[10], gap: space[10] },
  partnerStep: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4], borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.07)' },
  footer: { backgroundColor: colors.navyDeep, paddingVertical: space[16] },
  footerCol: { flex: 1, minWidth: 160, gap: space[3] },
  footerLink: { color: 'rgba(255,255,255,0.7)' },
  disclaimer: { flexDirection: 'row', gap: space[3], padding: space[5], borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
});
