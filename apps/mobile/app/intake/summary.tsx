import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetchJson } from '../../lib/api-fetch';
import { Colors, Spacing, Radius } from '../../lib/theme';
import { getBodyAreaDisplayName } from '../../lib/intake-constants';
import { INTAKE_PROFILES } from '../../lib/intake-profiles';
import { useIntakeWizard } from '../../lib/intake-wizard-context';
import { SummarySection } from '../../components/intake';
import { trackClientTelemetry } from '../../lib/telemetry';

const PAIN_EMOJIS = ['', '😊', '🙂', '😐', '😕', '😟', '😣', '😢', '😭', '😫', '🤯'];

function formatArray(arr: string[]): string {
  return Array.isArray(arr) && arr.length ? arr.join(' · ') : '—';
}

export default function SummaryScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const {
    bodyArea,
    painLevel,
    profileId,
    notes,
    setNotes,
    buildIntakePayload,
  } = useIntakeWizard();

  const intakeData = buildIntakePayload();

  const profileLabel =
    profileId && profileId !== 'custom'
      ? INTAKE_PROFILES.find((p) => p.id === profileId)?.title ?? '—'
      : profileId === 'custom'
        ? 'Custom / scratch'
        : 'No profile shortcut';

  const triggerDisplay = formatArray(intakeData.trigger);
  const limitationsDisplay = formatArray(intakeData.movement_limitations);

  useEffect(() => {
    void trackClientTelemetry('onboarding_step_viewed', { step: 'summary' });
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const payload = buildIntakePayload();

      const result = await apiFetchJson<Record<string, unknown>>('/assessments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!result.ok) {
        throw new Error(result.message || `Failed to submit assessment: ${result.status}`);
      }

      const data = result.data;

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
      const intakeDataParam = encodeURIComponent(JSON.stringify(payload));
      const bodyAreaParam = encodeURIComponent(payload.body_area);
      const aid =
        typeof data.assessment_id === 'string' && data.assessment_id.length > 0
          ? `&assessment_id=${encodeURIComponent(data.assessment_id)}`
          : '';
      void trackClientTelemetry('onboarding_completed', {
        body_area: typeof payload.body_area === 'string' ? payload.body_area : null,
      });
      router.push(
        `/analysis/day1-win?body_area=${bodyAreaParam}&analysis=${analysisData}&intakeData=${intakeDataParam}${aid}`
      );
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

  if (!bodyArea) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Nothing to show yet</Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={() => router.replace('/intake/body-area?reset=1')}>
          <Text style={styles.emptyBtnText}>Start assessment</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: '100%' }]} />
      </View>
      <Text style={styles.progressLabel}>Summary</Text>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Here's what we heard</Text>
        <Text style={styles.subtitle}>Tap Edit to change any section. When you're ready, generate your plan.</Text>

        <View style={styles.card}>
          <SummarySection
            label="Body area"
            value={getBodyAreaDisplayName(bodyArea)}
            onEdit={() => router.push('/intake/body-area')}
          />
          <SummarySection
            label="Pain level"
            value={`${PAIN_EMOJIS[painLevel]} ${painLevel} / 10`}
            onEdit={() => router.push('/intake/pain-level')}
          />
          <SummarySection label="Quick start profile" value={profileLabel} onEdit={() => router.push('/intake/profile')} />
          <SummarySection
            label="Aggravators & context"
            value={
              triggerDisplay === '—' && limitationsDisplay === '—'
                ? 'None selected'
                : [triggerDisplay, limitationsDisplay !== '—' ? `Limitations: ${limitationsDisplay}` : '']
                    .filter(Boolean)
                    .join('\n')
            }
            onEdit={() => router.push('/intake/aggravators')}
          />

          <View style={styles.notesBlock}>
            <Text style={styles.notesLabel}>Anything else? (optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Short context helps us personalize further…"
              placeholderTextColor={Colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.ctaHint}>
          <Text style={styles.ctaHintText}>
            We'll use this snapshot to build your recovery plan — you can always run another assessment later.
          </Text>
        </View>
      </ScrollView>

      {loading ? (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingTitle}>Creating your plan…</Text>
            <Text style={styles.loadingSubtitle}>Usually 10–15 seconds</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.generateBtn}
          onPress={handleGenerate}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.generateBtnText}>Generate My Personalized Recovery Plan</Text>
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
  progressTrack: {
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
    paddingBottom: 120,
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
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notesBlock: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  notesInput: {
    minHeight: 88,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  ctaHint: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  ctaHintText: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 21,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
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
  },
  generateBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 18,
    alignItems: 'center',
  },
  generateBtnText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
    backgroundColor: Colors.background,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  emptyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
  },
  emptyBtnText: {
    color: Colors.textInverse,
    fontWeight: '700',
    fontSize: 16,
  },
});
