import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, getShadow } from '../../lib/theme';
import type { TodayRecoveryState } from '../../lib/today-recovery-state';

type Props = {
  recoveryState: TodayRecoveryState;
  hasPlan: boolean;
  bodyAreaLabel: string;
  /** First suggested movement name, or null */
  focusExercise: string | null;
  onPrimaryPress: () => void;
};

/**
 * Single dominant card answering "What should I do today?"
 * Hierarchy: one title, one supporting line, one primary button — avoids competing CTAs.
 */
export function DailyActionCard({
  recoveryState,
  hasPlan,
  bodyAreaLabel,
  focusExercise,
  onPrimaryPress,
}: Props) {
  const soft = recoveryState !== 'stable';
  const title = hasPlan ? "Today's recovery focus" : 'Begin where you are';
  const subtitle = hasPlan
    ? focusExercise
      ? `Gentle work for ${bodyAreaLabel}: start with ${focusExercise}.`
      : `Continue your ${bodyAreaLabel} plan at a pace that feels kind today.`
    : 'A short assessment helps us shape safe, personalized guidance for your body.';
  const cta = hasPlan ? 'Open my plan' : 'Start assessment';

  return (
    <View style={[styles.card, getShadow('card'), soft && styles.cardSoft]}>
      <Text style={styles.kicker}>Your next step</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <TouchableOpacity
        style={[styles.btn, getShadow('button'), soft && styles.btnSoft]}
        onPress={onPrimaryPress}
        activeOpacity={0.88}
      >
        <Text style={styles.btnText}>{cta}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardSoft: {
    borderColor: Colors.border,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: Spacing.sm,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnSoft: {
    backgroundColor: Colors.primaryDark,
  },
  btnText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
});
