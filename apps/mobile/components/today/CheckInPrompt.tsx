import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Colors, Spacing, Radius, getShadow } from '../../lib/theme';
import type { PainChangeValue } from '../check-in-celebration';

const PAIN_CHANGE_CHIPS: { value: PainChangeValue; emoji: string }[] = [
  { value: 'Better', emoji: '😊' },
  { value: 'Same', emoji: '😐' },
  { value: 'Worse', emoji: '😟' },
];

function getPainColor(level: number): string {
  if (level <= 3) return Colors.success;
  if (level <= 6) return Colors.warning;
  if (level <= 8) return Colors.secondary;
  return Colors.danger;
}

type Props = {
  hasPlan: boolean;
  painLevel: number;
  onPainLevelChange: (n: number) => void;
  painChange: PainChangeValue;
  onPainChangeSelect: (v: PainChangeValue) => void;
  submitting: boolean;
  onSubmit: () => void;
  onOpenFullQuickCheckIn: () => void;
};

/**
 * Focused check-in strip: answers "How am I doing?" without crowding the hero card.
 * Copy stays invitational, not demanding (spec: low cognitive load).
 */
export function CheckInPrompt({
  hasPlan,
  painLevel,
  onPainLevelChange,
  painChange,
  onPainChangeSelect,
  submitting,
  onSubmit,
  onOpenFullQuickCheckIn,
}: Props) {
  const tint = getPainColor(Math.round(painLevel));

  if (!hasPlan) {
    return (
      <View style={[styles.card, getShadow('card'), styles.mutedCard]}>
        <Text style={styles.title}>Check-in</Text>
        <Text style={styles.lockedBody}>
          Once you have a plan, a ten-second pulse check lives here — no essay, just honesty with yourself.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, getShadow('card')]}>
      <Text style={styles.kicker}>Pulse check</Text>
      <Text style={styles.title}>How is your pain today?</Text>
      <Text style={styles.hint}>Slide, pick a vibe compared to yesterday, then save.</Text>

      <View style={styles.sliderRow}>
        <Text style={[styles.sliderValue, { color: tint }]}>{Math.round(painLevel)}</Text>
        <Text style={styles.sliderOutOf}>/10</Text>
      </View>

      {Platform.OS === 'web' ? (
        <View style={styles.painStepRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
            const active = Math.round(painLevel) === n;
            const c = getPainColor(n);
            return (
              <TouchableOpacity
                key={n}
                style={[styles.painStepDot, { borderColor: c }, active && { backgroundColor: c, borderWidth: 2 }]}
                onPress={() => onPainLevelChange(n)}
              >
                <Text style={[styles.painStepDotText, { color: active ? Colors.textInverse : c }]}>{n}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={painLevel}
          onValueChange={onPainLevelChange}
          minimumTrackTintColor={Colors.primary}
          maximumTrackTintColor={Colors.border}
          thumbTintColor={Colors.primaryDark}
        />
      )}

      <Text style={styles.comparedLabel}>Compared to yesterday</Text>
      <View style={styles.vibeRow}>
        {PAIN_CHANGE_CHIPS.map(({ value, emoji }) => {
          const on = painChange === value;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.vibeChip, on && styles.vibeChipOn]}
              onPress={() => onPainChangeSelect(value)}
              activeOpacity={0.85}
            >
              <Text style={styles.vibeEmoji}>{emoji}</Text>
              <Text style={[styles.vibeLabel, on && styles.vibeLabelOn]}>{value}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.logBtn, getShadow('button'), submitting && styles.logBtnDisabled]}
        onPress={onSubmit}
        disabled={submitting}
        activeOpacity={0.9}
      >
        <Text style={styles.logBtnText}>{submitting ? 'Saving…' : 'Save check-in'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onOpenFullQuickCheckIn} style={styles.linkBtn} hitSlop={8}>
        <Text style={styles.linkText}>More check-in options</Text>
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
  mutedCard: {
    backgroundColor: Colors.surfaceAlt,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  hint: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  lockedBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.sm,
  },
  sliderValue: { fontSize: 36, fontWeight: '800' },
  sliderOutOf: { fontSize: 16, fontWeight: '600', color: Colors.textMuted, marginLeft: 4 },
  slider: { width: '100%', height: 44, marginBottom: Spacing.lg },
  painStepRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.lg,
    justifyContent: 'center',
  },
  painStepDot: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  painStepDotText: { fontSize: 12, fontWeight: '700' },
  comparedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  vibeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  vibeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  vibeChipOn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  vibeEmoji: { fontSize: 20, marginBottom: 2 },
  vibeLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  vibeLabelOn: { color: Colors.primaryDark, fontWeight: '700' },
  logBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logBtnDisabled: { opacity: 0.65 },
  logBtnText: { color: Colors.textInverse, fontSize: 16, fontWeight: '700' },
  linkBtn: { alignItems: 'center', marginTop: Spacing.md, paddingVertical: Spacing.sm },
  linkText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
});
