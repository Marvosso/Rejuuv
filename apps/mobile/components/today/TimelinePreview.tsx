import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, getShadow } from '../../lib/theme';
import type { CheckInLike } from '../../lib/today-recovery-state';

type Props = {
  checkIns: CheckInLike[];
  onOpenFull: () => void;
};

function painDotColor(level: number | null): string {
  if (level == null) return Colors.textMuted;
  if (level <= 3) return Colors.success;
  if (level <= 6) return Colors.warning;
  if (level <= 8) return Colors.secondary;
  return Colors.danger;
}

function formatShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * Compact continuity strip: recent logs as dots (not a full timeline screen).
 * Reinforces "remembered journey" without duplicating the Progress chart.
 */
export function TimelinePreview({ checkIns, onOpenFull }: Props) {
  const recent = [...checkIns]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    <View style={[styles.card, getShadow('card')]}>
      <View style={styles.headRow}>
        <Text style={styles.title}>Recent check-ins</Text>
        <TouchableOpacity onPress={onOpenFull} hitSlop={10}>
          <Text style={styles.link}>See full progress</Text>
        </TouchableOpacity>
      </View>
      {recent.length === 0 ? (
        <Text style={styles.empty}>When you log how you feel, a gentle trail appears here.</Text>
      ) : (
        <View style={styles.dotsRow}>
          {recent
            .slice()
            .reverse()
            .map((c, i) => (
              <View key={`${c.created_at}-${i}`} style={styles.dotCol}>
                <View style={[styles.dot, { backgroundColor: painDotColor(c.pain_level) }]} />
                <Text style={styles.dotDate}>{formatShort(c.created_at)}</Text>
              </View>
            ))}
        </View>
      )}
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
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  empty: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  dotCol: {
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 6,
    opacity: 0.9,
  },
  dotDate: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
