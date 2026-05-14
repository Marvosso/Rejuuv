import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { subscriptionApi } from '../../lib/api-client';
import { fetchExerciseCatalog, type ExerciseCatalogRow } from '../../lib/exercises';
import { RecoveryPlan } from '../../lib/types';
import { normalizePhaseExercises, phaseExerciseCount } from '../../lib/recovery-plan-phase';
import { Colors, Spacing, Radius, getShadow } from '../../lib/theme';
import { PlanOverviewCard } from '../../components/plan/PlanOverviewCard';
import { PlanPhaseExerciseSection } from '../../components/plan/PlanPhaseExerciseSection';
import { PlanSafetyHabitsAccordion } from '../../components/plan/PlanSafetyHabitsAccordion';
import { ScreenErrorBoundary } from '../../components/ScreenErrorBoundary';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function bodyAreaLabel(area: string) {
  if (!area || !area.trim()) return 'Your recovery';
  return area.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function RecoveryPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ plan?: string; body_area?: string }>();
  const [trialLoading, setTrialLoading] = useState(false);
  const [exerciseCatalog, setExerciseCatalog] = useState<ExerciseCatalogRow[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const [phase1LayoutY, setPhase1LayoutY] = useState(0);
  const [phase1Open, setPhase1Open] = useState(false);
  const [phase2Open, setPhase2Open] = useState(false);
  const [phase3Open, setPhase3Open] = useState(false);

  let plan: RecoveryPlan = {
    focus_areas: [],
    recovery_plan: {
      phase_1_days_1_to_7: { goal: '', activities: [], avoid: [] },
      phase_2_days_8_to_21: { goal: '', activities: [], avoid: [] },
      phase_3_week_4_and_beyond: { goal: '', activities: [], avoid: [] },
    },
    daily_habits: [],
    red_flags: [],
  };

  if (typeof params.plan === 'string') {
    try {
      plan = JSON.parse(params.plan);
    } catch (e) {
      console.error('Error parsing recovery plan:', e);
    }
  }

  const phase1 = plan.recovery_plan.phase_1_days_1_to_7;
  const phase2 = plan.recovery_plan.phase_2_days_8_to_21;
  const phase3 = plan.recovery_plan.phase_3_week_4_and_beyond;
  const phase1Exercises = normalizePhaseExercises(phase1);
  const phase2Exercises = normalizePhaseExercises(phase2);
  const phase3Exercises = normalizePhaseExercises(phase3);
  const bodyArea = bodyAreaLabel(params.body_area ?? '');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const area = typeof params.body_area === 'string' ? params.body_area : undefined;
      const rows = await fetchExerciseCatalog({
        body_area: area,
      });
      if (!cancelled) setExerciseCatalog(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.body_area]);

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

  const togglePhase = (n: 1 | 2 | 3) => {
    if (n === 1) setPhase1Open((o) => !o);
    if (n === 2) setPhase2Open((o) => !o);
    if (n === 3) setPhase3Open((o) => !o);
  };

  const handleStartCheckIn = () => {
    router.push(
      '/check-in/?' +
        new URLSearchParams({
          recovery_plan: JSON.stringify(plan),
          plan_id: (plan as { id?: string }).id ?? '',
        }).toString()
    );
  };

  const handleStartTrial = async () => {
    setTrialLoading(true);
    try {
      const result = await subscriptionApi.checkout(undefined, 7);
      if (result.url) {
        await Linking.openURL(result.url);
      } else {
        Alert.alert('Error', result.error ?? 'Could not start trial.');
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setTrialLoading(false);
    }
  };

  const hasAnyExercises =
    phaseExerciseCount(phase1) + phaseExerciseCount(phase2) + phaseExerciseCount(phase3) > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.screenHeader}>
          <Text style={styles.screenHeaderKicker}>Your recovery plan</Text>
          <Text style={styles.screenHeaderTitle}>Personalized for you</Text>
        </View>

        <ScreenErrorBoundary>
        <PlanOverviewCard
          bodyAreaLabel={bodyArea}
          focusAreas={plan.focus_areas ?? []}
          phaseLines={[
            { phase: 1, label: 'Phase 1', range: 'Days 1–7', goal: phase1.goal },
            { phase: 2, label: 'Phase 2', range: 'Days 8–21', goal: phase2.goal },
            { phase: 3, label: 'Phase 3', range: 'Week 4+', goal: phase3.goal },
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
          <Text style={styles.sectionTitle}>Your plan</Text>
        ) : null}
        {hasAnyExercises ? (
          <Text style={styles.sectionSubtitle}>
            Expand a phase when you're ready — details stay tucked away until then.
          </Text>
        ) : null}

        {hasAnyExercises ? (
          <PlanPhaseExerciseSection
            phaseNum={1}
            title="Phase 1 · Days 1–7"
            phaseGoal={phase1.goal}
            exercises={phase1Exercises}
            avoid={phase1.avoid}
            catalog={exerciseCatalog}
            accentColor={Colors.phase1}
            expanded={phase1Open}
            onToggle={() => togglePhase(1)}
            onLayout={(e) => setPhase1LayoutY(e.nativeEvent.layout.y)}
          />
        ) : null}
        {hasAnyExercises ? (
          <PlanPhaseExerciseSection
            phaseNum={2}
            title="Phase 2 · Days 8–21"
            phaseGoal={phase2.goal}
            exercises={phase2Exercises}
            avoid={phase2.avoid}
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
            phaseGoal={phase3.goal}
            exercises={phase3Exercises}
            avoid={phase3.avoid}
            catalog={exerciseCatalog}
            accentColor={Colors.phase3}
            expanded={phase3Open}
            onToggle={() => togglePhase(3)}
          />
        ) : null}
        </ScreenErrorBoundary>

        <PlanSafetyHabitsAccordion dailyHabits={plan.daily_habits ?? []} redFlags={plan.red_flags ?? []} />

        <TouchableOpacity
          style={styles.trialCta}
          onPress={handleStartTrial}
          disabled={trialLoading}
        >
          {trialLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={styles.trialCtaText}>Try Pro free — 7-day trial</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, getShadow('fab')]}
        onPress={handleStartCheckIn}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>✏️</Text>
        <Text style={styles.fabText}>Start Check-In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xxl,
    paddingBottom: 40,
  },
  screenHeader: {
    marginBottom: Spacing.lg,
  },
  screenHeaderKicker: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: Spacing.xs,
  },
  screenHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sectionSubtitle: {
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
  },
  startPhaseCtaSub: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    marginTop: Spacing.xs,
    fontWeight: '500',
  },
  trialCta: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  trialCtaText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: Spacing.xxl,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fabIcon: {
    fontSize: 18,
  },
  fabText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
});
