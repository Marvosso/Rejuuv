import { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AccordionSection } from './AccordionSection';
import { Colors, Spacing } from '../../lib/theme';

type Props = {
  dailyHabits: string[];
  redFlags: string[];
};

export function PlanSafetyHabitsAccordion({ dailyHabits, redFlags }: Props) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded((e) => !e), []);

  if (dailyHabits.length === 0 && redFlags.length === 0) return null;

  return (
    <AccordionSection
      title="Safety & daily habits"
      subtitle="Supporting habits and when to get help"
      expanded={expanded}
      onToggle={toggle}
      leftAccentColor={Colors.primary}
    >
      {dailyHabits.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Daily habits</Text>
          {dailyHabits.map((h, i) => (
            <View key={i} style={styles.row}>
              <View style={[styles.dot, styles.dotHabit]} />
              <Text style={styles.rowText}>{h}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {redFlags.length > 0 ? (
        <View style={[styles.block, dailyHabits.length > 0 && styles.blockSpaced]}>
          <Text style={styles.blockTitle}>When to seek care</Text>
          <Text style={styles.blockHint}>Contact a clinician if you notice:</Text>
          {redFlags.map((f, i) => (
            <View key={i} style={styles.row}>
              <View style={[styles.dot, styles.dotFlag]} />
              <Text style={styles.rowText}>{f}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </AccordionSection>
  );
}

const styles = StyleSheet.create({
  block: {},
  blockSpaced: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  blockHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: 6,
    flexShrink: 0,
  },
  dotHabit: {
    backgroundColor: Colors.success,
  },
  dotFlag: {
    backgroundColor: Colors.danger,
  },
  rowText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
});
