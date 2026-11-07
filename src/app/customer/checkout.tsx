import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  CreditCard,
  FileText,
  Info,
  Lock,
  MapPin,
  PartyPopper,
  ShoppingCart,
  Smartphone,
  Store,
  Upload,
} from '@/components/ui/icons';
import { colors, radius, space } from '@/theme';
import { useCustomer } from '@/hooks/useCustomer';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAction } from '@/hooks/useAction';
import { useToast } from '@/contexts/ToastContext';
import { useResource } from '@/hooks/useResource';
import { pharmacyService } from '@/services/pharmacyService';
import { deliveryRecommendationService } from '@/services/deliveryRecommendationService';
import { orderService } from '@/services/orderService';
import { userService } from '@/services/userService';
import { getErrorMessage } from '@/services/api';
import { DELIVERY_METHOD_LABEL, PAYMENT_METHOD_LABEL } from '@/constants/catalog';
import { PRESCRIPTION_STATUS } from '@/constants/status';
import { formatEta, formatGHS, formatKm, formatRelative } from '@/utils/format';
import type { DeliveryAddress, DeliveryMethod, DeliveryRecommendation, Order, PaymentMethod, Prescription } from '@/types';
import { Badge, Button, Callout, Card, CardHeader, Checkbox, EmptyState, FileUpload, Input, KeyValue, LoadingState, OptionCard, PageHeader, StatusBadge, Text, type PickedFile } from '@/components/ui';
import { Page } from '@/components/layout/AppShell';
import { AddressForm, type AddressValues } from '@/components/shared/AddressForm';
import { MethodIcon } from '@/components/illustrations';
import { submitPrescriptionFile } from '@/components/shared/prescriptionUpload';

const STEPS = ['Address', 'Pharmacy', 'Delivery', 'Payment', 'Review'];

