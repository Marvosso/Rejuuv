import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '../../lib/theme';
import { INTAKE_AGGRAVATOR_OPTIONS } from '../../lib/intake-aggravator-options';
import { useIntakeWizard } from '../../lib/intake-wizard-context';
import { IntakeProgressHeader, AggravatorCheckboxRow } from '../../components/intake';

export default function AggravatorsScreen() {
  const router = useRouter();
  const {
    aggravators,
    toggleAggravator,
    customTriggerLine,
    setCustomTriggerLine,
  } = useIntakeWizard();
  const [other, setOther] = useState(customTriggerLine);

  useEffect(() => {
    setOther(customTriggerLine);
  }, [customTriggerLine]);

  const handleContinue = () => {
    setCustomTriggerLine(other.trim());
    router.push('/intake/summary');
  };

  const handleSkip = () => {
    setCustomTriggerLine(other.trim());
    router.push('/intake/summary');
  };

  return (
    <View style={styles.container}>
      <IntakeProgressHeader currentStep={4} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>What tends to stir it up?</Text>
        <Text style={styles.subtitle}>Optional — select any that apply. You can skip.</Text>

        {INTAKE_AGGRAVATOR_OPTIONS.map((option) => (
          <AggravatorCheckboxRow
            key={option}
            label={option}
            checked={aggravators.includes(option)}
            onToggle={() => toggleAggravator(option)}
          />
        ))}

        <Text style={styles.otherLabel}>Other</Text>
        <TextInput
          style={styles.otherInput}
          placeholder="e.g. Specific sport, job task…"
          placeholderTextColor={Colors.textMuted}
          value={other}
          onChangeText={setOther}
        />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.85}>
          <Text style={styles.skipBtnText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.continueButtonText}>See summary</Text>
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
  otherLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  otherInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.xxl,
    paddingBottom: 40,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skipBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  continueButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
