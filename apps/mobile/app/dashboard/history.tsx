import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetchJson } from '../../lib/api-fetch';
import { Colors, Spacing, Radius, getShadow } from '../../lib/theme';
import { RecoveryTimelineChart, RecoveryTimelineList } from '../../components/timeline';
import { ScreenErrorBoundary } from '../../components/ScreenErrorBoundary';
import type { TimelineApiResponse, TimelineSummary } from '../../lib/recovery-timeline-types';
import { filterTimelineForPlan } from '../../lib/recovery-timeline-filters';
import { trackClientTelemetry } from '../../lib/telemetry';

function trendColor(trend: TimelineSummary['trend']): string {
  if (trend === 'improving') return Colors.success;
  if (trend === 'worsening') return Colors.secondary;
  return Colors.warning;
}

function trendLabel(trend: TimelineSummary['trend']): string {
  if (trend === 'improving') return 'Easing overall';
  if (trend === 'worsening') return 'Rougher patch';
  return 'Steady';
}

export default function RecoveryTimelineScreen() {
  const router = useRouter();
  const [data, setData] = useState<TimelineApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('all');
  const firstFocus = useRef(true);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await apiFetchJson<TimelineApiResponse>('/recovery/timeline?engage=1');
      if (!result.ok) throw new Error(result.message);
      const json = result.data;
      setData(json);
      setError(null);
      void trackClientTelemetry('timeline_screen_opened', {
        entry_count: Array.isArray(json.entries) ? json.entries.length : 0,
      });
    } catch {
      setError('We could not load your recovery timeline. Pull to try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(!firstFocus.current);
      firstFocus.current = false;
    }, [load])
  );

  const planIds = data ? Object.keys(data.by_plan).filter((k) => k !== 'unknown') : [];
  const hasMultiplePlans = planIds.length > 1;

  const filtered = data
    ? filterTimelineForPlan(data, selectedPlan)
    : { entries: [], pain_series: [] };

  const summary = data?.summary;
  const chartRows = filtered.pain_series;

  let filteredTrend: TimelineSummary['trend'] = 'stable';
  if (chartRows.length >= 4) {
    const mid = Math.floor(chartRows.length / 2);
    const first = chartRows.slice(0, mid).reduce((s, r) => s + r.pain_level, 0) / mid;
    const second =
      chartRows.slice(mid).reduce((s, r) => s + r.pain_level, 0) / (chartRows.length - mid);
    if (second - first < -0.5) filteredTrend = 'improving';
    else if (second - first > 0.5) filteredTrend = 'worsening';
  }

  const filteredAvg =
    chartRows.length > 0
      ? Math.round((chartRows.reduce((s, r) => s + r.pain_level, 0) / chartRows.length) * 10) / 10
      : null;

  const checkInCount =
    selectedPlan === 'all'
      ? (summary?.total ?? 0)
      : filtered.entries.filter((e) => e.kind === 'check_in').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Recovery timeline</Text>
        <Text style={styles.subheading}>
          Your logs, milestones, and plan changes — in one calm story.
        </Text>
        {summary && typeof summary.streak_days === 'number' && summary.streak_days > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>
              {summary.streak_days} day{summary.streak_days === 1 ? '' : 's'} of continuity
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={Colors.primary}
          />
        }
      >
        {loading && !data ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading your journey…</Text>
          </View>
        ) : error && !data ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : data && data.entries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nothing on the timeline yet</Text>
            <Text style={styles.emptySubtitle}>
              When you check in, your recovery path starts to take shape here — setbacks included.
            </Text>
          </View>
        ) : data ? (
          <>
            {hasMultiplePlans && (
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[styles.filterChip, selectedPlan === 'all' && styles.filterChipActive]}
                  onPress={() => setSelectedPlan('all')}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedPlan === 'all' && styles.filterChipTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {planIds.map((pid, i) => (
                  <TouchableOpacity
                    key={pid}
                    style={[styles.filterChip, selectedPlan === pid && styles.filterChipActive]}
                    onPress={() => setSelectedPlan(pid)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedPlan === pid && styles.filterChipTextActive,
                      ]}
                    >
                      Plan {i + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={[styles.chartCard, getShadow('card')]}>
              <Text style={styles.chartTitle}>Pain over time</Text>
              <Text style={styles.chartSub}>0–10 · last 90 days in this view</Text>
              <ScreenErrorBoundary>
                <RecoveryTimelineChart series={chartRows} />
              </ScreenErrorBoundary>
            </View>

            <Text style={styles.sectionTitle}>At a glance</Text>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, getShadow('card')]}>
                <Text style={styles.summaryValueLarge}>{checkInCount}</Text>
                <Text style={styles.summaryLabelMuted}>Check-ins</Text>
              </View>
              <View style={[styles.summaryCard, getShadow('card')]}>
                <Text style={styles.summaryValueLarge}>
                  {filteredAvg !== null ? filteredAvg : '—'}
                </Text>
                <Text style={styles.summaryLabelMuted}>Avg pain</Text>
              </View>
              <View style={[styles.summaryCard, styles.summaryCardWide, getShadow('card')]}>
                <Text style={[styles.summaryValueLarge, { color: trendColor(filteredTrend) }]}>
                  {trendLabel(filteredTrend)}
                </Text>
                <Text style={styles.summaryLabelMuted}>Trend</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Your story</Text>
            <Text style={styles.storyHint}>
              Newest moments are at the bottom — scroll to see how far you have come.
            </Text>
            <ScreenErrorBoundary>
              <RecoveryTimelineList entries={filtered.entries} />
            </ScreenErrorBoundary>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.surface,
    paddingTop: 56,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { marginBottom: 6 },
  backBtnText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  heading: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  subheading: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  streakBadge: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  streakText: { fontSize: 14, fontWeight: '700', color: Colors.primaryDark },
  content: { padding: Spacing.xxl, paddingBottom: 48 },
  centered: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText: { fontSize: 15, color: Colors.textSecondary },
  errorCard: {
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
  },
  errorText: { color: Colors.dangerDark, fontSize: 14 },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xxxl,
    alignItems: 'center',
    marginTop: Spacing.xxxl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg, flexWrap: 'wrap' },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  filterChipActive: { backgroundColor: Colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  filterChipTextActive: { color: Colors.textInverse },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  chartSub: { fontSize: 12, color: Colors.textMuted, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm },
  storyHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  summaryRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xxl },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryCardWide: { flex: 1.35 },
  summaryValueLarge: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  summaryLabelMuted: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
});
