import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getSession } from '../../lib/auth';
import { Colors, Shadows, Spacing, Radius } from '../../lib/theme';

const BODY_AREA_COLORS: Record<string, string> = {
  neck:       Colors.primary,
  shoulder:   '#8B5CF6',
  upper_back: '#F59E0B',
  lower_back: Colors.secondary,
  hip:        '#EF4444',
  knee:       Colors.success,
  ankle:      '#06B6D4',
};

const getPainLevelColor = (level: number): string => {
  if (level <= 3) return Colors.success;
  if (level <= 6) return Colors.warning;
  return Colors.danger;
};

const PAIN_EMOJIS = ['', '😊', '🙂', '😐', '😕', '😟', '😣', '😢', '😭', '😫', '🤯'];

export default function ReviewScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();

  const bodyArea = (params.body_area as string) || '';
  const specificLocation = (params.specific_location as string) || '';
  const painType = params.pain_type
    ? typeof params.pain_type === 'string'
      ? JSON.parse(decodeURIComponent(params.pain_type))
      : params.pain_type
    : [];
  const duration = (params.duration as string) || '';
  const trigger = params.trigger
    ? typeof params.trigger === 'string'
      ? JSON.parse(decodeURIComponent(params.trigger))
      : params.trigger
    : [];
  const painLevel = parseInt((params.pain_level as string) || '0', 10);
  const movementLimitations = params.movement_limitations
    ? typeof params.movement_limitations === 'string'
      ? JSON.parse(decodeURIComponent(params.movement_limitations))
      : params.movement_limitations
    : [];

  const intakeData = {
    body_area: bodyArea,
    specific_location: specificLocation,
    pain_type: painType,
    duration: duration,
    trigger: trigger,
    pain_level: painLevel,
    movement_limitations: movementLimitations,
  };

  const handleGetAnalysis = async () => {
    setLoading(true);
    try {
      const session = await getSession();
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

      const response = await fetch(`${apiUrl}/assessments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify(intakeData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to submit assessment: ${response.status}`);
      }

      const data = await response.json();

      if (data.blocked === true) {
        const safetyParam = encodeURIComponent(
          JSON.stringify({
            message: data.message || 'We detected some concerning symptoms.',
            recommended_action: data.recommended_action || 'Please seek immediate medical attention.',
          })
        );
        router.push(`/intake/safety-alert?safety=${safetyParam}`);
        return;
      }

      const analysisData = encodeURIComponent(JSON.stringify(data));
      const intakeDataParam = encodeURIComponent(JSON.stringify(intakeData));
      router.push(`/analysis/results?analysis=${analysisData}&intakeData=${intakeDataParam}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        'Submission Error',
        `Something went wrong: ${errorMessage}. Please make sure the backend server is running.`,
        [{ text: 'OK' }]
      );
      setLoading(false);
    }
  };

  const formatArray = (arr: string[]): string =>
    Array.isArray(arr) ? arr.join(' · ') : '';

  const getBodyAreaDisplayName = (area: string): string => {
    const names: Record<string, string> = {
      neck:       'Neck',
      shoulder:   'Shoulder',
      upper_back: 'Upper Back',
      lower_back: 'Lower Back',
      hip:        'Hip',
      knee:       'Knee',
      ankle:      'Ankle',
    };
    return names[area] || area.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const areaColor = BODY_AREA_COLORS[bodyArea] || Colors.primary;
  const painColor = getPainLevelColor(painLevel);

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '75%' }]} />
      </View>
      <Text style={styles.progressLabel}>Step 3 of 4</Text>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Review your info</Text>
        <Text style={styles.subtitle}>Make sure everything looks right before we analyze</Text>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          {/* Body Area */}
          <View style={[styles.reviewRow, styles.reviewRowFirst]}>
            <View style={[styles.labelContainer, { borderLeftColor: areaColor }]}>
              <Text style={styles.rowLabel}>Body Area</Text>
              <View style={[styles.areaBadge, { backgroundColor: areaColor }]}>
                <Text style={styles.areaBadgeText}>{getBodyAreaDisplayName(bodyArea)}</Text>
              </View>
            </View>
          </View>

          {specificLocation ? (
            <View style={styles.reviewRow}>
              <Text style={styles.rowLabel}>Location</Text>
              <Text style={styles.rowValue}>{specificLocation}</Text>
            </View>
          ) : null}

          {painType.length > 0 ? (
            <View style={styles.reviewRow}>
              <Text style={styles.rowLabel}>Pain Type</Text>
              <Text style={styles.rowValue}>{formatArray(painType)}</Text>
            </View>
          ) : null}

          {duration ? (
            <View style={styles.reviewRow}>
              <Text style={styles.rowLabel}>Duration</Text>
              <Text style={styles.rowValue}>{duration}</Text>
            </View>
          ) : null}

          <View style={styles.reviewRow}>
            <Text style={styles.rowLabel}>Pain Level</Text>
            <View style={styles.painLevelDisplay}>
              <Text style={styles.painEmoji}>{PAIN_EMOJIS[painLevel]}</Text>
              <View style={[styles.painLevelDot, { backgroundColor: painColor }]} />
              <Text style={[styles.painLevelValue, { color: painColor }]}>
                {painLevel} / 10
              </Text>
            </View>
          </View>

          {trigger.length > 0 ? (
            <View style={styles.reviewRow}>
              <Text style={styles.rowLabel}>Triggers</Text>
              <Text style={styles.rowValue}>{formatArray(trigger)}</Text>
            </View>
          ) : null}

          {movementLimitations.length > 0 ? (
            <View style={[styles.reviewRow, styles.reviewRowLast]}>
              <Text style={styles.rowLabel}>Limitations</Text>
              <Text style={styles.rowValue}>{formatArray(movementLimitations)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.readyCard}>
          <Text style={styles.readyEmoji}>🤖</Text>
          <View>
            <Text style={styles.readyTitle}>Ready for AI Analysis</Text>
            <Text style={styles.readySubtitle}>Our AI will analyze your symptoms and create a personalized recovery plan</Text>
          </View>
        </View>
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingTitle}>Analyzing your symptoms...</Text>
            <Text style={styles.loadingSubtitle}>This usually takes 10-15 seconds</Text>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.back()}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.editButtonText}>← Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.analyzeButton, loading && styles.analyzeButtonDisabled]}
          onPress={handleGetAnalysis}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.analyzeButtonText}>Get My Analysis</Text>
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
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  scrollContent: {
    padding: Spacing.xxl,
    paddingBottom: 130,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 24,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  reviewRow: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
    gap: 6,
  },
  reviewRowFirst: {
    paddingTop: Spacing.xl,
  },
  reviewRowLast: {
    borderBottomWidth: 0,
    paddingBottom: Spacing.xl,
  },
  labelContainer: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.md,
    gap: 8,
    marginLeft: -Spacing.xxl,
    paddingRight: Spacing.xxl,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rowValue: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '500',
    lineHeight: 24,
  },
  areaBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  areaBadgeText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
  painLevelDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  painEmoji: {
    fontSize: 20,
  },
  painLevelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  painLevelValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  readyCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  readyEmoji: {
    fontSize: 32,
  },
  readyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 4,
  },
  readySubtitle: {
    fontSize: 13,
    color: Colors.primary,
    lineHeight: 19,
    flex: 1,
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
    flexDirection: 'row',
    gap: Spacing.md,
  },
  editButton: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  analyzeButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeButtonDisabled: {
    backgroundColor: Colors.textMuted,
  },
  analyzeButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
