/**
 * app/subscription/index.tsx
 * Manage Subscription screen — Rejuuv mobile app.
 *
 * Data sources (all server-side, Rejuuv-only — OdysseyOS is never surfaced):
 *   GET  /api/subscriptions          → current plan
 *   POST /api/subscriptions/checkout → Stripe Checkout URL
 *   POST /api/subscriptions/cancel   → schedule cancellation at period end
 *   GET  /api/subscriptions/invoices → billing history
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { subscriptionApi } from '../../lib/api-client';
import type { Subscription, Invoice } from '../../lib/types';

// ─── Palette (matches the rest of the Rejuuv app) ─────────────────────────────

const C = {
  bg: '#f3f4f6',
  white: '#ffffff',
  primary: '#2563eb',
  primaryLight: '#eff6ff',
  primaryDark: '#1e40af',
  textDark: '#111827',
  textMid: '#374151',
  textLight: '#6b7280',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  divider: '#f3f4f6',
  green: '#166534',
  greenBg: '#dcfce7',
  red: '#991b1b',
  redBg: '#fef2f2',
  redBorder: '#ef4444',
  orange: '#9a3412',
  orangeBg: '#fff7ed',
  orangeBorder: '#f97316',
  yellow: '#713f12',
  yellowBg: '#fefce8',
  yellowBorder: '#eab308',
  amberText: '#92400e',
  amberBg: '#fef3c7',
  gray: '#6b7280',
  grayBg: '#f3f4f6',
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Formats a Stripe amount-in-cents to a currency string, e.g. 1900 → "$19.00" */
function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

// ─── Status helpers ────────────────────────────────────────────────────────────

type StatusChip = { label: string; bg: string; text: string };

/** Returns badge colours and label for a subscription's status. */
function subscriptionStatusChip(sub: Subscription): StatusChip {
  // Pending cancellation takes visual priority over the raw status.
  if (sub.cancel_at_period_end) {
    return { label: 'Canceling', bg: C.amberBg, text: C.amberText };
  }
  switch (sub.status) {
    case 'active':             return { label: 'Active',   bg: C.greenBg,  text: C.green };
    case 'trialing':           return { label: 'Trial',    bg: C.primaryLight, text: C.primaryDark };
    case 'past_due':           return { label: 'Past Due', bg: C.orangeBg, text: C.orange };
    case 'canceled':           return { label: 'Canceled', bg: C.grayBg,   text: C.gray };
    case 'unpaid':             return { label: 'Unpaid',   bg: C.redBg,    text: C.red };
    case 'incomplete':         return { label: 'Incomplete', bg: C.orangeBg, text: C.orange };
    case 'incomplete_expired': return { label: 'Expired',  bg: C.grayBg,   text: C.gray };
    default:                   return { label: sub.status, bg: C.grayBg,   text: C.gray };
  }
}

type InvoiceChip = { label: string; color: string };

/** Returns colour and label for an invoice status dot. */
function invoiceStatusChip(status: Invoice['status']): InvoiceChip {
  switch (status) {
    case 'paid':          return { label: 'Paid',    color: C.green };
    case 'open':          return { label: 'Open',    color: C.orange };
    case 'draft':         return { label: 'Draft',   color: C.gray };
    case 'uncollectible': return { label: 'Failed',  color: C.red };
    case 'void':          return { label: 'Void',    color: C.gray };
    default:              return { label: 'Unknown', color: C.gray };
  }
}

// ─── ActivePlanCard ────────────────────────────────────────────────────────────

interface ActivePlanCardProps {
  subscription: Subscription;
  onManage: () => void;
  onCancel: () => void;
  managing: boolean;
  canceling: boolean;
}

