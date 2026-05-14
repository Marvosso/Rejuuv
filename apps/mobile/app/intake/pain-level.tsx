import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '../../lib/theme';
import { useIntakeWizard } from '../../lib/intake-wizard-context';
import { microInsightForPainBand } from '../../lib/intake-micro-insights';
import { IntakeProgressHeader, IntakeMicroInsight } from '../../components/intake';

const PAIN_EMOJIS = ['', '😊', '🙂', '😐', '😕', '😟', '😣', '😢', '😭', '😫', '🤯'];

const getPainColor = (level: number): string => {
  if (level <= 3) return Colors.success;
  if (level <= 6) return Colors.warning;
  return Colors.danger;
};

export default function PainLevelScreen() {
  const router = useRouter();
  const { painLevel: ctxPain, setPainLevel } = useIntakeWizard();
  const [painLevel, setLocal] = useState(ctxPain || 5);

  useEffect(() => {
    setLocal(ctxPain);
  }, [ctxPain]);

  const painColor = getPainColor(painLevel);
  const insight = microInsightForPainBand(painLevel);

  const handleContinue = () => {
    setPainLevel(painLevel);
    router.push('/intake/profile');
  };

  return (
    <View style={styles.container}>
      <IntakeProgressHeader currentStep={2} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>How intense is it right now?</Text>
        <Text style={styles.subtitle}>1 is mild, 10 is the worst you can imagine. Tap a number.</Text>

        {insight ? <IntakeMicroInsight message={insight} /> : null}

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
                  onPress={() => setLocal(level)}
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
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  sliderSection: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginTop: Spacing.sm,
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
