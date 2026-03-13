import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useRouter } from 'expo-router';
import { getSession } from '../../lib/auth';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CheckInRow {
  id: string;
  pain_level: number | null;
  pain_change: string;
  difficulty: string;
  recovery_plan_id: string | null;
  created_at: string;
}

interface Summary {
  total: number;
  avg_pain: number | null;
  trend: 'improving' | 'stable' | 'worsening';
  streak_days?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function trendColor(trend: Summary['trend']): string {
  if (trend === 'improving') return '#16a34a';
  if (trend === 'worsening') return '#dc2626';
  return '#d97706';
}

function trendEmoji(trend: Summary['trend']): string {
  if (trend === 'improving') return '📉';
  if (trend === 'worsening') return '📈';
  return '➡️';
}

function trendLabel(trend: Summary['trend']): string {
  if (trend === 'improving') return 'Improving';
  if (trend === 'worsening') return 'Worsening';
  return 'Stable';
}

/** Tiny trend arrow for check-in: change from previous day (Better = ↓, Worse = ↑, Same = −). */
function trendArrow(painChange: string): { char: string; color: string } {
  if (painChange === 'Better') return { char: '↓', color: '#16a34a' };
  if (painChange === 'Worse') return { char: '↑', color: '#dc2626' };
  return { char: '−', color: '#9ca3af' };
}

const CHART_SKELETON_HEIGHT = 200;
const CHART_SKELETON_WIDTH = SCREEN_WIDTH - 64;

// ─── Component ────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const router = useRouter();
  const [allCheckIns, setAllCheckIns] = useState<CheckInRow[]>([]);
  const [byPlan, setByPlan] = useState<Record<string, CheckInRow[]>>({});
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('all');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const session = await getSession();
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
        const response = await fetch(`${apiUrl}/check-ins/history`, {
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {}),
          },
        });

        if (!response.ok) throw new Error('Failed to load history');

        const data = await response.json();
        setAllCheckIns(data.checkIns ?? []);
        setByPlan(data.by_plan ?? {});
        setSummary(data.summary ?? null);
      } catch {
        setError('Could not load your check-in history.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Which rows to show based on filter
  const activeRows: CheckInRow[] =
    selectedPlan === 'all'
      ? allCheckIns
      : byPlan[selectedPlan] ?? [];

  // Last 30 data points with a pain level for the chart
  const chartRows = activeRows
    .filter((r) => r.pain_level !== null)
    .slice(-30);

  // Recalculate summary stats for the filtered set
  const filteredAvg =
    chartRows.length > 0
      ? Math.round(
          (chartRows.reduce((s, r) => s + (r.pain_level ?? 0), 0) / chartRows.length) * 10
        ) / 10
      : null;

  let filteredTrend: Summary['trend'] = 'stable';
  if (chartRows.length >= 4) {
    const mid = Math.floor(chartRows.length / 2);
    const first = chartRows.slice(0, mid).reduce((s, r) => s + (r.pain_level ?? 0), 0) / mid;
    const second =
      chartRows.slice(mid).reduce((s, r) => s + (r.pain_level ?? 0), 0) /
      (chartRows.length - mid);
    if (second - first < -0.5) filteredTrend = 'improving';
    else if (second - first > 0.5) filteredTrend = 'worsening';
  }

  const planIds = Object.keys(byPlan);
  const hasMultiplePlans = planIds.length > 1;

  // Build chart data — ensure at least 2 points to avoid chart crash
  const chartData =
    chartRows.length >= 2
      ? {
          labels: chartRows.map((r) => formatShortDate(r.created_at)),
          datasets: [
            {
              data: chartRows.map((r) => r.pain_level ?? 0),
              color: () => '#2563eb',
              strokeWidth: 2,
            },
          ],
        }
      : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Pain History</Text>
        <Text style={styles.subheading}>Last 90 days of check-ins</Text>
        {summary && typeof summary.streak_days === 'number' && summary.streak_days > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakText}>{summary.streak_days} day streak</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : allCheckIns.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>No check-ins yet</Text>
            <Text style={styles.emptySubtitle}>
              Complete your first check-in to start tracking your pain progression.
            </Text>
          </View>
        ) : (
          <>
            {/* Plan filter — only show if user has multiple plans */}
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

            {/* Line chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Pain Level Over Time</Text>
              {chartData ? (
                <LineChart
                  data={chartData}
                  width={SCREEN_WIDTH - 64}
                  height={200}
                  yAxisSuffix=""
                  yAxisInterval={1}
                  fromZero
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: () => '#2563eb',
                    labelColor: () => '#6b7280',
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: '#2563eb',
                    },
                    propsForBackgroundLines: {
                      stroke: '#f3f4f6',
                      strokeWidth: 1,
                    },
                  }}
                  bezier
                  style={styles.chart}
                  withHorizontalLabels
                  withVerticalLabels={chartRows.length <= 15}
                  segments={5}
                />
              ) : (
                <View style={styles.chartSkeletonWrap}>
                  <View style={styles.chartSkeleton}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.chartSkeletonGridLine,
                          { top: (i / 5) * (CHART_SKELETON_HEIGHT - 24) + 12 },
                        ]}
                      />
                    ))}
                    <View style={styles.chartSkeletonBars}>
                      {[40, 65, 35, 70, 50, 45].map((h, i) => (
                        <View
                          key={i}
                          style={[
                            styles.chartSkeletonBar,
                            {
                              height: Math.max(8, (h / 100) * (CHART_SKELETON_HEIGHT - 32)),
                            },
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                  <View style={styles.chartSkeletonOverlay}>
                    <Text style={styles.chartSkeletonOverlayText}>
                      Your progress will appear here after 2 check-ins.
                    </Text>
                  </View>
                </View>
              )}
              <Text style={styles.chartNote}>Y-axis: pain level (0–10)</Text>
            </View>

            {/* Summary cards */}
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValueLarge}>
                  {selectedPlan === 'all' ? (summary?.total ?? 0) : activeRows.length}
                </Text>
                <Text style={styles.summaryLabelMuted}>Check-ins</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValueLarge}>
                  {filteredAvg !== null ? filteredAvg : '—'}
                </Text>
                <Text style={styles.summaryLabelMuted}>Avg Pain</Text>
              </View>
              <View style={[styles.summaryCard, styles.summaryCardWide]}>
                <Text style={[styles.summaryValueLarge, { color: trendColor(filteredTrend) }]}>
                  {trendEmoji(filteredTrend)} {trendLabel(filteredTrend)}
                </Text>
                <Text style={styles.summaryLabelMuted}>Trend</Text>
              </View>
            </View>

            {/* Recent check-in list */}
            <Text style={styles.sectionTitle}>Recent Check-ins</Text>
            {activeRows
              .slice()
              .reverse()
              .slice(0, 10)
              .map((ci) => {
                const arrow = trendArrow(ci.pain_change);
                return (
                  <View key={ci.id} style={styles.checkInRow}>
                    <View style={styles.checkInLeft}>
                      <View style={[styles.checkInTrendArrow, { backgroundColor: arrow.color + '20' }]}>
                        <Text style={[styles.checkInTrendArrowText, { color: arrow.color }]}>
                          {arrow.char}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.checkInDot,
                          {
                            backgroundColor:
                              ci.pain_change === 'Better'
                                ? '#16a34a'
                                : ci.pain_change === 'Worse'
                                  ? '#dc2626'
                                  : '#d97706',
                          },
                        ]}
                      />
                      <View>
                        <Text style={styles.checkInPain}>
                          {ci.pain_level !== null ? `Pain ${ci.pain_level}/10` : 'No level recorded'}
                        </Text>
                        <Text style={styles.checkInMeta}>
                          {ci.pain_change} · {ci.difficulty}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.checkInDate}>
                      {formatShortDate(ci.created_at)}
                    </Text>
                  </View>
                );
              })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: { marginBottom: 6 },
  backBtnText: { color: '#2563eb', fontSize: 15, fontWeight: '500' },
  heading: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 2 },
  subheading: { fontSize: 13, color: '#6b7280' },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    borderRadius: 20,
    gap: 6,
  },
  streakEmoji: { fontSize: 18 },
  streakText: { fontSize: 14, fontWeight: '700', color: '#92400e' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText: { fontSize: 15, color: '#6b7280' },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: { color: '#991b1b', fontSize: 14 },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22 },

  // Filter chips
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    backgroundColor: '#ffffff',
  },
  filterChipActive: { backgroundColor: '#2563eb' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  filterChipTextActive: { color: '#ffffff' },

  // Chart
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
  },
  chartTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  chart: { borderRadius: 10, marginLeft: -8 },
  chartSkeletonWrap: {
    position: 'relative',
    width: CHART_SKELETON_WIDTH,
    height: CHART_SKELETON_HEIGHT,
  },
  chartSkeleton: {
    width: CHART_SKELETON_WIDTH,
    height: CHART_SKELETON_HEIGHT,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    overflow: 'hidden',
  },
  chartSkeletonGridLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  chartSkeletonBars: {
    position: 'absolute',
    bottom: 16,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  chartSkeletonBar: {
    flex: 1,
    backgroundColor: '#d1d5db',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 8,
  },
  chartSkeletonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  chartSkeletonOverlayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  chartNote: { fontSize: 11, color: '#9ca3af', marginTop: 8, textAlign: 'center' },

  // Summary
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 1,
  },
  summaryCardWide: { flex: 1.4 },
  summaryValueLarge: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 4 },
  summaryLabelMuted: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '500' },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  summaryLabel: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Check-in list
  checkInTrendArrow: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInTrendArrowText: { fontSize: 12, fontWeight: '700' },
  checkInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
  },
  checkInLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkInDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  checkInPain: { fontSize: 14, fontWeight: '600', color: '#111827' },
  checkInMeta: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  checkInDate: { fontSize: 12, color: '#9ca3af' },
});
