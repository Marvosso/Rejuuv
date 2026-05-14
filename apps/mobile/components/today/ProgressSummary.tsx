import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, getShadow } from '../../lib/theme';

type Trend = 'improving' | 'stable' | 'worsening' | string | undefined;

type Props = {
  streakDays: number;
  totalCheckIns: number;
  avgPain: number | null;
  trend: Trend;
};

function trendLabel(t: Trend): string {
  if (t === 'improving') return 'Pain trend: easing gently';
  if (t === 'worsening') return 'Pain trend: a rough patch — we will keep things light';
  return 'Pain trend: steady';
}

/**
 * Reassurance-first metrics: no guilt, no aggressive gamification.
 * Streak is framed as "continuity" not a scoreboard (spec: supportive retention).
 */
export function ProgressSummary({ streakDays, totalCheckIns, avgPain, trend }: Props) {
  const continuity =
    streakDays > 0
      ? `${streakDays} day${streakDays === 1 ? '' : 's'} of showing up for yourself`
      : 'Each log is a small act of self-care';

  return (
    <View style={[styles.card, getShadow('card')]}>
      <Text style={styles.title}>Progress at a glance</Text>
      <Text style={styles.continuity}>{continuity}</Text>
      <View style={styles.row}>
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>Check-ins logged</Text>
          <Text style={styles.pillValue}>{totalCheckIns}</Text>
        </View>
        {avgPain != null ? (
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>Avg pain (recent)</Text>
            <Text style={styles.pillValue}>{avgPain}/10</Text>
          </View>
        ) : (
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>Avg pain</Text>
            <Text style={styles.pillMuted}>—</Text>
          </View>
        )}
      </View>
      <Text style={styles.trend}>{trendLabel(trend)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  continuity: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pill: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pillValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  pillMuted: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  trend: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
});
