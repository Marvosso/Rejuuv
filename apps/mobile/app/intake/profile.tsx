import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '../../lib/theme';
import { INTAKE_PROFILES, type ProfileId } from '../../lib/intake-profiles';
import { useIntakeWizard } from '../../lib/intake-wizard-context';
import { microInsightForProfile } from '../../lib/intake-micro-insights';
import { IntakeProgressHeader, IntakeMicroInsight, ProfileOptionCard } from '../../components/intake';

export default function ProfileScreen() {
  const router = useRouter();
  const { profileId, applyProfile } = useIntakeWizard();

  const goNext = () => {
    router.push('/intake/aggravators');
  };

  const onSelect = (id: ProfileId) => {
    applyProfile(id);
  };

  const insight = microInsightForProfile(profileId);

  return (
    <View style={styles.container}>
      <IntakeProgressHeader currentStep={3} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Optional shortcuts</Text>
        <Text style={styles.title}>Quick start profile</Text>
        <Text style={styles.subtitle}>
          These pre-fill common aggravators and context. Skip if you prefer to choose everything yourself
          on the next step.
        </Text>

        {insight ? <IntakeMicroInsight message={insight} /> : null}

        {INTAKE_PROFILES.map((p) => (
          <ProfileOptionCard
            key={p.id}
            title={p.title}
            helper={p.helper}
            emoji={p.emoji}
            selected={profileId === p.id}
            onPress={() => onSelect(p.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={goNext} activeOpacity={0.85}>
          <Text style={styles.secondaryBtnText}>Skip — I will set details myself</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueButton} onPress={goNext} activeOpacity={0.85}>
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
    paddingBottom: 160,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xxl,
    paddingBottom: 36,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.md,
  },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
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
