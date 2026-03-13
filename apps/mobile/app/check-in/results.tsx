import { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Shadows, Spacing, Radius } from '../../lib/theme';

interface CheckInResults {
  adjustment_summary: string;
  updated_recommendations: string[];
  next_check_in: string;
  safety_reminder?: string;
  suggested_phase?: number;
  maintenance_unlocked?: boolean;
}

export default function CheckInResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const rawResults = params.results as string | undefined;
  let results: CheckInResults = {
    adjustment_summary: '',
    updated_recommendations: [],
    next_check_in: '',
  };

  if (rawResults) {
    try {
      results = JSON.parse(rawResults);
    } catch {
      // fall through with defaults
    }
  }

  // Staggered entrance animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const card3Anim = useRef(new Animated.Value(0)).current;
  const card4Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anims = [headerAnim, card1Anim, card2Anim, card3Anim, card4Anim];
    Animated.stagger(
      120,
      anims.map((anim) =>
        Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true })
      )
    ).start();
  }, []);

  const makeSlide = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
    ],
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Header */}
        <Animated.View style={[styles.successHeader, makeSlide(headerAnim)]}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconEmoji}>🎉</Text>
          </View>
          <Text style={styles.heading}>Check-In Complete!</Text>
          <Text style={styles.subheading}>
            Great work staying on track with your recovery. Here's your personalized feedback.
          </Text>
        </Animated.View>

        {/* Maintenance unlocked celebration */}
        {results.maintenance_unlocked && (
          <Animated.View style={makeSlide(card1Anim)}>
            <View style={[styles.card, styles.maintenanceCard]}>
              <Text style={styles.phaseCardEmoji}>🏆</Text>
              <Text style={styles.phaseCardTitle}>You completed your plan!</Text>
              <Text style={styles.maintenanceBadge}>Maintenance mode unlocked</Text>
              <Text style={styles.phaseCardSubtitle}>
                Keep up your daily habits and check in when needed. You can start a new plan for another area anytime.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Phase suggestion when pain dropped >30% */}
        {results.suggested_phase != null && !results.maintenance_unlocked && (
          <Animated.View style={makeSlide(card1Anim)}>
            <View style={[styles.card, styles.phaseCard]}>
              <Text style={styles.phaseCardEmoji}>📈</Text>
              <Text style={styles.phaseCardTitle}>You might be ready for Phase {results.suggested_phase}</Text>
              <Text style={styles.phaseCardSubtitle}>
                Your pain has improved. Consider moving to the next phase of your plan.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Summary card — teal border */}
        <Animated.View style={makeSlide(card1Anim)}>
          <View style={[styles.card, styles.summaryCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🔍</Text>
              <Text style={styles.cardTitle}>Summary</Text>
            </View>
            <Text style={styles.cardBody}>{results.adjustment_summary}</Text>
          </View>
        </Animated.View>

        {/* Recommendations card — green border */}
        {results.updated_recommendations.length > 0 && (
          <Animated.View style={makeSlide(card2Anim)}>
            <View style={[styles.card, styles.recommendationsCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>✅</Text>
                <Text style={styles.cardTitle}>Recommendations</Text>
              </View>
              <View style={styles.recList}>
                {results.updated_recommendations.map((rec, i) => (
                  <View key={i} style={styles.recRow}>
                    <View style={styles.recBadge}>
                      <Text style={styles.recBadgeText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.recText}>{rec}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Next steps card — orange/secondary border */}
        <Animated.View style={makeSlide(card3Anim)}>
          <View style={[styles.card, styles.nextCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>📅</Text>
              <Text style={styles.cardTitle}>Next Steps</Text>
            </View>
            <Text style={styles.cardBody}>{results.next_check_in}</Text>
          </View>
        </Animated.View>

        {/* Safety card — amber border, only if present */}
        {!!results.safety_reminder && (
          <Animated.View style={makeSlide(card4Anim)}>
            <View style={[styles.card, styles.safetyCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>⚠️</Text>
                <Text style={styles.cardTitle}>Safety Reminder</Text>
              </View>
              <Text style={styles.cardBody}>{results.safety_reminder}</Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.push('/')}
          activeOpacity={0.85}
        >
          <Text style={styles.homeButtonText}>🏠 Back to Home</Text>
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
  content: {
    padding: Spacing.xxl,
    paddingBottom: 130,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  successIconEmoji: {
    fontSize: 40,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
  },
  summaryCard: {
    borderLeftColor: Colors.primary,
  },
  phaseCard: {
    borderLeftColor: Colors.success,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  phaseCardEmoji: {
    fontSize: 36,
    marginBottom: Spacing.sm,
  },
  phaseCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  phaseCardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  maintenanceCard: {
    borderLeftColor: Colors.secondary,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  maintenanceBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  recommendationsCard: {
    borderLeftColor: Colors.success,
  },
  nextCard: {
    borderLeftColor: Colors.secondary,
  },
  safetyCard: {
    borderLeftColor: Colors.warning,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  cardIcon: {
    fontSize: 22,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardBody: {
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 26,
  },
  recList: {
    gap: Spacing.md,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.successLight,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  recBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  recBadgeText: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },
  recText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 23,
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
  homeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButtonText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
