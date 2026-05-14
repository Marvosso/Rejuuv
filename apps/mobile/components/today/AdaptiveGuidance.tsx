import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TodayRecoveryState } from '../../lib/today-recovery-state';
import { Colors, Spacing, Radius } from '../../lib/theme';

type Props = {
  state: TodayRecoveryState;
};

const COPY: Record<
  TodayRecoveryState,
  { title: string; body: string; accent: string; bg: string }
> = {
  stable: {
    title: 'You are building steady rhythm',
    body: 'Small, consistent steps matter more than perfect weeks. Your journey is unfolding gently.',
    accent: Colors.primaryDark,
    bg: Colors.primaryLight,
  },
  flare_up: {
    title: 'It is okay to ease the pace',
    body: 'Bodies fluctuate. Favor lighter movement today, rest well, and keep logging — we will adjust with you.',
    accent: '#B45309',
    bg: Colors.warningLight,
  },
  escalation: {
    title: 'When pain is this high, extra care helps',
    body: 'Consider checking in with a clinician or therapist who knows you. Rejuuv can support movement habits, not replace medical care.',
    accent: Colors.primaryDark,
    bg: '#E0F2FE',
  },
};

/**
 * Sits high on Today so emotional tone is set before the primary action.
 * Flare-up and escalation use softer/warmer or cooler neutrals — not harsh red alerts.
 */
export function AdaptiveGuidance({ state }: Props) {
  const c = COPY[state];
  return (
    <View style={[styles.wrap, { backgroundColor: c.bg, borderLeftColor: c.accent }]}>
      <Text style={[styles.title, { color: c.accent }]}>{c.title}</Text>
      <Text style={styles.body}>{c.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  body: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
});
