import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getSession } from '../../lib/auth';
import { Colors, Shadows, Spacing, Radius } from '../../lib/theme';

const PAIN_CHANGE_OPTIONS = [
  { value: 'Better', emoji: '😊', color: Colors.success },
  { value: 'Same', emoji: '😐', color: Colors.warning },
  { value: 'Worse', emoji: '😟', color: Colors.danger },
];

const DIFFICULTY_OPTIONS = [
  { value: 'Easy', emoji: '✅', color: Colors.success },
  { value: 'Manageable', emoji: '💪', color: Colors.warning },
  { value: 'Too Hard', emoji: '😓', color: Colors.danger },
];

const PAIN_EMOJIS = ['', '😊', '🙂', '😐', '😕', '😟', '😣', '😢', '😭', '😫', '🤯'];

const getPainColor = (level: number) => {
  if (level <= 3) return Colors.success;
  if (level <= 6) return Colors.warning;
  return Colors.danger;
};

export default function CheckInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const recovery_plan = params.recovery_plan
    ? JSON.parse(params.recovery_plan as string)
    : null;

  const plan_id = (params.plan_id as string) || null;

  const exercises: string[] =
    recovery_plan?.recovery_plan?.phase_1_days_1_to_7?.activities ?? [];

  const [painChange, setPainChange] = useState('');
  const [painLevel, setPainLevel] = useState(0);
  const [difficulty, setDifficulty] = useState('');
  const [completedActivities, setCompletedActivities] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);

  const toggleActivity = (exercise: string) => {
    setCompletedActivities((prev) =>
      prev.includes(exercise) ? prev.filter((a) => a !== exercise) : [...prev, exercise]
    );
  };

  const handleSubmit = async () => {
    if (!painChange || !painLevel || !difficulty) {
      Alert.alert('Incomplete', 'Please complete all required sections before submitting.');
      return;
    }

    setLoading(true);
    try {
      const session = await getSession();
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/check-ins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          pain_change: painChange,
          pain_level: painLevel,
          difficulty,
          completed_activities: completedActivities,
          notes,
          current_plan: recovery_plan,
          recovery_plan_id: plan_id,
        }),
      });

      if (!response.ok) throw new Error('Server error');

      const data = await response.json();
      router.push({ pathname: '/check-in/results', params: { results: JSON.stringify(data) } });
    } catch (err) {
      Alert.alert('Error', 'Failed to submit check-in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Daily Check-In ✏️</Text>
        <Text style={styles.subheading}>How's your recovery going today?</Text>

        {/* Section 1: Pain change */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>How is your pain?</Text>
            <Text style={styles.required}>*</Text>
          </View>
          <View style={styles.row}>
            {PAIN_CHANGE_OPTIONS.map(({ value, emoji, color }) => {
              const selected = painChange === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.painChangeButton,
                    selected && { backgroundColor: color, borderColor: color },
                  ]}
                  onPress={() => setPainChange(value)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.painChangeEmoji}>{emoji}</Text>
                  <Text style={[
                    styles.painChangeText,
                    selected && styles.painChangeTextSelected,
                  ]}>
                    {value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 2: Pain level */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Rate your pain</Text>
            <Text style={styles.required}>*</Text>
          </View>
          <View style={styles.painScaleRow}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
              const isSelected = painLevel === n;
              const numColor = getPainColor(n);
              return (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.painLevelBtn,
                    isSelected && { backgroundColor: numColor, borderColor: numColor },
                  ]}
                  onPress={() => setPainLevel(n)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.painLevelText, isSelected && styles.painLevelTextSelected]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {painLevel > 0 && (
            <View style={[styles.painLevelInfo, { backgroundColor: getPainColor(painLevel) + '15' }]}>
              <Text style={styles.painEmoji}>{PAIN_EMOJIS[painLevel]}</Text>
              <Text style={[styles.painLevelDescription, { color: getPainColor(painLevel) }]}>
                {painLevel <= 3 ? 'Mild pain' : painLevel <= 6 ? 'Moderate pain' : 'Severe pain'}
              </Text>
            </View>
          )}
        </View>

        {/* Section 3: Difficulty */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Exercise difficulty?</Text>
            <Text style={styles.required}>*</Text>
          </View>
          <View style={styles.row}>
            {DIFFICULTY_OPTIONS.map(({ value, emoji, color }) => {
              const selected = difficulty === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.painChangeButton,
                    selected && { backgroundColor: color, borderColor: color },
                  ]}
                  onPress={() => setDifficulty(value)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.painChangeEmoji}>{emoji}</Text>
                  <Text style={[
                    styles.painChangeText,
                    selected && styles.painChangeTextSelected,
                  ]}>
                    {value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 4: Completed exercises */}
        {exercises.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Activities completed?</Text>
            <View style={styles.chipRow}>
              {exercises.map((exercise) => {
                const selected = completedActivities.includes(exercise);
                return (
                  <TouchableOpacity
                    key={exercise}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleActivity(exercise)}
                    activeOpacity={0.8}
                  >
                    {selected && <Text style={styles.chipCheck}>✓ </Text>}
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {exercise}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Section 5: Notes */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Notes <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={[styles.textInput, notesFocused && styles.textInputFocused]}
            placeholder="Any additional notes about today's session..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
            onFocus={() => setNotesFocused(true)}
            onBlur={() => setNotesFocused(false)}
          />
        </View>
      </ScrollView>

      {/* Sticky Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <Text style={styles.submitText}>Submit Check-In</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.xxl,
    paddingBottom: 130,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  required: {
    color: Colors.danger,
    fontSize: 17,
    fontWeight: '700',
  },
  optional: {
    color: Colors.textMuted,
    fontWeight: '400',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  painChangeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surface,
    minHeight: 72,
    justifyContent: 'center',
  },
  painChangeEmoji: {
    fontSize: 22,
  },
  painChangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  painChangeTextSelected: {
    color: Colors.textInverse,
  },
  painScaleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  painLevelBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  painLevelText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  painLevelTextSelected: {
    color: Colors.textInverse,
  },
  painLevelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  painEmoji: {
    fontSize: 20,
  },
  painLevelDescription: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    minHeight: 44,
  },
  chipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipCheck: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  textInput: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    fontSize: 16,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: 90,
    marginTop: Spacing.sm,
  },
  textInputFocused: {
    borderColor: Colors.primary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xxl,
    paddingBottom: 40,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.textMuted,
  },
  submitText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
