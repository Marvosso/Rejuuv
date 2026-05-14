import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius } from '../../lib/theme';

type Props = {
  currentStep: number;
  totalSteps?: number;
  onBack?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  showBack?: boolean;
};

export function IntakeProgressHeader({
  currentStep,
  totalSteps = 4,
  onBack,
  onCancel,
  cancelLabel = 'Cancel',
  showBack = true,
}: Props) {
  const pct = (currentStep / totalSteps) * 100;
  return (
    <>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      <View style={styles.topBar}>
        <Text style={styles.stepLabel}>
          Step {currentStep} of {totalSteps}
        </Text>
        <View style={styles.actions}>
          {showBack && onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.textBtn} hitSlop={8}>
              <Text style={styles.textBtnLabel}>← Back</Text>
            </TouchableOpacity>
          ) : null}
          {onCancel ? (
            <TouchableOpacity onPress={onCancel} style={styles.textBtn} hitSlop={8}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  progressTrack: {
    height: 4,
    backgroundColor: Colors.border,
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  textBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  textBtnLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  cancelText: {
    fontSize: 15,
    color: Colors.textMuted,
    fontWeight: '500',
  },
});
