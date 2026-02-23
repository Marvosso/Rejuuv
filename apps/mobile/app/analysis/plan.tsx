import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { RecoveryPlan, RecoveryPhase } from '../../lib/types';
import { Colors, Shadows, Spacing, Radius } from '../../lib/theme';

const PHASE_CONFIGS = [
  { key: 1, label: 'Phase 1', range: 'Days 1–7', color: Colors.success, icon: '🌱' },
  { key: 2, label: 'Phase 2', range: 'Days 8–21', color: Colors.secondary, icon: '🔥' },
  { key: 3, label: 'Phase 3', range: 'Week 4+', color: Colors.primary, icon: '🏆' },
];

export default function RecoveryPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activePhase, setActivePhase] = useState<number>(1);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

  const planParam = params.plan;
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

  if (typeof planParam === 'string') {
    try {
      plan = JSON.parse(planParam);
    } catch (error) {
      console.error('Error parsing recovery plan:', error);
    }
  }

  const phase1 = plan.recovery_plan.phase_1_days_1_to_7;
  const phase2 = plan.recovery_plan.phase_2_days_8_to_21;
  const phase3 = plan.recovery_plan.phase_3_week_4_and_beyond;

  const getActivePhaseData = () => {
    switch (activePhase) {
      case 1: return { data: phase1, config: PHASE_CONFIGS[0] };
      case 2: return { data: phase2, config: PHASE_CONFIGS[1] };
      case 3: return { data: phase3, config: PHASE_CONFIGS[2] };
      default: return { data: phase1, config: PHASE_CONFIGS[0] };
    }
  };

  const { data: phaseData, config: phaseConfig } = getActivePhaseData();

  const toggleExercise = (exerciseKey: string) => {
    setCompletedExercises(prev => {
      const next = new Set(prev);
      if (next.has(exerciseKey)) next.delete(exerciseKey);
      else next.add(exerciseKey);
      return next;
    });
  };

  const handleStartCheckIn = () => {
    router.push(
      '/check-in/?' +
        new URLSearchParams({
          recovery_plan: JSON.stringify(plan),
          plan_id: (plan as any).id || (plan as any).plan_id || '',
        }).toString()
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>📋 Your Recovery Plan</Text>
          </View>
          <Text style={styles.headerTitle}>Personalized for You</Text>
          <Text style={styles.headerSubtitle}>
            Follow this 3-phase program to rebuild strength and reduce pain.
          </Text>
        </View>

        {/* Focus Areas */}
        {plan.focus_areas?.length > 0 && (
          <View style={styles.focusCard}>
            <Text style={styles.focusCardTitle}>🎯 Focus Areas</Text>
            <View style={styles.chipsRow}>
              {plan.focus_areas.map((area, index) => (
                <View key={index} style={styles.focusChip}>
                  <Text style={styles.focusChipText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Phase Tabs — segmented control */}
        <View style={styles.phaseTabsContainer}>
          {PHASE_CONFIGS.map((phase) => (
            <TouchableOpacity
              key={phase.key}
              style={[
                styles.phaseTab,
                activePhase === phase.key && [styles.phaseTabActive, { backgroundColor: phase.color }],
              ]}
              onPress={() => {
                setActivePhase(phase.key);
                setExpandedExercise(null);
              }}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.phaseTabText,
                activePhase === phase.key && styles.phaseTabTextActive,
              ]}>
                {phase.icon} {phase.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Phase Content */}
        <View style={[styles.phaseCard, { borderTopColor: phaseConfig.color }]}>
          <View style={styles.phaseCardHeader}>
            <Text style={[styles.phaseTitle, { color: phaseConfig.color }]}>
              {phaseConfig.icon} {phaseConfig.label}
            </Text>
            <View style={[styles.phaseRangeBadge, { backgroundColor: phaseConfig.color + '20' }]}>
              <Text style={[styles.phaseRangeText, { color: phaseConfig.color }]}>
                {phaseConfig.range}
              </Text>
            </View>
          </View>

          {/* Goals */}
          {phaseData.goal ? (
            <View style={styles.goalSection}>
              <Text style={styles.subSectionTitle}>🎯 Goal</Text>
              <View style={[styles.goalCard, { borderLeftColor: phaseConfig.color }]}>
                <Text style={styles.goalText}>{phaseData.goal}</Text>
              </View>
            </View>
          ) : null}

          {/* Exercises — expandable cards with checkboxes */}
          {phaseData.activities?.length > 0 && (
            <View style={styles.exercisesSection}>
              <Text style={styles.subSectionTitle}>💪 Exercises</Text>
              {phaseData.activities.map((exercise, index) => {
                const exerciseKey = `${activePhase}-${index}`;
                const isCompleted = completedExercises.has(exerciseKey);
                return (
                  <View key={index} style={[styles.exerciseCard, isCompleted && styles.exerciseCardCompleted]}>
                    <TouchableOpacity
                      style={styles.exerciseHeader}
                      onPress={() => setExpandedExercise(expandedExercise === index ? null : index)}
                      activeOpacity={0.8}
                    >
                      <TouchableOpacity
                        style={[styles.checkbox, isCompleted && { backgroundColor: phaseConfig.color, borderColor: phaseConfig.color }]}
                        onPress={() => toggleExercise(exerciseKey)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        {isCompleted && <Text style={styles.checkboxTick}>✓</Text>}
                      </TouchableOpacity>
                      <Text style={[
                        styles.exerciseName,
                        isCompleted && styles.exerciseNameCompleted,
                      ]}>
                        {exercise}
                      </Text>
                      <Text style={styles.exerciseExpandIcon}>
                        {expandedExercise === index ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>
                    {expandedExercise === index && (
                      <View style={styles.exerciseDetails}>
                        <Text style={styles.exerciseDetailsText}>
                          Tap the checkbox when you've completed this exercise. Consistency is key to recovery — aim to complete each exercise every day.
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Tips */}
          {phaseData.avoid?.length > 0 && (
            <View style={styles.tipsSection}>
              <Text style={styles.subSectionTitle}>💡 Tips & Precautions</Text>
              {phaseData.avoid.map((tip, index) => (
                <View key={index} style={styles.tipItem}>
                  <View style={[styles.tipDot, { backgroundColor: phaseConfig.color }]} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Daily Habits */}
        {plan.daily_habits?.length > 0 && (
          <View style={[styles.infoCard, styles.habitsCard]}>
            <Text style={styles.infoCardTitle}>🌱 Daily Habits</Text>
            {plan.daily_habits.map((habit, index) => (
              <View key={index} style={styles.bulletItem}>
                <View style={[styles.bulletDot, { backgroundColor: Colors.success }]} />
                <Text style={styles.bulletText}>{habit}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Red Flags */}
        {plan.red_flags?.length > 0 && (
          <View style={[styles.infoCard, styles.redFlagsCard]}>
            <Text style={styles.infoCardTitle}>⚠️ Watch For These</Text>
            <Text style={styles.infoCardSubtitle}>Seek medical attention if you experience:</Text>
            {plan.red_flags.map((flag, index) => (
              <View key={index} style={styles.bulletItem}>
                <View style={[styles.bulletDot, { backgroundColor: Colors.danger }]} />
                <Text style={styles.bulletText}>{flag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Spacer for FAB */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
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
  header: {
    marginBottom: Spacing.xxl,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: Spacing.md,
  },
  headerBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  focusCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    marginBottom: Spacing.xl,
  },
  focusCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  focusChip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  focusChipText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  phaseTabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 4,
    marginBottom: Spacing.xl,
  },
  phaseTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  phaseTabActive: {
    // color set dynamically
  },
  phaseTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  phaseTabTextActive: {
    color: Colors.textInverse,
  },
  phaseCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    marginBottom: Spacing.xl,
    borderTopWidth: 4,
  },
  phaseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  phaseTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  phaseRangeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  phaseRangeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  goalSection: {
    marginBottom: Spacing.xl,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  goalCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderLeftWidth: 3,
  },
  goalText: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 23,
  },
  exercisesSection: {
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  exerciseCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  exerciseCardCompleted: {
    opacity: 0.7,
    borderColor: Colors.success + '50',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
    minHeight: 56,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxTick: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },
  exerciseName: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
    lineHeight: 22,
  },
  exerciseNameCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  exerciseExpandIcon: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  exerciseDetails: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  exerciseDetailsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  tipsSection: {
    gap: Spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: 4,
  },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 23,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    marginBottom: Spacing.xl,
    borderLeftWidth: 4,
  },
  habitsCard: {
    borderLeftColor: Colors.success,
  },
  redFlagsCard: {
    borderLeftColor: Colors.danger,
  },
  infoCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  infoCardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: 10,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 23,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fabIcon: {
    fontSize: 18,
  },
  fabText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
