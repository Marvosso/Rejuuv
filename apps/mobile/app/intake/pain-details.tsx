import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Shadows, Spacing, Radius } from '../../lib/theme';

const PAIN_TYPES = ['Sharp', 'Dull', 'Burning', 'Throbbing', 'Stabbing', 'Aching', 'Stiffness', 'Numbness'];
const DURATIONS = ['Less than 1 week', '1–4 weeks', '1–3 months', '3–6 months', '6+ months'];
const TRIGGERS = ['Movement', 'Rest', 'Morning', 'Night', 'Exercise', 'Sitting', 'Standing', 'Lifting'];
const MOVEMENT_LIMITATIONS = ['Bending', 'Lifting', 'Walking', 'Sleeping', 'Sitting', 'Standing', 'Reaching', 'Twisting'];

const PAIN_EMOJIS = ['', '😊', '🙂', '😐', '😕', '😟', '😣', '😢', '😭', '😫', '🤯'];

const getPainColor = (level: number): string => {
  if (level <= 3) return Colors.success;
  if (level <= 6) return Colors.warning;
  return Colors.danger;
};

export default function PainDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const bodyArea = (params.body_area as string) || '';
  const specificLocation = (params.specific_location as string) || '';

  const [painType, setPainType] = useState<string[]>([]);
  const [duration, setDuration] = useState('');
  const [trigger, setTrigger] = useState<string[]>([]);
  const [painLevel, setPainLevel] = useState(5);
  const [movementLimitations, setMovementLimitations] = useState<string[]>([]);

  const toggleItem = (item: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const handleReview = () => {
    const params = new URLSearchParams({
      body_area: bodyArea,
      specific_location: specificLocation,
      pain_type: encodeURIComponent(JSON.stringify(painType)),
      duration,
      trigger: encodeURIComponent(JSON.stringify(trigger)),
      pain_level: painLevel.toString(),
      movement_limitations: encodeURIComponent(JSON.stringify(movementLimitations)),
    });
    router.push(`/intake/review?${params.toString()}`);
  };

  const painColor = getPainColor(painLevel);

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '50%' }]} />
      </View>
      <Text style={styles.progressLabel}>Step 2 of 4</Text>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Tell us more</Text>
        <Text style={styles.subtitle}>Help us understand your pain better</Text>

        {/* Pain Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pain Type</Text>
          <Text style={styles.sectionSubtitle}>Select all that apply</Text>
          <View style={styles.chipGrid}>
            {PAIN_TYPES.map((type) => {
              const isSelected = painType.includes(type);
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => toggleItem(type, painType, setPainType)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{type}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Pain Level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pain Level</Text>
          <View style={styles.painLevelDisplay}>
            <Text style={styles.painEmoji}>{PAIN_EMOJIS[painLevel]}</Text>
            <Text style={[styles.painLevelValue, { color: painColor }]}>{painLevel}</Text>
            <Text style={styles.painLevelMax}>/10</Text>
          </View>
          <View style={styles.painScaleRow}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => {
              const lvlColor = getPainColor(level);
              const isActive = level <= painLevel;
              return (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.painDot,
                    { backgroundColor: isActive ? lvlColor : Colors.inputBg },
                    painLevel === level && styles.painDotActive,
                  ]}
                  onPress={() => setPainLevel(level)}
                >
                  <Text style={[styles.painDotText, { color: isActive ? Colors.textInverse : Colors.textMuted }]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.painScaleLabels}>
            <Text style={styles.painScaleLabel}>Mild</Text>
            <Text style={styles.painScaleLabel}>Moderate</Text>
            <Text style={styles.painScaleLabel}>Severe</Text>
          </View>
        </View>

        {/* Duration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How long?</Text>
          <View style={styles.chipGrid}>
            {DURATIONS.map((d) => {
              const isSelected = duration === d;
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setDuration(d)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Triggers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What makes it worse?</Text>
          <Text style={styles.sectionSubtitle}>Select all that apply</Text>
          <View style={styles.chipGrid}>
            {TRIGGERS.map((t) => {
              const isSelected = trigger.includes(t);
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => toggleItem(t, trigger, setTrigger)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Movement Limitations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Movement limitations</Text>
          <Text style={styles.sectionSubtitle}>What's difficult to do?</Text>
          <View style={styles.chipGrid}>
            {MOVEMENT_LIMITATIONS.map((limit) => {
              const isSelected = movementLimitations.includes(limit);
              return (
                <TouchableOpacity
                  key={limit}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => toggleItem(limit, movementLimitations, setMovementLimitations)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{limit}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.reviewButton}
          onPress={handleReview}
          activeOpacity={0.85}
        >
          <Text style={styles.reviewButtonText}>Review Answers</Text>
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
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  painLevelDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  painEmoji: {
    fontSize: 32,
  },
  painLevelValue: {
    fontSize: 40,
    fontWeight: '800',
  },
  painLevelMax: {
    fontSize: 20,
    color: Colors.textMuted,
    fontWeight: '500',
    marginTop: 8,
  },
  painScaleRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  painDot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  painDotActive: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  painDotText: {
    fontSize: 11,
    fontWeight: '700',
  },
  painScaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  painScaleLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
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
  backButton: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  reviewButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
