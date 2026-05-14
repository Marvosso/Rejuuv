import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiFetchJson } from '../../lib/api-fetch';
import { fetchExerciseCatalog, type ExerciseCatalogRow } from '../../lib/exercises';
import { PlanPhaseExerciseSection } from '../../components/plan/PlanPhaseExerciseSection';
import { PlanOverviewCard } from '../../components/plan/PlanOverviewCard';
import { PlanSafetyHabitsAccordion } from '../../components/plan/PlanSafetyHabitsAccordion';
import { PlanProgressLogAccordion } from '../../components/plan/PlanProgressLogAccordion';
import {
  normalizePhaseExercises,
  phaseExerciseCount,
  type RecoveryPhaseLike,
} from '../../lib/recovery-plan-phase';
import { Colors, Spacing, Radius, getShadow } from '../../lib/theme';
import { tryParseJson } from '../../lib/safe-json';
import { ScreenErrorBoundary } from '../../components/ScreenErrorBoundary';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

export default function PlanDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plan, setPlan] = useState<PlanRecord | null>(null);
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exerciseCatalog, setExerciseCatalog] = useState<ExerciseCatalogRow[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const [phase1LayoutY, setPhase1LayoutY] = useState(0);
  const [phase1Open, setPhase1Open] = useState(false);
  const [phase2Open, setPhase2Open] = useState(false);
  const [phase3Open, setPhase3Open] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      setError(null);
      const result = await apiFetchJson<{ plan: PlanRecord; checkIns?: CheckInRecord[] }>(`/plans/${id}`);
      if (!result.ok) throw new Error(result.message);
      setPlan(result.data.plan);
      setCheckIns(result.data.checkIns ?? []);
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

  useEffect(() => {
    if (!plan) return;
    let cancelled = false;
    (async () => {
      const rows = await fetchExerciseCatalog({
        body_area: plan.body_area,
      });
      if (!cancelled) setExerciseCatalog(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [plan?.id, plan?.body_area]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleStartPhase1 = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPhase1Open(true);
    setPhase2Open(false);
    setPhase3Open(false);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, phase1LayoutY - 12),
        animated: true,
      });
    });
  }, [phase1LayoutY]);

  const handleStartCheckIn = () => {
    if (!plan) return;
    const parsed = tryParseJson<Record<string, unknown>>(plan.plan_data);
    if (!parsed.ok) {
      return;
    }
    router.push(
      '/check-in/?' +
        new URLSearchParams({
          recovery_plan: JSON.stringify(parsed.data),
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

  const parsedStoredPlan = tryParseJson<Record<string, unknown>>(plan.plan_data);
  if (!parsedStoredPlan.ok) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorEmoji}>📋</Text>
        <Text style={styles.errorTitle}>Plan data could not be read</Text>
        <Text style={styles.errorSubtitle}>
          This saved plan looks incomplete. Nothing is wrong with you — try opening another plan from
          My Plans, or start a fresh plan when you are ready.
        </Text>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const planData = parsedStoredPlan.data as {
    recovery_plan?: {
      phase_1_days_1_to_7?: RecoveryPhaseLike;
      phase_2_days_8_to_21?: RecoveryPhaseLike;
      phase_3_week_4_and_beyond?: RecoveryPhaseLike;
    };
    focus_areas?: unknown;
    daily_habits?: unknown;
    red_flags?: unknown;
  };
  const rp = planData.recovery_plan;
  const phase1Block = rp?.phase_1_days_1_to_7;
  const phase2Block = rp?.phase_2_days_8_to_21;
  const phase3Block = rp?.phase_3_week_4_and_beyond;
  const phase1Exercises = normalizePhaseExercises(phase1Block);
  const phase2Exercises = normalizePhaseExercises(phase2Block);
  const phase3Exercises = normalizePhaseExercises(phase3Block);
  const hasAnyExercises =
    phaseExerciseCount(phase1Block) + phaseExerciseCount(phase2Block) + phaseExerciseCount(phase3Block) >
    0;
  const goal1: string = phase1Block?.goal ?? '';
  const goal2: string = phase2Block?.goal ?? '';
  const goal3: string = phase3Block?.goal ?? '';
  const avoid1 = asStringArray(phase1Block?.avoid);
  const avoid2 = asStringArray(phase2Block?.avoid);
  const avoid3 = asStringArray(phase3Block?.avoid);
  const focusAreas = asStringArray(planData.focus_areas);
  const dailyHabits = asStringArray(planData.daily_habits);
  const redFlags = asStringArray(planData.red_flags);

  const togglePhase = (n: 1 | 2 | 3) => {
    if (n === 1) setPhase1Open((o) => !o);
    if (n === 2) setPhase2Open((o) => !o);
    if (n === 3) setPhase3Open((o) => !o);
  };

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
        ref={scrollRef}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <ScreenErrorBoundary>
        <PlanOverviewCard
          bodyAreaLabel={bodyAreaLabel(plan.body_area)}
          focusAreas={focusAreas}
          phaseLines={[
            { phase: 1, label: 'Phase 1', range: 'Days 1–7', goal: goal1 },
            { phase: 2, label: 'Phase 2', range: 'Days 8–21', goal: goal2 },
            { phase: 3, label: 'Phase 3', range: 'Week 4+', goal: goal3 },
          ]}
        />

        {hasAnyExercises ? (
          <TouchableOpacity
            style={[styles.startPhaseCta, getShadow('button')]}
            onPress={handleStartPhase1}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Start Phase 1 Day 1"
          >
            <Text style={styles.startPhaseCtaTitle}>Start Phase 1 – Day 1</Text>
            <Text style={styles.startPhaseCtaSub}>Open your first exercises and demos</Text>
          </TouchableOpacity>
        ) : null}

        {hasAnyExercises ? (
          <Text style={styles.exercisesSectionTitle}>Your plan</Text>
        ) : null}
        {hasAnyExercises ? (
          <Text style={styles.exercisesSectionSubtitle}>
            Expand a phase when you're ready — everything else stays tucked away.
          </Text>
        ) : null}
        {hasAnyExercises ? (
          <PlanPhaseExerciseSection
            phaseNum={1}
            title="Phase 1 · Days 1–7"
            phaseGoal={goal1}
            exercises={phase1Exercises}
            avoid={avoid1}
            catalog={exerciseCatalog}
            accentColor={Colors.phase1}
            expanded={phase1Open}
            onToggle={() => togglePhase(1)}
            onLayout={(e) => {
              const y = (e as { nativeEvent: { layout: { y: number } } }).nativeEvent.layout.y;
              setPhase1LayoutY(y);
            }}
          />
        ) : null}
        {hasAnyExercises ? (
          <PlanPhaseExerciseSection
            phaseNum={2}
            title="Phase 2 · Days 8–21"
            phaseGoal={goal2}
            exercises={phase2Exercises}
            avoid={avoid2}
            catalog={exerciseCatalog}
            accentColor={Colors.phase2}
            expanded={phase2Open}
            onToggle={() => togglePhase(2)}
          />
        ) : null}
        {hasAnyExercises ? (
          <PlanPhaseExerciseSection
            phaseNum={3}
            title="Phase 3 · Week 4+"
            phaseGoal={goal3}
            exercises={phase3Exercises}
            avoid={avoid3}
            catalog={exerciseCatalog}
            accentColor={Colors.phase3}
            expanded={phase3Open}
            onToggle={() => togglePhase(3)}
          />
        ) : null}

        <PlanSafetyHabitsAccordion dailyHabits={dailyHabits} redFlags={redFlags} />

        <PlanProgressLogAccordion checkInCount={checkIns.length}>
          {checkIns.length === 0 ? (
            <View style={styles.emptyCheckins}>
              <Text style={styles.emptyEmoji}>📝</Text>
              <Text style={styles.emptyTitle}>No check-ins yet</Text>
              <Text style={styles.emptySubtitle}>Complete your first check-in to track your progress.</Text>
            </View>
          ) : null}
          {checkIns.map((ci) => {
            let adjustments: any = {};
            try {
              adjustments = JSON.parse(ci.adjustments);
            } catch {}
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
                    <Text style={[styles.statValue, { color: plColor }]}>{ci.pain_level}/10</Text>
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
        </PlanProgressLogAccordion>
        </ScreenErrorBoundary>
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
  exercisesSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  exercisesSectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: Spacing.lg,
  },
  startPhaseCta: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  startPhaseCtaTitle: {
    color: Colors.textInverse,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  startPhaseCtaSub: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    marginTop: Spacing.xs,
    fontWeight: '500',
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
