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
import { useRouter, useSearchParams } from 'expo-router';
import { getSession } from '../../lib/auth';

export default function CheckInScreen() {
  const router = useRouter();
  const params = useSearchParams();

  const recovery_plan = params.recovery_plan
    ? JSON.parse(params.recovery_plan as string)
    : null;

  const plan_id = (params.plan_id as string) || null;

  const exercises: string[] =
    recovery_plan?.recovery_plan?.phase_1_days_1_to_7?.exercises ?? [];

  const [painChange, setPainChange] = useState('');
  const [painLevel, setPainLevel] = useState(0);
  const [difficulty, setDifficulty] = useState('');
  const [completedActivities, setCompletedActivities] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleActivity = (exercise: string) => {
    setCompletedActivities((prev) =>
      prev.includes(exercise)
        ? prev.filter((a) => a !== exercise)
        : [...prev, exercise]
    );
  };

  const handleSubmit = async () => {
    if (!painChange || !painLevel || !difficulty) {
      Alert.alert('Please complete all required sections before submitting.');
      return;
    }

    setLoading(true);
    try {
      const session = await getSession();
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/check-ins`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {}),
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
        }
      );

      if (!response.ok) {
        throw new Error('Server error');
      }

      const data = await response.json();
      router.push({
        pathname: '/check-in/results',
        params: { results: JSON.stringify(data) },
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to submit check-in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Daily Check-In</Text>

      {/* Section 1: Pain change */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>How is your pain?</Text>
        <View style={styles.row}>
          {['Better', 'Same', 'Worse'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                painChange === option && styles.optionButtonActive,
              ]}
              onPress={() => setPainChange(option)}
            >
              <Text
                style={[
                  styles.optionText,
                  painChange === option && styles.optionTextActive,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Section 2: Pain level */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Rate your pain (1-10)</Text>
        <View style={styles.numberRow}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <TouchableOpacity
              key={n}
              style={[
                styles.numberButton,
                painLevel === n && styles.optionButtonActive,
              ]}
              onPress={() => setPainLevel(n)}
            >
              <Text
                style={[
                  styles.numberText,
                  painLevel === n && styles.optionTextActive,
                ]}
              >
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Section 3: Difficulty */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Exercise difficulty?</Text>
        <View style={styles.row}>
          {['Easy', 'Manageable', 'Too Hard'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                difficulty === option && styles.optionButtonActive,
              ]}
              onPress={() => setDifficulty(option)}
            >
              <Text
                style={[
                  styles.optionText,
                  difficulty === option && styles.optionTextActive,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Section 4: Completed activities */}
      {exercises.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Activities completed?</Text>
          <View style={styles.chipRow}>
            {exercises.map((exercise) => {
              const selected = completedActivities.includes(exercise);
              return (
                <TouchableOpacity
                  key={exercise}
                  style={[styles.chip, selected && styles.chipActive]}
                  onPress={() => toggleActivity(exercise)}
                >
                  <Text
                    style={[styles.chipText, selected && styles.chipTextActive]}
                  >
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
        <Text style={styles.sectionTitle}>Notes? (optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Any additional notes..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.submitText}>Submit Check-In</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  optionTextActive: {
    color: '#ffffff',
  },
  numberRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  numberButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