function Stepper({ step }: { step: number }) {
  const { isMobile } = useBreakpoint();
  return (
    <View style={styles.stepper} accessibilityLabel={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
      {STEPS.map((s, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <React.Fragment key={s}>
            <View style={{ alignItems: 'center', gap: 4, flexDirection: isMobile ? 'column' : 'row' }}>
              <View style={[styles.stepDot, done && { backgroundColor: colors.teal, borderColor: colors.teal }, current && { borderColor: colors.blue, backgroundColor: colors.blue }]}>
                {done ? <Check size={13} color="#fff" strokeWidth={3} /> : <Text style={{ color: current ? '#fff' : colors.textSecondary, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>{i + 1}</Text>}
              </View>
              {!isMobile || current ? (
                <Text variant="label" tone={current ? 'navy' : done ? 'default' : 'muted'} weight={current ? 'semibold' : 'medium'}>
                  {s}
                </Text>
              ) : null}
            </View>
            {i < STEPS.length - 1 ? <View style={[styles.stepLine, done && { backgroundColor: colors.teal }]} /> : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default function Checkout() {
  const params = useLocalSearchParams<{ pharmacy?: string }>();
  const { db, user, addresses, selected: defaultAddress, cart } = useCustomer();
  const { isDesktop } = useBreakpoint();
  const toast = useToast();
  const { run, loading: actionLoading } = useAction();

  const group = cart.find((g) => g.pharmacyId === params.pharmacy) ?? cart[0];
  const pharmacy = db.pharmacies.find((p) => p.id === group?.pharmacyId);

  const [step, setStep] = useState(0);
  const [addressMode, setAddressMode] = useState<'saved' | 'new'>(addresses.length ? 'saved' : 'new');
  const [addressId, setAddressId] = useState<string | undefined>(defaultAddress?.id);
  const [newAddress, setNewAddress] = useState<DeliveryAddress | null>(null);
  const [rxId, setRxId] = useState<string | undefined>();
  const [rxFile, setRxFile] = useState<PickedFile | null>(null);
  const [rxPatient, setRxPatient] = useState('');
  const [rxError, setRxError] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [chosenMethod, setMethod] = useState<DeliveryMethod | undefined>();
  const [showChecks, setShowChecks] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('mobile-money');
  const [network, setNetwork] = useState('MTN MoMo');
  const [simulateDecline, setSimulateDecline] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<Order | null>(null);

  const savedAddress = addresses.find((a) => a.id === addressId);
  const address: DeliveryAddress | null = addressMode === 'saved' && savedAddress ? { recipientName: savedAddress.recipientName, phone: savedAddress.phone, region: savedAddress.region, city: savedAddress.city, serviceAreaId: savedAddress.serviceAreaId, area: savedAddress.area, landmark: savedAddress.landmark, instructions: savedAddress.instructions } : addressMode === 'new' ? newAddress : null;
  const area = db.serviceAreas.find((a) => a.id === address?.serviceAreaId);
  const items = useMemo(() => group?.lines.map((l) => ({ productId: l.product.id, quantity: l.item.quantity })) ?? [], [group]);
  const eligibleRx = db.prescriptions.filter((p) => p.customerId === user?.id && p.pharmacyId === group?.pharmacyId && !p.orderId && (p.status === 'pending' || p.status === 'approved'));
  const chosenRx = db.prescriptions.find((p) => p.id === rxId);
  const itemsKey = JSON.stringify(items);

  // Step 2: live stock confirmation per item (re-checked if the cart changes).
  const stockRes = useResource<{ name: string; ok: boolean; message: string }[]>(step === 1 && group ? `stock:${group.pharmacyId}:${itemsKey}` : null, () =>
    Promise.all(group!.lines.map((l) => pharmacyService.checkAvailability(l.product.id, group!.pharmacyId, l.item.quantity).then((r) => ({ name: l.product.name, ok: r.available, message: r.message }))))
  );
  const stock = stockRes.data ?? null;

  // Step 3+: Intelligent Delivery Engine recommendation for this address and basket.
  const recRes = useResource<DeliveryRecommendation>(step >= 2 && group && address ? `rec:${group.pharmacyId}:${address.serviceAreaId}:${itemsKey}` : null, () =>
    deliveryRecommendationService.recommend({ serviceAreaId: address!.serviceAreaId, pharmacyId: group!.pharmacyId, items })
  );
  const rec = recRes.data ?? null;
  // Keep the customer's choice while it stays eligible; otherwise fall back to the recommendation.
  const method = chosenMethod && rec?.evaluations.find((e) => e.method === chosenMethod)?.eligible ? chosenMethod : rec?.recommended?.method;
  const evaluation = rec?.evaluations.find((e) => e.method === method);
  const total = (group?.subtotal ?? 0) + (evaluation?.fee ?? 0);

  if (placed) return <Confirmation order={placed} />;

  if (!group || !pharmacy) {
    return (
      <Page maxWidth={720}>
        <EmptyState icon={ShoppingCart} title="Nothing to check out" message="Your cart is empty." action={<Button label="Browse products" onPress={() => router.replace('/customer/search')} />} />
      </Page>
    );
  }

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => (step === 0 ? router.back() : setStep((s) => s - 1));
  const stockOk = !!stock && stock.every((s) => s.ok);
  const rxOk = !group.requiresPrescription || !!chosenRx;
  const canContinue = [!!address && !!area?.active, stockOk && rxOk, !!evaluation?.eligible, payMethod !== 'cash-on-delivery' || db.settings.cashOnDeliveryEnabled, true][step];

  const uploadRx = async () => {
    if (!rxFile) return setRxError('Choose a file to upload.');
    if (rxPatient.trim().length < 2) return setRxError('Enter the patient name as shown on the prescription.');
    setRxError(undefined);
    setUploading(true);
    try {
      const rx = await submitPrescriptionFile(group.pharmacyId, rxFile, rxPatient);
      setRxId(rx.id);
      setRxFile(null);
      toast.show({ tone: 'success', title: 'Prescription submitted', message: 'A pharmacist will review it after you place the order.' });
    } catch (e) {
      setRxError(getErrorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const placeOrder = async () => {
    if (!address || !method || !user) return;
    setPlacing(true);
    try {
      const order = await orderService.createOrder({
        customerId: user.id,
        pharmacyId: group.pharmacyId,
        items,
        address,
        deliveryMethod: method,
        paymentMethod: payMethod,
        paymentMethodDetail: payMethod === 'mobile-money' ? `${network} (simulated)` : payMethod === 'card' ? 'Test card (simulated)' : 'Pay courier on delivery',
        prescriptionId: group.requiresPrescription ? rxId : undefined,
        payment: { simulateDecline },
      });
      setPlaced(order);
    } catch (e) {
      toast.show({ tone: 'danger', title: 'Order not placed', message: getErrorMessage(e) });
    } finally {
      setPlacing(false);
    }
  };

  const summary = (
    <Card style={{ gap: space[3] }}>
      <Text variant="h3">Order summary</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Store size={16} color={colors.textMuted} />
        <Text variant="bodySm" weight="semibold">
          {pharmacy.name}
        </Text>
      </View>
      {group.lines.map((l) => (
        <View key={l.product.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[3] }}>
          <Text variant="bodySm" style={{ flex: 1 }} numberOfLines={2}>
            {l.item.quantity} × {l.product.name} {l.product.strength ?? ''}
          </Text>
          <Text variant="bodySm" tabular>
            {formatGHS(l.lineTotal)}
          </Text>
        </View>
      ))}
      <View>
        <KeyValue label="Medicine subtotal" value={formatGHS(group.subtotal)} />
        <KeyValue label="Delivery fee" value={evaluation ? formatGHS(evaluation.fee) : 'Calculated at step 3'} />
        <KeyValue label="Total" value={formatGHS(total)} strong />
      </View>
      {address ? (
        <Text variant="caption" tone="secondary">
          To {address.recipientName}, {address.area}, {area?.name}
        </Text>
      ) : null}
    </Card>
  );

  return (
    <View style={{ flex: 1 }}>
    <Page maxWidth={1120}>
      <PageHeader title="Checkout" subtitle={`Order from ${pharmacy.name}`} breadcrumbs={[{ label: 'Cart', href: '/customer/cart' }, { label: 'Checkout' }]} />
      <Stepper step={step} />
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space[6], marginTop: space[6] }}>
        <View style={{ flex: 2, gap: space[5], minWidth: 0 }}>
          {/* STEP 1 — Address */}
          {step === 0 ? (
            <Card style={{ gap: space[4] }}>
              <CardHeader title="Delivery address" subtitle="Where should we deliver? You can order for a family member at another address." icon={MapPin} />
              {addresses.length ? (
                <View style={{ flexDirection: 'row', gap: space[2] }}>
                  <Button label="Saved address" variant={addressMode === 'saved' ? 'primary' : 'outline'} size="sm" onPress={() => setAddressMode('saved')} />
                  <Button label="New address" variant={addressMode === 'new' ? 'primary' : 'outline'} size="sm" onPress={() => setAddressMode('new')} />
                </View>
              ) : null}
              {addressMode === 'saved' ? (
                <View style={{ gap: space[2] }} accessibilityRole="radiogroup">
                  {addresses.map((a) => {
                    const sa = db.serviceAreas.find((s) => s.id === a.serviceAreaId);
                    return (
                      <OptionCard
                        key={a.id}
                        selected={a.id === addressId}
                        onPress={() => setAddressId(a.id)}
                        icon={MapPin}
                        title={`${a.label} · ${sa?.name}`}
                        description={`${a.recipientName} · ${a.phone}\n${a.area} · ${a.landmark}${a.instructions ? `\n“${a.instructions}”` : ''}`}
                        badge={!sa?.active ? <Badge label="Not served" tone="danger" size="sm" /> : a.isDefault ? <Badge label="Default" size="sm" /> : undefined}
                        disabled={!sa?.active}
                      />
                    );
                  })}
                </View>
              ) : newAddress ? (
                <Callout tone="success" icon={CircleCheck} title="Using new address">
                  {`${newAddress.recipientName} · ${newAddress.phone}\n${newAddress.area}, ${area?.name} · ${newAddress.landmark}`}
                </Callout>
              ) : (
                <AddressForm
                  submitLabel="Use this address"
                  onSubmit={async (v: AddressValues) => {
                    setNewAddress({ recipientName: v.recipientName, phone: v.phone, region: v.region, city: v.city, serviceAreaId: v.serviceAreaId, area: v.area, landmark: v.landmark, instructions: v.instructions });
                    // Also save to the address book for next time.
                    await run(() => userService.saveAddress({ ...v, isDefault: v.isDefault ?? false }), { success: 'Address saved to your profile' });
                  }}
                />
              )}
              {addressMode === 'new' && newAddress ? <Button label="Edit address" variant="ghost" size="sm" onPress={() => setNewAddress(null)} style={{ alignSelf: 'flex-start' }} /> : null}
              {area && !area.active ? <Callout tone="danger">{area.name} is not an active service area yet.</Callout> : null}
            </Card>
          ) : null}

          {/* STEP 2 — Pharmacy confirmation */}
          {step === 1 ? (
            <>
              <Card style={{ gap: space[4] }}>
                <CardHeader title="Pharmacy confirmation" subtitle={`${pharmacy.address} · ${pharmacy.landmark}`} icon={ClipboardCheck} />
                <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
                  <Badge label={`Prep ~${pharmacy.prepMinutes} min`} tone="info" size="sm" />
                  <Badge label="Licensed pharmacy (demo verification)" tone="success" size="sm" />
                </View>
                {stock == null ? (
                  <LoadingState rows={group.lines.length} card={false} />
                ) : (
                  <View style={{ gap: space[2] }}>
                    {stock.map((s) => (
                      <View key={s.name} style={styles.stockRow}>
                        {s.ok ? <CircleCheck size={18} color={colors.success} /> : <CircleX size={18} color={colors.danger} />}
                        <Text variant="bodySm" weight="medium" style={{ flex: 1 }}>
                          {s.name}
                        </Text>
                        <Text variant="caption" tone={s.ok ? 'secondary' : 'danger'}>
                          {s.message}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                <Callout tone="info" icon={Info}>
                  Listed stock is checked now. The pharmacy confirms final availability once you place the order — you will be notified at each step.
                </Callout>
                {stock && !stockOk ? <Button label="Return to cart" variant="outline" onPress={() => router.replace('/customer/cart')} /> : null}
              </Card>
              {group.requiresPrescription ? (
                <Card style={{ gap: space[4] }}>
                  <CardHeader title="Prescription" subtitle="Required for prescription-only items in this order." icon={FileText} />
                  {eligibleRx.length ? (
                    <View style={{ gap: space[2] }}>
                      <Text variant="label">Use a prescription you already submitted to {pharmacy.name}</Text>
                      {eligibleRx.map((p: Prescription) => (
                        <OptionCard key={p.id} selected={rxId === p.id} onPress={() => setRxId(p.id)} icon={FileText} title={p.fileName} description={`Patient: ${p.patientName} · submitted ${formatRelative(p.submittedAt)}`} badge={<StatusBadge meta={PRESCRIPTION_STATUS[p.status]} size="sm" />} />
                      ))}
                    </View>
                  ) : null}
                  <Text variant="label">{eligibleRx.length ? 'Or upload a new prescription' : 'Upload your prescription'}</Text>
                  <FileUpload value={rxFile} onChange={setRxFile} onError={setRxError} error={undefined} />
                  <Input label="Patient name (as on prescription)" value={rxPatient} onChangeText={setRxPatient} placeholder={user?.name} />
                  {rxError ? <Callout tone="danger">{rxError}</Callout> : null}
                  <Button label="Submit prescription" icon={Upload} variant="secondary" loading={uploading} disabled={!rxFile} onPress={uploadRx} style={{ alignSelf: 'flex-start' }} />
                  <Callout tone="warning" icon={Lock} title="Demo files only">
                    Use fictional sample files. Files stay in this browser’s demo storage — this is not a secure medical records system.
                  </Callout>
                  {chosenRx ? (
                    <Callout tone={chosenRx.status === 'approved' ? 'success' : 'violet'} icon={CircleCheck} title={`Attached: ${chosenRx.fileName}`}>
                      {chosenRx.status === 'approved' ? 'Previously approved by this pharmacy (demo review).' : 'A pharmacist will review this prescription before your order is prepared.'}
                    </Callout>
                  ) : null}
                </Card>
              ) : null}
            </>
          ) : null}

          {/* STEP 3 — Delivery */}
          {step === 2 ? (
            <Card style={{ gap: space[4] }}>
              <CardHeader title="Delivery method" subtitle="Recommended by the Intelligent Delivery Engine. Only eligible methods can be selected." />
              {rec == null ? (
                <LoadingState rows={3} card={false} />
              ) : (
                <>
                  {rec.recommended ? (
                    <View style={styles.recBox}>
                      <Text variant="overline" uppercase tone="teal">
                        Recommendation
                      </Text>
                      <Text variant="bodySm">{rec.explanation}</Text>
                    </View>
                  ) : (
                    <Callout tone="danger">{rec.explanation}</Callout>
                  )}
                  <View style={{ gap: space[2] }} accessibilityRole="radiogroup">
                    {[...(rec.recommended ? [rec.recommended] : []), ...rec.alternatives].map((e) => (
                      <OptionCard
                        key={e.method}
                        selected={method === e.method}
                        onPress={() => setMethod(e.method)}
                        title={DELIVERY_METHOD_LABEL[e.method]}
                        description={`${formatEta(e.etaMinutes)} · ${formatKm(e.distanceKm)}${e.notes.length ? `\n${e.notes.join(' ')}` : ''}`}
                        badge={
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {e === rec.recommended ? <Badge label="Recommended" tone="teal" size="sm" /> : null}
                            {e.simulated ? <Badge label="Simulation" tone="warning" size="sm" /> : null}
                          </View>
                        }
                        right={
                          <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            <MethodIcon method={e.method} size={20} />
                            <Text variant="title" tabular>
                              {formatGHS(e.fee)}
                            </Text>
                          </View>
                        }
                      />
                    ))}
                  </View>
                  {rec.excluded.length ? (
                    <View style={{ gap: space[2] }}>
                      <Text variant="label" tone="secondary">
                        Not available for this order
                      </Text>
                      {rec.excluded.map((e) => (
                        <View key={e.method} style={styles.excluded}>
                          <MethodIcon method={e.method} size={18} color={colors.textMuted} />
                          <View style={{ flex: 1 }}>
                            <Text variant="bodySm" weight="medium" tone="secondary">
                              {DELIVERY_METHOD_LABEL[e.method]}
                            </Text>
                            {e.exclusions.map((x) => (
                              <Text key={x} variant="caption" tone="muted">
                                • {x}
                              </Text>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <View style={{ gap: 6 }}>
                    <Button label={showChecks ? 'Hide what the engine checked' : 'Show what the engine checked'} variant="ghost" size="sm" onPress={() => setShowChecks(!showChecks)} style={{ alignSelf: 'flex-start' }} />
                    {showChecks && rec.checks.map((c) => (
                      <View key={c.label} style={{ flexDirection: 'row', gap: space[2], alignItems: 'flex-start' }}>
                        {c.passed ? <CircleCheck size={15} color={colors.success} style={{ marginTop: 2 }} /> : <CircleX size={15} color={colors.danger} style={{ marginTop: 2 }} />}
                        <Text variant="caption" style={{ flex: 1 }}>
                          <Text variant="caption" weight="semibold">
                            {c.label}:{' '}
                          </Text>
                          {c.detail}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </Card>
          ) : null}

          {/* STEP 4 — Payment */}
          {step === 3 ? (
            <Card style={{ gap: space[4] }}>
              <CardHeader title="Payment" subtitle="Simulated payment — no real money is taken." icon={Lock} />
              <View style={{ gap: space[2] }} accessibilityRole="radiogroup">
                <OptionCard selected={payMethod === 'mobile-money'} onPress={() => setPayMethod('mobile-money')} icon={Smartphone} title="Mobile Money" description="Simulated approval. You will not be asked for a PIN." badge={<Badge label="Simulated" tone="warning" size="sm" />} />
                {payMethod === 'mobile-money' ? (
                  <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap', paddingLeft: space[2] }}>
                    {['MTN MoMo', 'Telecel Cash', 'AT Money'].map((n) => (
                      <Button key={n} label={n} size="sm" variant={network === n ? 'secondary' : 'outline'} onPress={() => setNetwork(n)} />
                    ))}
                  </View>
                ) : null}
                <OptionCard selected={payMethod === 'card'} onPress={() => setPayMethod('card')} icon={CreditCard} title="Bank card" description="Simulated approval. No card number is requested or stored." badge={<Badge label="Simulated" tone="warning" size="sm" />} />
                <OptionCard selected={payMethod === 'cash-on-delivery'} onPress={() => setPayMethod('cash-on-delivery')} icon={Banknote} title="Cash on delivery" description={db.settings.cashOnDeliveryEnabled ? 'Pay the courier at handover.' : 'Currently disabled by MediFly operations.'} disabled={!db.settings.cashOnDeliveryEnabled} />
              </View>
              <Callout tone="info" icon={Lock}>
                MediFly never asks for card numbers, Mobile Money PINs or other payment credentials in this demo. A real service would hand off to a licensed payment provider.
              </Callout>
              {payMethod !== 'cash-on-delivery' ? <Checkbox checked={simulateDecline} onChange={setSimulateDecline} label="Rehearse a declined payment" description="Demo option: the simulated provider will decline, and no order is created." /> : null}
            </Card>
          ) : null}

          {/* STEP 5 — Review */}
          {step === 4 && address && evaluation ? (
            <Card style={{ gap: space[4] }}>
              <CardHeader title="Review and place order" subtitle="Check everything before confirming." icon={ClipboardCheck} />
              <KeyValue label="Pharmacy" value={pharmacy.name} />
              <KeyValue label="Deliver to" value={`${address.recipientName} · ${address.phone}`} />
              <KeyValue label="Address" value={`${address.area}, ${area?.name} · ${address.landmark}`} />
              <KeyValue label="Delivery method" value={`${DELIVERY_METHOD_LABEL[evaluation.method]} · ${formatEta(evaluation.etaMinutes)}`} />
              <KeyValue label="Payment" value={payMethod === 'mobile-money' ? `${network} (simulated)` : PAYMENT_METHOD_LABEL[payMethod]} />
              {group.requiresPrescription ? <KeyValue label="Prescription" value={chosenRx ? `${chosenRx.fileName} · ${PRESCRIPTION_STATUS[chosenRx.status].label}` : '—'} /> : null}
              <KeyValue label="Medicine subtotal" value={formatGHS(group.subtotal)} />
              <KeyValue label="Delivery fee" value={formatGHS(evaluation.fee)} />
              <KeyValue label="Total" value={formatGHS(total)} strong />
              <Text variant="caption" tone="secondary">
                You can cancel free of charge until the pharmacy starts preparing your order. Prescription items are supplied only after pharmacist approval. Support: {db.settings.supportPhone}.
              </Text>
              <Button label={payMethod === 'cash-on-delivery' ? `Place order · ${formatGHS(total)}` : `Pay ${formatGHS(total)} (simulated) & place order`} size="lg" icon={Lock} loading={placing} onPress={placeOrder} fullWidth />
            </Card>
          ) : null}

        </View>
        <View style={{ flex: 1 }}>{summary}</View>
      </View>
    </Page>
    {/* Always-visible step navigation, so Continue never sits below the fold. */}
    <View style={styles.actionBar}>
      <View style={[styles.actionInner, { maxWidth: 1120 }]}>
        <Button label={step === 0 ? 'Back to cart' : 'Back'} icon={ArrowLeft} variant="outline" onPress={back} />
        <View style={{ flex: 1, alignItems: 'flex-end', minWidth: 0 }}>
          <Text variant="caption" tone="secondary">
            {evaluation ? 'Total' : 'Subtotal'}
          </Text>
          <Text variant="title" tabular>
            {formatGHS(total)}
          </Text>
        </View>
        {step < 4 ? (
          <Button label={isDesktop ? `Continue to ${STEPS[step + 1]}` : 'Continue'} iconRight={ArrowRight} onPress={next} disabled={!canContinue || actionLoading} />
        ) : (
          <Button label={payMethod === 'cash-on-delivery' ? 'Place order' : 'Pay & place order'} icon={Lock} loading={placing} onPress={placeOrder} disabled={!evaluation} />
        )}
      </View>
    </View>
    </View>
  );
}

function Confirmation({ order }: { order: Order }) {
  return (
    <Page maxWidth={720}>
      <Card style={{ alignItems: 'center', gap: space[4], paddingVertical: space[10] }}>
        <View style={styles.successIcon}>
          <PartyPopper size={30} color={colors.success} />
        </View>
        <Text variant="h1" align="center">
          Order placed
        </Text>
        <Text variant="body" tone="secondary" align="center" style={{ maxWidth: 480 }}>
          Your order reference is <Text variant="body" weight="bold">{order.reference}</Text>. It has been sent to the pharmacy for stock confirmation.
        </Text>
        <View style={{ alignSelf: 'stretch', maxWidth: 480, width: '100%', alignItems: 'stretch', gap: space[2] }}>
          <KeyValue label="Total" value={formatGHS(order.total)} strong />
          <KeyValue label="Payment" value={order.paymentStatus === 'paid' ? 'Paid (simulated)' : 'Cash on delivery'} />
          <KeyValue label="Delivery" value={`${DELIVERY_METHOD_LABEL[order.deliveryMethod]} · ${formatEta(order.etaMinutes)}`} />
        </View>
        {order.requiresPrescription && order.prescriptionStatus !== 'approved' ? <Callout tone="violet" icon={FileText}>A pharmacist will review your prescription before the order is prepared.</Callout> : null}
        <View style={{ flexDirection: 'row', gap: space[3], flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button label="Track order" iconRight={ArrowRight} onPress={() => router.replace(`/customer/orders/${order.id}` as never)} />
          <Button label="Continue shopping" variant="outline" onPress={() => router.replace('/customer/search')} />
        </View>
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space[4], gap: space[2] },
  stepDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border, minWidth: 8 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  recBox: { padding: space[4], borderRadius: radius.lg, backgroundColor: colors.tealTint, gap: 4 },
  excluded: { flexDirection: 'row', gap: space[3], padding: space[3], borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
  actionBar: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: space[4], paddingVertical: space[3], boxShadow: '0 -4px 14px rgba(21,59,86,0.06)' } as object,
  actionInner: { width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: space[3] },
  successIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.successTint, alignItems: 'center', justifyContent: 'center' },
});
