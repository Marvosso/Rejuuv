import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, getShadow } from '../../lib/theme';
import type {
  TimelineAdaptationEntry,
  TimelineCheckInEntry,
  TimelineMilestoneEntry,
} from '../../lib/recovery-timeline-types';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

export function TimelineCheckInCard({ entry }: { entry: TimelineCheckInEntry }) {
  return (
    <View style={[styles.card, getShadow('card')]}>
      <View style={styles.rowTop}>
        <Text style={styles.kind}>Check-in</Text>
        <Text style={styles.when}>{formatWhen(entry.at)}</Text>
      </View>
      {entry.flare_note ? (
        <View style={styles.flareBand}>
          <Text style={styles.flareText}>{entry.flare_note}</Text>
        </View>
      ) : null}
      <Text style={styles.title}>
        {entry.pain_level != null ? `Pain ${entry.pain_level}/10` : 'Logged (no score)'}
        {entry.is_quick ? ' · Quick' : ''}
      </Text>
      <Text style={styles.meta}>
        {entry.pain_change} · {entry.difficulty}
      </Text>
    </View>
  );
}

export function TimelineAdaptationCard({ entry }: { entry: TimelineAdaptationEntry }) {
  return (
    <View style={[styles.card, styles.adaptCard, getShadow('card')]}>
      <View style={styles.rowTop}>
        <Text style={styles.kindAdapt}>Plan adapted</Text>
        <Text style={styles.when}>{formatWhen(entry.at)}</Text>
      </View>
      <Text style={styles.adaptTitle}>{entry.title}</Text>
      <Text style={styles.adaptBody}>{entry.description}</Text>
    </View>
  );
}

export function TimelineMilestoneCard({ entry }: { entry: TimelineMilestoneEntry }) {
  return (
    <View style={[styles.card, styles.milestoneCard, getShadow('none')]}>
      <Text style={styles.milestoneKicker}>Milestone</Text>
      <Text style={styles.milestoneTitle}>{entry.title}</Text>
      <Text style={styles.milestoneBody}>{entry.description}</Text>
      <Text style={styles.whenMuted}>{formatWhen(entry.at)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  adaptCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  milestoneCard: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary + '44',
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  kind: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  kindAdapt: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  when: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  whenMuted: { fontSize: 11, color: Colors.textMuted, marginTop: Spacing.sm },
  flareBand: {
    backgroundColor: Colors.warningLight,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.warning + '55',
  },
  flareText: { fontSize: 13, color: Colors.textPrimary, lineHeight: 19 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  meta: { fontSize: 13, color: Colors.textSecondary },
  adaptTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xs },
  adaptBody: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  milestoneKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  milestoneTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xs },
  milestoneBody: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
