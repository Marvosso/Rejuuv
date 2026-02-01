import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

interface RecoveryPhase {
  goal: string;
  activities: string[];
  avoid: string[];
}

interface RecoveryPlanData {
  focus_areas: string[];
  recovery_plan: {
    phase_1_days_1_to_7: RecoveryPhase;
    phase_2_days_8_to_21: RecoveryPhase;
    phase_3_week_4_and_beyond: RecoveryPhase;
  };
  daily_habits: string[];
  red_flags: string[];
}

export default function RecoveryPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse recovery plan data from search params with error handling
  const planParam = params.plan as string | string[] | undefined;
  let plan: RecoveryPlanData = {
    focus_areas: [],
    recovery_plan: {
      phase_1_days_1_to_7: { goal: '', activities: [], avoid: [] },
      phase_2_days_8_to_21: { goal: '', activities: [], avoid: [] },
      phase_3_week_4_and_beyond: { goal: '', activities: [], avoid: [] },
    },
    daily_habits: [],
    red_flags: [],
  };

  if (planParam) {
    try {
      // Handle both string and array cases from expo-router
      const planString = Array.isArray(planParam) ? planParam[0] : planParam;
      
      // Try to decode and parse - handle both encoded and unencoded cases
      let decoded: string;
      try {
        // Check if it looks like it needs decoding (contains %)
        if (planString.includes('%')) {
          decoded = decodeURIComponent(planString);
        } else {
          decoded = planString;
        }
      } catch (e) {
        // If decode fails, it might already be decoded
        decoded = planString;
      }
      
      plan = JSON.parse(decoded);
    } catch (error) {
      console.error('Error parsing recovery plan data:', error);
      console.error('Plan param value:', planParam);
      // Plan will use default empty values
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>📋</Text>
          <Text style={styles.headerText}>Your Recovery Plan</Text>
          <Text style={styles.headerSubtext}>Follow this phased approach to recovery</Text>
        </View>

        {/* Focus Areas */}
        {plan.focus_areas && plan.focus_areas.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Focus Areas</Text>
            <View style={styles.tagsContainer}>
              {plan.focus_areas.map((area, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Phase 1 */}
        <View style={[styles.card, styles.phaseCard]}>
          <View style={styles.phaseHeader}>
            <Text style={styles.phaseNumber}>1</Text>
            <Text style={styles.phaseTitle}>Days 1-7</Text>
          </View>
          <Text style={styles.phaseGoal}>{plan.recovery_plan.phase_1_days_1_to_7.goal}</Text>
          
          <Text style={styles.sectionLabel}>Activities:</Text>
          {plan.recovery_plan.phase_1_days_1_to_7.activities.map((activity, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>{activity}</Text>
            </View>
          ))}

          <Text style={styles.sectionLabel}>Avoid:</Text>
          {plan.recovery_plan.phase_1_days_1_to_7.avoid.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bulletAvoid}>✗</Text>
              <Text style={styles.listTextAvoid}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Phase 2 */}
        <View style={[styles.card, styles.phaseCard]}>
          <View style={styles.phaseHeader}>
            <Text style={styles.phaseNumber}>2</Text>
            <Text style={styles.phaseTitle}>Days 8-21</Text>
          </View>
          <Text style={styles.phaseGoal}>{plan.recovery_plan.phase_2_days_8_to_21.goal}</Text>
          
          <Text style={styles.sectionLabel}>Activities:</Text>
          {plan.recovery_plan.phase_2_days_8_to_21.activities.map((activity, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>{activity}</Text>
            </View>
          ))}

          <Text style={styles.sectionLabel}>Avoid:</Text>
          {plan.recovery_plan.phase_2_days_8_to_21.avoid.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bulletAvoid}>✗</Text>
              <Text style={styles.listTextAvoid}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Phase 3 */}
        <View style={[styles.card, styles.phaseCard]}>
          <View style={styles.phaseHeader}>
            <Text style={styles.phaseNumber}>3</Text>
            <Text style={styles.phaseTitle}>Week 4 and Beyond</Text>
          </View>
          <Text style={styles.phaseGoal}>{plan.recovery_plan.phase_3_week_4_and_beyond.goal}</Text>
          
          <Text style={styles.sectionLabel}>Activities:</Text>
          {plan.recovery_plan.phase_3_week_4_and_beyond.activities.map((activity, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>{activity}</Text>
            </View>
          ))}

          <Text style={styles.sectionLabel}>Avoid:</Text>
          {plan.recovery_plan.phase_3_week_4_and_beyond.avoid.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bulletAvoid}>✗</Text>
              <Text style={styles.listTextAvoid}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Daily Habits */}
        {plan.daily_habits && plan.daily_habits.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Daily Habits</Text>
            {plan.daily_habits.map((habit, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.bullet}>✓</Text>
                <Text style={styles.listText}>{habit}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Red Flags */}
        {plan.red_flags && plan.red_flags.length > 0 && (
          <View style={[styles.card, styles.redFlagsCard]}>
            <Text style={styles.cardTitle}>⚠️ When to Seek Medical Care</Text>
            {plan.red_flags.map((flag, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.bulletRed}>⚠</Text>
                <Text style={styles.listText}>{flag}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.push('/')}
          activeOpacity={0.7}
        >
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
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
    marginBottom: 4,
  },
  headerSubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  phaseCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  redFlagsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#DBEAFE',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  phaseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 32,
  },
  phaseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  phaseGoal: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
    lineHeight: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  bullet: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: 'bold',
    marginTop: 2,
  },
  bulletAvoid: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: 'bold',
    marginTop: 2,
  },
  bulletRed: {
    fontSize: 16,
    color: '#F59E0B',
    fontWeight: 'bold',
    marginTop: 2,
  },
  listText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
  },
  listTextAvoid: {
    flex: 1,
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
    textDecorationLine: 'line-through',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  homeButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
