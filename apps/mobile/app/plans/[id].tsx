import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getSession } from '../../lib/auth';
import { Colors, Shadows, Spacing, Radius } from '../../lib/theme';

interface CheckInRecord {
  id: string;
  pain_level: number;
  pain_change: string;
  difficulty: string;
  notes: string;
  adjustments: string;
  created_at: string;
}

interface PlanRecord {
  id: string;
  body_area: string;
  phase: number;
  status: string;
  created_at: string;
  plan_data: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function bodyAreaLabel(area: string) {
  return area.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function painChangeStyle(change: string): { color: string; emoji: string } {
  if (change === 'Better') return { color: Colors.success, emoji: '📈' };
  if (change === 'Worse') return { color: Colors.danger, emoji: '📉' };
  return { color: Colors.warning, emoji: '➡️' };
}

function painLevelColor(level: number): string {
  if (level <= 3) return Colors.success;
  if (level <= 6) return Colors.warning;
  return Colors.danger;
}

export default function PlanDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plan, setPlan] = useState<PlanRecord | null>(null);
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    try {
      setError(null);
      const session = await getSession();
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/plans/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
      });
      if (!response.ok) throw new Error('Failed to load plan');
      const data = await response.json();
      setPlan(data.plan);
      setCheckIns(data.checkIns ?? []);
    } catch {
      setError('Could not load this plan. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleStartCheckIn = () => {
    if (!plan) return;
    const planData = JSON.parse(plan.plan_data);
    router.push(
      '/check-in/?' +
        new URLSearchParams({
          recovery_plan: JSON.stringify(planData),
          plan_id: plan.id,
        }).toString()
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading plan...</Text>
      </View>
    );
  }

  if (error || !plan) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorEmoji}>😕</Text>
        <Text style={styles.errorTitle}>Plan not found</Text>
        <Text style={styles.errorSubtitle}>{error ?? 'Could not load this plan.'}</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const planData = JSON.parse(plan.plan_data);

  return (
    <View style={styles.container}>
      {/* Teal header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← My Plans</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>{bodyAreaLabel(plan.body_area)}</Text>
        <View style={styles.headerMeta}>
          <View style={styles.headerPhase}>
            <Text style={styles.headerPhaseText}>Phase {plan.phase}</Text>
          </View>
          <Text style={styles.headerDate}>Started {formatDate(plan.created_at)}</Text>
          <View style={[styles.statusDot, plan.status === 'active' ? styles.statusDotActive : styles.statusDotInactive]} />
          <Text style={[styles.statusLabel, { color: plan.status === 'active' ? Colors.success : Colors.textMuted }]}>
            {plan.status === 'active' ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Focus Areas */}
        {planData.focus_areas?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎯 Focus Areas</Text>
            <View style={styles.chipRow}>
              {planData.focus_areas.map((area: string, i: number) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Phase 1 exercises */}
        {planData.recovery_plan?.phase_1_days_1_to_7?.activities?.length > 0 && (
          <View style={[styles.card, styles.exerciseCard]}>
            <Text style={styles.cardTitle}>💪 Phase 1 Exercises (Days 1–7)</Text>
            {planData.recovery_plan.phase_1_days_1_to_7.activities.map(
              (ex: string, i: number) => (
                <View key={i} style={styles.exerciseRow}>
                  <View style={styles.exerciseDot} />
                  <Text style={styles.exerciseText}>{ex}</Text>
                </View>
              )
            )}
          </View>
        )}

        {/* Check-in history */}
        <View style={styles.historySection}>
          <Text style={styles.sectionHeading}>
            Check-In History
            <Text style={styles.sectionCount}> ({checkIns.length})</Text>
          </Text>

          {checkIns.length === 0 && (
            <View style={styles.emptyCheckins}>
              <Text style={styles.emptyEmoji}>📝</Text>
              <Text style={styles.emptyTitle}>No check-ins yet</Text>
              <Text style={styles.emptySubtitle}>Complete your first check-in to track your progress.</Text>
            </View>
          )}

          {checkIns.map((ci) => {
            let adjustments: any = {};
            try { adjustments = JSON.parse(ci.adjustments); } catch {}
            const changeStyle = painChangeStyle(ci.pain_change);
            const plColor = painLevelColor(ci.pain_level);

            return (
              <View key={ci.id} style={styles.checkInCard}>
                <View style={styles.checkInHeader}>
                  <Text style={styles.checkInDate}>{formatDate(ci.created_at)}</Text>
                  <View style={[styles.changeBadge, { backgroundColor: changeStyle.color + '20' }]}>
                    <Text style={styles.changeEmoji}>{changeStyle.emoji}</Text>
                    <Text style={[styles.checkInChange, { color: changeStyle.color }]}>
                      {ci.pain_change}
                    </Text>
                  </View>
                </View>

                <View style={styles.checkInStats}>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Pain Level</Text>
                    <Text style={[styles.statValue, { color: plColor }]}>
                      {ci.pain_level}/10
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Difficulty</Text>
                    <Text style={styles.statValue}>{ci.difficulty}</Text>
                  </View>
                </View>

                {adjustments.adjustment_summary ? (
                  <Text style={styles.adjustmentSummary}>{adjustments.adjustment_summary}</Text>
                ) : null}

                {ci.notes ? (
                  <View style={styles.notesContainer}>
                    <Text style={styles.checkInNotes}>"{ci.notes}"</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Sticky check-in CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.checkInButton}
          onPress={handleStartCheckIn}
          activeOpacity={0.85}
        >
          <Text style={styles.checkInButtonText}>✏️ Start Today's Check-In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xxl,
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  errorSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  backLink: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  backLinkText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: Spacing.xxl,
  },
  backBtn: {
    marginBottom: 12,
  },
  backBtnText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '500',
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textInverse,
    marginBottom: 10,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  headerPhase: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  headerPhaseText: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  headerDate: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusDotActive: {
    backgroundColor: Colors.success,
  },
  statusDotInactive: {
    backgroundColor: Colors.textMuted,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    padding: Spacing.xxl,
    paddingBottom: 130,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  exerciseCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  chipText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  exerciseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.success,
    marginTop: 8,
    flexShrink: 0,
  },
  exerciseText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 23,
  },
  historySection: {
    marginTop: Spacing.sm,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  sectionCount: {
    color: Colors.textSecondary,
    fontWeight: '400',
    fontSize: 16,
  },
  emptyCheckins: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 32,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  checkInCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  checkInDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  changeEmoji: {
    fontSize: 13,
  },
  checkInChange: {
    fontSize: 13,
    fontWeight: '700',
  },
  checkInStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.xl,
  },
  stat: {
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  adjustmentSummary: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: Spacing.sm,
  },
  notesContainer: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: Colors.border,
    marginTop: 4,
  },
  checkInNotes: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xxl,
    paddingBottom: 40,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  checkInButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInButtonText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
