import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius } from '../../lib/theme';

export type PhaseOverviewLine = {
  phase: 1 | 2 | 3;
  label: string;
  range: string;
  goal: string;
};

export type PlanOverviewCardProps = {
  bodyAreaLabel: string;
  focusAreas: string[];
  phaseLines: PhaseOverviewLine[];
};

function buildFocusBlurb(bodyAreaLabel: string, focusAreas: string[]): string {
  const trimmed = focusAreas.map((s) => s.trim()).filter(Boolean);
  const areaPhrase =
    bodyAreaLabel === 'Your recovery' ? 'this area' : bodyAreaLabel.toLowerCase();
  if (trimmed.length === 0) {
    return `You're building a calmer, stronger movement pattern for ${areaPhrase} with small, consistent steps.`;
  }
  const lead = trimmed.slice(0, 2).join(' and ');
  return `You're focusing on ${lead} for ${areaPhrase} — one phase at a time.`;
}

export function PlanOverviewCard({ bodyAreaLabel, focusAreas, phaseLines }: PlanOverviewCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.inner}>
        <Text style={styles.kicker}>Your plan at a glance</Text>
        <Text style={styles.area}>{bodyAreaLabel}</Text>
        <Text style={styles.blurb}>{buildFocusBlurb(bodyAreaLabel, focusAreas)}</Text>

        <Text style={styles.phasesTitle}>Three phases</Text>
        {phaseLines.map((line) => (
          <View key={line.phase} style={styles.phaseRow}>
            <View style={[styles.phaseDot, phaseDotColor(line.phase)]} />
            <View style={styles.phaseText}>
              <Text style={styles.phaseLabel}>
                {line.label} · {line.range}
              </Text>
              <Text style={styles.phaseGoal} numberOfLines={3}>
                {line.goal || 'Gentle progression as you rebuild confidence.'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function phaseDotColor(phase: 1 | 2 | 3) {
  switch (phase) {
    case 1:
      return { backgroundColor: Colors.phase1 };
    case 2:
      return { backgroundColor: Colors.phase2 };
    default:
      return { backgroundColor: Colors.phase3 };
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.2)',
  },
  accent: {
    height: 4,
    backgroundColor: Colors.primary,
    opacity: 0.9,
  },
  inner: {
    padding: Spacing.xxl,
    gap: Spacing.md,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  area: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  blurb: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 23,
    marginBottom: Spacing.sm,
  },
  phasesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  phaseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
    flexShrink: 0,
  },
  phaseText: {
    flex: 1,
    gap: 2,
  },
  phaseLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  phaseGoal: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
});
