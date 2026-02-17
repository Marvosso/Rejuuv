import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { RecoveryPlan, RecoveryPhase } from '../../lib/types';

export default function RecoveryPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activePhase, setActivePhase] = useState<number>(1);

  // Parse plan data from search params
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
      plan = JSON.parse(decodeURIComponent(planParam));
    } catch (error) {
      console.error('Error parsing recovery plan:', error);
    }
  }

  const phase1 = plan.recovery_plan.phase_1_days_1_to_7;
  const phase2 = plan.recovery_plan.phase_2_days_8_to_21;
  const phase3 = plan.recovery_plan.phase_3_week_4_and_beyond;

  const getActivePhaseData = () => {
    switch (activePhase) {
      case 1:
        return { data: phase1, title: 'Phase 1', timeRange: 'Days 1-7' };
      case 2:
        return { data: phase2, title: 'Phase 2', timeRange: 'Days 8-21' };
      case 3:
        return { data: phase3, title: 'Phase 3', timeRange: 'Week 4+' };
      default:
        return { data: phase1, title: 'Phase 1', timeRange: 'Days 1-7' };
    }
  };

  const activePhaseData = getActivePhaseData();

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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>📋</Text>
        <Text style={styles.headerText}>Your Recovery Plan</Text>
      </View>

      {/* Focus Areas */}
      <View style={styles.focusAreasCard}>
        <Text style={styles.sectionTitle}>Focus Areas</Text>
        <View style={styles.chipsContainer}>
          {plan.focus_areas.map((area, index) => (
            <View key={index} style={styles.chip}>
              <Text style={styles.chipText}>{area}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Phase Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activePhase === 1 && styles.tabActive]}
          onPress={() => setActivePhase(1)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activePhase === 1 && styles.tabTextActive]}>Phase 1</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activePhase === 2 && styles.tabActive]}
          onPress={() => setActivePhase(2)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activePhase === 2 && styles.tabTextActive]}>Phase 2</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activePhase === 3 && styles.tabActive]}
          onPress={() => setActivePhase(3)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activePhase === 3 && styles.tabTextActive]}>Phase 3</Text>
        </TouchableOpacity>
      </View>

      {/* Active Phase Content */}
      <View style={styles.phaseCard}>
        <Text style={styles.phaseTitle}>{activePhaseData.title}</Text>
        <Text style={styles.phaseTimeRange}>{activePhaseData.timeRange}</Text>

        {/* Goals */}
        {activePhaseData.data.goal && (
          <>
            <Text style={styles.subHeaderBlue}>Goals</Text>
            <View style={styles.listItem}>
              <View style={styles.numberBadgeBlue}>
                <Text style={styles.numberText}>1</Text>
              </View>
              <Text style={styles.listItemText}>{activePhaseData.data.goal}</Text>
            </View>
          </>
        )}

        {/* Exercises */}
        {activePhaseData.data.activities && activePhaseData.data.activities.length > 0 && (
          <>
            <Text style={styles.subHeaderGreen}>Exercises</Text>
            {activePhaseData.data.activities.map((exercise, index) => (
              <View key={index} style={styles.listItem}>
                <View style={styles.numberBadgeGreen}>
                  <Text style={styles.numberText}>{index + 1}</Text>
                </View>
                <Text style={styles.listItemText}>{exercise}</Text>
              </View>
            ))}
          </>
        )}

        {/* Tips (using avoid as tips) */}
        {activePhaseData.data.avoid && activePhaseData.data.avoid.length > 0 && (
          <>
            <Text style={styles.subHeaderPurple}>Tips</Text>
            {activePhaseData.data.avoid.map((tip, index) => (
              <View key={index} style={styles.listItem}>
                <View style={styles.numberBadgePurple}>
                  <Text style={styles.numberText}>{index + 1}</Text>
                </View>
                <Text style={styles.listItemText}>{tip}</Text>
              </View>
            ))}
          </>
        )}
      </View>

      {/* Daily Habits */}
      {plan.daily_habits && plan.daily_habits.length > 0 && (
        <View style={[styles.card, styles.dailyHabitsCard]}>
          <Text style={styles.cardTitle}>
            🌱 Daily Habits
          </Text>
          {plan.daily_habits.map((habit, index) => (
            <View key={index} style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{habit}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Red Flags */}
      {plan.red_flags && plan.red_flags.length > 0 && (
        <View style={[styles.card, styles.redFlagsCard]}>
          <Text style={styles.cardTitle}>
            ⚠️ Watch For These
          </Text>
          {plan.red_flags.map((flag, index) => (
            <View key={index} style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{flag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Start Check-In Button */}
      <TouchableOpacity
        style={styles.startCheckInButton}
        onPress={handleStartCheckIn}
        activeOpacity={0.7}
      >
        <Text style={styles.startCheckInButtonText}>Start Check-In</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  focusAreasCard: {
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2563eb',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  phaseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  phaseTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  phaseTimeRange: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  subHeaderBlue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 16,
    marginBottom: 12,
  },
  subHeaderGreen: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 16,
    marginBottom: 12,
  },
  subHeaderPurple: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9333EA',
    marginTop: 16,
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  numberBadgeBlue: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  numberBadgeGreen: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  numberBadgePurple: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#9333EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  numberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listItemText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dailyHabitsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  redFlagsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 18,
    color: '#6B7280',
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 22,
  },
  startCheckInButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  startCheckInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
