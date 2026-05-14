import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, getShadow } from '../../lib/theme';

type Props = {
  dailyTip: string | null;
  trend: string | undefined;
};

/**
 * Secondary educational reassurance — never competes with DailyActionCard.
 * Prefers server tip; falls back to trend-based copy when no tip.
 */
export function RecoveryInsightCard({ dailyTip, trend }: Props) {
  let body = dailyTip;
  if (!body) {
    if (trend === 'improving') {
      body = 'Your recent logs suggest things may be moving in a kinder direction. Keep the pace sustainable.';
    } else if (trend === 'worsening') {
      body = 'A rough patch does not erase progress. Lighter days are still forward motion.';
    } else {
      body = 'Consistency beats intensity. A short check-in tomorrow still counts.';
    }
  }

  return (
    <View style={[styles.card, getShadow('card')]}>
      <Text style={styles.kicker}>A gentle note</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
});
