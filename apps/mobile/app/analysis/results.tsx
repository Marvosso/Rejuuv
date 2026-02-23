import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getSession } from '../../lib/auth';
import { Colors, Shadows, Spacing, Radius } from '../../lib/theme';

interface AnalysisData {
  summary: string;
  possible_contributors: string[];
  education: string;
  safety_note: string;
}

export default function ResultsScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();

  const analysisParam = params.analysis as string | undefined;
  const intakeDataParam = params.intakeData as string | undefined;

  const analysis: AnalysisData = analysisParam
    ? JSON.parse(analysisParam)
    : { summary: '', possible_contributors: [], education: '', safety_note: '' };

  const intakeData = intakeDataParam ? JSON.parse(intakeDataParam) : null;

  // Staggered animations for cards
  const headerAnim = useRef(new Animated.Value(0)).current;
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const card3Anim = useRef(new Animated.Value(0)).current;
  const card4Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anims = [headerAnim, card1Anim, card2Anim, card3Anim, card4Anim];
    Animated.stagger(
      150,
      anims.map((anim) =>
        Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true })
      )
    ).start();
  }, []);

  const makeSlide = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
      },
    ],
  });

  const handleGeneratePlan = async () => {
    if (!intakeData) {
      Alert.alert('Error', 'Unable to generate recovery plan. Please start over.', [{ text: 'OK' }]);
      return;
    }
    setLoading(true);
    try {
      const session = await getSession();
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/recovery-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ assessment: analysis, intake_data: intakeData }),
      });

      if (!response.ok) throw new Error('Failed to generate recovery plan');

      const recoveryPlan = await response.json();
      router.push(
        '/analysis/plan?' +
          new URLSearchParams({ plan: JSON.stringify(recoveryPlan) }).toString()
      );
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.', [{ text: 'OK' }]);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View style={[styles.header, makeSlide(headerAnim)]}>
          <View style={styles.successBadge}>
            <Text style={styles.successBadgeText}>✅ Analysis Complete</Text>
          </View>
          <Text style={styles.headerTitle}>Here's What We Found</Text>
          <Text style={styles.headerSubtitle}>
            Review your personalized analysis below, then generate your recovery plan.
          </Text>
        </Animated.View>

        {/* Summary Card */}
        <Animated.View style={makeSlide(card1Anim)}>
          <View style={[styles.card, styles.summaryCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🔍</Text>
              <Text style={styles.cardTitle}>What We Found</Text>
            </View>
            <Text style={styles.cardBody}>{analysis.summary}</Text>
          </View>
        </Animated.View>

        {/* Contributors Card */}
        {analysis.possible_contributors?.length > 0 && (
          <Animated.View style={makeSlide(card2Anim)}>
            <View style={[styles.card, styles.contributorsCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>💡</Text>
                <Text style={styles.cardTitle}>Possible Contributors</Text>
              </View>
              <View style={styles.contributorsList}>
                {analysis.possible_contributors.map((contributor, index) => (
                  <View key={index} style={styles.contributorItem}>
                    <View style={styles.contributorBadge}>
                      <Text style={styles.contributorNumber}>{index + 1}</Text>
                    </View>
                    <Text style={styles.contributorText}>{contributor}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Education Card */}
        <Animated.View style={makeSlide(card3Anim)}>
          <View style={[styles.card, styles.educationCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>📚</Text>
              <Text style={styles.cardTitle}>What You Can Do</Text>
            </View>
            <Text style={styles.cardBody}>{analysis.education}</Text>
          </View>
        </Animated.View>

        {/* Safety Note */}
        {analysis.safety_note ? (
          <Animated.View style={makeSlide(card4Anim)}>
            <View style={[styles.card, styles.safetyCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>⚠️</Text>
                <Text style={styles.cardTitle}>Safety Reminder</Text>
              </View>
              <Text style={styles.cardBody}>{analysis.safety_note}</Text>
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingTitle}>Building your recovery plan...</Text>
            <Text style={styles.loadingSubtitle}>
              Personalizing exercises and timeline for you
            </Text>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.generateButton, loading && styles.generateButtonDisabled]}
          onPress={handleGeneratePlan}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.generateButtonIcon}>📋</Text>
          <Text style={styles.generateButtonText}>Generate My Recovery Plan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>Back to Home</Text>
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
  scrollContent: {
    padding: Spacing.xxl,
    paddingBottom: 160,
  },
  header: {
    marginBottom: Spacing.xxl,
  },
  successBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.successLight,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: Spacing.md,
  },
  successBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.success,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
    lineHeight: 36,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
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
  contributorsCard: {
    borderLeftColor: Colors.secondary,
  },
  educationCard: {
    borderLeftColor: Colors.success,
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
  contributorsList: {
    gap: Spacing.md,
  },
  contributorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  contributorBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  contributorNumber: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },
  contributorText: {
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
    gap: Spacing.md,
  },
  generateButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  generateButtonDisabled: {
    backgroundColor: Colors.textMuted,
  },
  generateButtonIcon: {
    fontSize: 20,
  },
  generateButtonText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  backButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(250, 250, 250, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 40,
    alignItems: 'center',
    gap: Spacing.lg,
    width: '80%',
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
