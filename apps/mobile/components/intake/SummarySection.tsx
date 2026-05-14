import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius } from '../../lib/theme';

type Props = {
  label: string;
  value: string;
  onEdit: () => void;
  isLast?: boolean;
};

export function SummarySection({ label, value, onEdit, isLast }: Props) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.main}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <TouchableOpacity onPress={onEdit} hitSlop={12} style={styles.editBtn}>
        <Text style={styles.editText}>Edit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  main: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  editBtn: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
  },
  editText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
});
