import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radius } from '../../lib/theme';

const AGGRAVATOR_OPTIONS = [
  'Sitting long periods',
  'Morning stiffness',
  'After exercise',
];

export default function AggravatorsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const bodyArea = (params.body_area as string) || '';
  const painLevel = (params.pain_level as string) || '5';
  const triggerParam = params.trigger as string | undefined;
  const existingTrigger = triggerParam
    ? (typeof triggerParam === 'string'
        ? JSON.parse(decodeURIComponent(triggerParam))
        : triggerParam) as string[]
    : [];

  const [selected, setSelected] = useState<string[]>(existingTrigger);
  const [otherText, setOtherText] = useState('');

  const toggle = (option: string) => {
    setSelected((prev) =>
      prev.includes(option) ? prev.filter((s) => s !== option) : [...prev, option]
    );
  };

  const handleContinue = () => {
    const trigger = otherText.trim()
      ? [...selected, otherText.trim()]
      : selected;
    const params = new URLSearchParams({
      body_area: bodyArea,
      pain_level: painLevel,
      trigger: encodeURIComponent(JSON.stringify(trigger)),
    });
    router.push(`/intake/tell-more?${params.toString()}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '75%' }]} />
      </View>
      <View style={styles.topBar}>
        <Text style={styles.progressLabel}>Step 3 of 4</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>What makes it worse?</Text>
        <Text style={styles.subtitle}>Tap all that apply (optional)</Text>

        <View style={styles.chipRow}>
          {AGGRAVATOR_OPTIONS.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <TouchableOpacity
                key={option}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggle(option)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.otherSection}>
          <Text style={styles.otherLabel}>Other (optional)</Text>
          <TextInput
            style={styles.otherInput}
            placeholder="e.g. Lifting, driving..."
            placeholderTextColor={Colors.textMuted}
            value={otherText}
            onChangeText={setOtherText}
          />
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.inputBg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  chipTextSelected: {
    color: Colors.primaryDark,
  },
  otherSection: {
    marginTop: Spacing.lg,
  },
  otherLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  otherInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
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
