import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radius } from '../../lib/theme';

const PAIN_EMOJIS = ['', '😊', '🙂', '😐', '😕', '😟', '😣', '😢', '😭', '😫', '🤯'];

const getPainColor = (level: number): string => {
  if (level <= 3) return Colors.success;
  if (level <= 6) return Colors.warning;
  return Colors.danger;
};

export default function PainLevelScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const bodyArea = (params.body_area as string) || '';
  const triggerParam = params.trigger as string | undefined;
  const trigger = triggerParam
    ? (typeof triggerParam === 'string'
        ? JSON.parse(decodeURIComponent(triggerParam))
        : triggerParam) as string[]
    : [];

  const [painLevel, setPainLevel] = useState(5);
  const painColor = getPainColor(painLevel);

  const handleContinue = () => {
    const params = new URLSearchParams({
      body_area: bodyArea,
      pain_level: painLevel.toString(),
    });
    if (trigger.length > 0) {
      params.set('trigger', encodeURIComponent(JSON.stringify(trigger)));
    }
    router.push(`/intake/aggravators?${params.toString()}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '50%' }]} />
      </View>
      <View style={styles.topBar}>
        <Text style={styles.progressLabel}>Step 2 of 4</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>How bad is it right now?</Text>
        <Text style={styles.subtitle}>Rate your pain from 1 (mild) to 10 (severe)</Text>

        <View style={styles.sliderSection}>
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
                  <Text
                    style={[
                      styles.painDotText,
                      { color: isActive ? Colors.textInverse : Colors.textMuted },
                    ]}
                  >
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
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.continueButtonText}>Continue</Text>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.sm,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backBtnText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
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
    marginBottom: Spacing.xxl,
    lineHeight: 24,
  },
  sliderSection: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
  },
  painLevelDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    gap: 8,
  },
  painEmoji: {
    fontSize: 36,
  },
  painLevelValue: {
    fontSize: 48,
    fontWeight: '800',
  },
  painLevelMax: {
    fontSize: 24,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  painScaleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  painDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  painDotActive: {
    borderWidth: 2,
    borderColor: Colors.textPrimary,
  },
  painDotText: {
    fontSize: 14,
    fontWeight: '700',
  },
  painScaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingHorizontal: 4,
  },
  painScaleLabel: {
    fontSize: 12,
    color: Colors.textMuted,
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
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 18,
    alignItems: 'center',
  },
  continueButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