function ActivePlanCard({
  subscription: sub,
  onManage,
  onCancel,
  managing,
  canceling,
}: ActivePlanCardProps) {
  const chip = subscriptionStatusChip(sub);
  const isLive = sub.status === 'active' || sub.status === 'trialing';
  const busy = managing || canceling;

  return (
    <View style={styles.card}>
      {/* Plan name + status badge */}
      <View style={styles.cardHeader}>
        <Text style={styles.planName}>{sub.planName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: chip.bg }]}>
          <Text style={[styles.statusBadgeText, { color: chip.text }]}>
            {chip.label}
          </Text>
        </View>
      </View>

      {/* Billing interval — uses backend's pre-formatted display string */}
      {sub.billing_info?.display ? (
        <Text style={styles.planPrice}>{sub.billing_info.display}</Text>
      ) : null}

      {/* Renewal / access-expiry row */}
      {sub.cancel_at_period_end ? (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Access until</Text>
          <Text style={[styles.infoValue, { color: C.amberText }]}>
            {formatDate(sub.current_period_end)}
          </Text>
        </View>
      ) : isLive ? (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Renews</Text>
          <Text style={styles.infoValue}>{formatDate(sub.current_period_end)}</Text>
        </View>
      ) : null}

      {/* Hard cancellation date (already fully canceled) */}
      {sub.canceled_at && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Canceled on</Text>
          <Text style={styles.infoValue}>{formatDate(sub.canceled_at)}</Text>
        </View>
      )}

      {/* Past-due payment warning */}
      {sub.status === 'past_due' && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ Payment failed — please update your payment method to keep access.
          </Text>
        </View>
      )}

      {/* Scheduled-cancellation notice */}
      {sub.cancel_at_period_end && (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            Your subscription will not renew. You keep Pro access until{' '}
            <Text style={{ fontWeight: '700' }}>
              {formatDate(sub.current_period_end)}
            </Text>
            .
          </Text>
        </View>
      )}

      {/* Action buttons — only shown on manageable, non-canceling subscriptions */}
      {isLive && !sub.cancel_at_period_end && (
        <View style={styles.actionRow}>
          {/* Change Plan → opens Stripe Checkout via WebBrowser */}
          <TouchableOpacity
            style={[styles.outlineBtn, styles.primaryOutlineBtn, busy && styles.btnDisabled]}
            onPress={onManage}
            disabled={busy}
            activeOpacity={0.75}
          >
            {managing ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <Text style={[styles.outlineBtnText, { color: C.primary }]}>
                Change Plan
              </Text>
            )}
          </TouchableOpacity>

          {/* Cancel → confirm dialog → POST /api/subscriptions/cancel */}
          <TouchableOpacity
            style={[styles.outlineBtn, styles.dangerOutlineBtn, busy && styles.btnDisabled]}
            onPress={onCancel}
            disabled={busy}
            activeOpacity={0.75}
          >
            {canceling ? (
              <ActivityIndicator size="small" color={C.redBorder} />
            ) : (
              <Text style={[styles.outlineBtnText, { color: C.redBorder }]}>
                Cancel
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── FreePlanCard ──────────────────────────────────────────────────────────────

interface FreePlanCardProps {
  onUpgrade: () => void;
  upgrading: boolean;
}

function FreePlanCard({ onUpgrade, upgrading }: FreePlanCardProps) {
  return (
    <>
      {/* Current plan summary */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.planName}>Rejuuv Free</Text>
          <View style={[styles.statusBadge, { backgroundColor: C.grayBg }]}>
            <Text style={[styles.statusBadgeText, { color: C.gray }]}>
              Current plan
            </Text>
          </View>
        </View>
        <Text style={styles.planPrice}>Free</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Includes</Text>
          <Text style={styles.infoValue}>1 recovery plan</Text>
        </View>
      </View>

      {/* Pro upgrade CTA */}
      <View style={[styles.card, styles.upgradeCard]}>
        <View style={styles.upgradeHeader}>
          <Text style={styles.upgradeEmoji}>💎</Text>
          <View>
            <Text style={styles.upgradeTitle}>Rejuuv Pro</Text>
            <Text style={styles.upgradeSubtitle}>$19 / month</Text>
          </View>
        </View>

        <View style={styles.featureList}>
          {[
            'Unlimited recovery plan generation',
            'Unlimited daily check-ins',
            'Personalised AI adjustments',
            'Full plan history',
          ].map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.upgradeBtn, upgrading && styles.btnDisabled]}
          onPress={onUpgrade}
          disabled={upgrading}
          activeOpacity={0.85}
        >
          {upgrading ? (
            <ActivityIndicator size="small" color={C.white} />
          ) : (
            <Text style={styles.upgradeBtnText}>Upgrade to Pro →</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

// ─── InvoiceRow ────────────────────────────────────────────────────────────────

interface InvoiceRowProps {
  invoice: Invoice;
  onViewPdf: (url: string) => void;
}

function InvoiceRow({ invoice, onViewPdf }: InvoiceRowProps) {
  const { label, color } = invoiceStatusChip(invoice.status);

  return (
    <View style={styles.invoiceRow}>
      {/* Left: invoice number + billing period */}
      <View style={styles.invoiceLeft}>
        <Text style={styles.invoiceNumber}>
          {invoice.invoice_number ?? formatShortDate(invoice.created)}
        </Text>
        <Text style={styles.invoicePeriod}>
          {formatShortDate(invoice.period_start)}
          {' – '}
          {formatShortDate(invoice.period_end)}
        </Text>
      </View>

      {/* Right: amount, status chip, PDF link */}
      <View style={styles.invoiceRight}>
        {/* `invoice.amount` is the display amount pre-calculated by the backend */}
        <Text style={styles.invoiceAmount}>
          {formatCurrency(invoice.amount, invoice.currency)}
        </Text>

        <View style={styles.invoiceStatusRow}>
          <View style={[styles.invoiceDot, { backgroundColor: color }]} />
          <Text style={[styles.invoiceStatusText, { color }]}>{label}</Text>

          {/* pdf_link is the best available URL (invoice_pdf → hosted_invoice_url) */}
          {invoice.pdf_link && (
            <TouchableOpacity
              onPress={() => onViewPdf(invoice.pdf_link!)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.pdfLink}>PDF</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── ManageSubscriptionScreen ──────────────────────────────────────────────────

export default function ManageSubscriptionScreen() {
  const router = useRouter();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-action loading flags so each button shows its own spinner.
  const [upgrading, setUpgrading] = useState(false);
  const [managing, setManaging] = useState(false);
  const [canceling, setCanceling] = useState(false);

  /**
   * Pick the single most-relevant subscription to display:
   * active/trialing → past_due → cancel_at_period_end pending → null (free).
   */
  const activeSubscription =
    subscriptions.find((s) => s.status === 'active' || s.status === 'trialing') ??
    subscriptions.find((s) => s.status === 'past_due') ??
    subscriptions.find((s) => s.cancel_at_period_end) ??
    null;

  const hasPro = activeSubscription !== null;

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      // Fire both requests in parallel to minimise perceived load time.
      const [subs, invs] = await Promise.all([
        subscriptionApi.list(),
        subscriptionApi.invoices(),
      ]);
      setSubscriptions(subs);
      setInvoices(invs);
    } catch {
      setError('Could not load subscription data. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchData();
  };

  // ── Upgrade (free → Pro) ──────────────────────────────────────────────────────

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      // POST /api/subscriptions/checkout — price defaults to STRIPE_PRICE_ID_PRO server-side.
      const result = await subscriptionApi.checkout();
      if (result.url) {
        await WebBrowser.openBrowserAsync(result.url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        });
        // Refresh so the new active subscription is reflected immediately.
        await fetchData();
      }
    } catch (err) {
      Alert.alert(
        'Upgrade Failed',
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setUpgrading(false);
    }
  };

  // ── Change Plan (upgrade/downgrade for Pro users) ─────────────────────────────

  const handleManage = async () => {
    if (!activeSubscription) return;
    setManaging(true);
    try {
      /**
       * Passing subscription_id tells the backend to perform an inline plan
       * change (Path A) when a new price is also supplied.  With a single Pro
       * tier this behaves identically to Path B (new Checkout Session) because
       * no price_id is sent, so the backend falls back to STRIPE_PRICE_ID_PRO.
       */
      const result = await subscriptionApi.checkout(activeSubscription.id);
      if (result.url) {
        await WebBrowser.openBrowserAsync(result.url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        });
        await fetchData();
      } else if (result.subscription) {
        // Inline plan change completed without a redirect.
        await fetchData();
        Alert.alert('Plan Updated', 'Your plan has been updated successfully.', [{ text: 'OK' }]);
      }
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Could not update plan. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setManaging(false);
    }
  };

  // ── Cancel ────────────────────────────────────────────────────────────────────

  /** Show a native confirmation dialog before calling the cancel API. */
  const handleCancelPrompt = () => {
    if (!activeSubscription) return;
    Alert.alert(
      'Cancel Subscription',
      `You'll keep full Pro access until ${formatDate(activeSubscription.current_period_end)}. Cancel anyway?`,
      [
        { text: 'Keep My Plan', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => void handleCancelConfirmed(activeSubscription.id),
        },
      ]
    );
  };

  const handleCancelConfirmed = async (subscriptionId: string) => {
    setCanceling(true);
    try {
      // POST /api/subscriptions/cancel — schedules cancel_at_period_end = true.
      await subscriptionApi.cancel(subscriptionId);
      await fetchData();
      Alert.alert(
        'Subscription Canceled',
        'Your subscription has been scheduled for cancellation. You retain Pro access until the end of the billing period.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert(
        'Cancellation Failed',
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setCanceling(false);
    }
  };

  // ── PDF viewer ────────────────────────────────────────────────────────────────

  const handleViewPdf = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Loading subscription…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Manage Subscription</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Error banner */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Plan section ── */}
        <Text style={styles.sectionLabel}>YOUR PLAN</Text>

        {hasPro && activeSubscription ? (
          <ActivePlanCard
            subscription={activeSubscription}
            onManage={handleManage}
            onCancel={handleCancelPrompt}
            managing={managing}
            canceling={canceling}
          />
        ) : (
          <FreePlanCard onUpgrade={handleUpgrade} upgrading={upgrading} />
        )}

        {/* ── Billing history ── */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>BILLING HISTORY</Text>

        <View style={styles.card}>
          {invoices.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🧾</Text>
              <Text style={styles.emptyText}>No invoices yet</Text>
            </View>
          ) : (
            invoices.map((inv, idx) => (
              <View key={inv.id}>
                <InvoiceRow invoice={inv} onViewPdf={handleViewPdf} />
                {idx < invoices.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: C.bg },
  loadingText: { fontSize: 15, color: C.textLight },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: C.white,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn:     { marginBottom: 8 },
  backBtnText: { color: C.primary, fontSize: 15, fontWeight: '500' },
  heading:     { fontSize: 26, fontWeight: '700', color: C.textDark },

  // ── Layout ──────────────────────────────────────────────────────────────────
  content:      { padding: 20, paddingBottom: 48 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  // ── Card ────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },

  // ── Plan details ─────────────────────────────────────────────────────────────
  planName:  { fontSize: 19, fontWeight: '700', color: C.textDark },
  planPrice: { fontSize: 15, color: C.textLight, marginBottom: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  infoLabel: { fontSize: 14, color: C.textMuted },
  infoValue: { fontSize: 14, fontWeight: '500', color: C.textMid },

  // ── Banners ──────────────────────────────────────────────────────────────────
  warningBanner: {
    backgroundColor: C.orangeBg,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: C.orangeBorder,
  },
  warningText: { fontSize: 13, color: C.orange, lineHeight: 19 },
  infoBanner: {
    backgroundColor: C.yellowBg,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: C.yellowBorder,
  },
  infoBannerText: { fontSize: 13, color: C.yellow, lineHeight: 19 },

  // ── Action buttons ────────────────────────────────────────────────────────────
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  outlineBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  primaryOutlineBtn: { borderColor: C.primary },
  dangerOutlineBtn:  { borderColor: C.redBorder },
  outlineBtnText:    { fontSize: 14, fontWeight: '600' },
  btnDisabled:       { opacity: 0.5 },

  // ── Error ─────────────────────────────────────────────────────────────────────
  errorCard: {
    backgroundColor: C.redBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: C.redBorder,
  },
  errorText: { color: C.red, fontSize: 14 },

  // ── Upgrade CTA ───────────────────────────────────────────────────────────────
  upgradeCard: {
    borderWidth: 1.5,
    borderColor: C.primary,
    backgroundColor: C.primaryLight,
  },
  upgradeHeader:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  upgradeEmoji:    { fontSize: 32 },
  upgradeTitle:    { fontSize: 19, fontWeight: '700', color: C.primaryDark },
  upgradeSubtitle: { fontSize: 14, color: '#3b82f6', fontWeight: '500' },
  featureList:     { gap: 8, marginBottom: 20 },
  featureRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  featureCheck:    { fontSize: 14, color: C.primary, fontWeight: '700', width: 16 },
  featureText:     { flex: 1, fontSize: 14, color: '#1e3a8a', lineHeight: 20 },
  upgradeBtn: {
    backgroundColor: C.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeBtnText: { color: C.white, fontSize: 16, fontWeight: '700' },

  // ── Invoice rows ──────────────────────────────────────────────────────────────
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  invoiceLeft:   { flex: 1, marginRight: 12 },
  invoiceNumber: { fontSize: 14, fontWeight: '600', color: C.textDark, marginBottom: 3 },
  invoicePeriod: { fontSize: 12, color: C.textMuted },
  invoiceRight:  { alignItems: 'flex-end' },
  invoiceAmount: { fontSize: 15, fontWeight: '700', color: C.textDark, marginBottom: 4 },
  invoiceStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  invoiceDot:       { width: 6, height: 6, borderRadius: 3 },
  invoiceStatusText: { fontSize: 12, fontWeight: '600' },
  pdfLink: {
    fontSize: 12,
    color: C.primary,
    fontWeight: '600',
    marginLeft: 6,
    textDecorationLine: 'underline',
  },
  divider: { height: 1, backgroundColor: C.divider },

  // ── Empty state ───────────────────────────────────────────────────────────────
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyEmoji: { fontSize: 32 },
  emptyText:  { fontSize: 14, color: C.textMuted },
});
