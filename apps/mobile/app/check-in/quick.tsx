import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getSession } from '../../lib/auth';
import { Colors, Spacing, Radius, getShadow } from '../../lib/theme';

const PAIN_CHANGE_OPTIONS = [
  { value: 'Better', emoji: '😊', color: Colors.success },
  { value: 'Same', emoji: '😐', color: Colors.warning },
  { value: 'Worse', emoji: '😟', color: Colors.danger },
];

const PAIN_EMOJIS = ['', '😊', '🙂', '😐', '😕', '😟', '😣', '😢', '😭', '😫', '🤯'];

// 1-3 Green, 4-6 Yellow, 7-8 Orange, 9-10 Red
const getPainColor = (level: number) => {
  if (level <= 3) return Colors.success;
  if (level <= 6) return Colors.warning;
  if (level <= 8) return Colors.secondary;
  return Colors.danger;
};

const PAIN_LEVEL_MESSAGES: Record<number, string> = {
  1: 'Minimal or no pain',
  2: 'Very mild, barely noticeable',
  3: 'Mild discomfort',
  4: 'Mild to moderate',
  5: 'Moderate pain',
  6: 'Significant discomfort, but manageable',
  7: 'Strong discomfort',
  8: 'Severe pain',
  9: 'Very severe',
  10: 'Worst pain imaginable',
};

export default function QuickCheckInScreen() {
  const router = useRouter();
  const [planId, setPlanId] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [painLevel, setPainLevel] = useState(5);
  const [painChange, setPainChange] = useState('Same');
  const [notes, setNotes] = useState('');
  const [notesExpanded, setNotesExpanded] = useState(false);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const session = await getSession();
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
        const response = await fetch(`${apiUrl}/plans`, {
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
        });
        if (!response.ok) throw new Error('Failed to load plans');
        const data = await response.json();
        const plans = data.plans ?? [];
        if (plans.length > 0) {
          setPlanId(plans[0].id);
        }
      } catch {
        setPlanId(null);
      } finally {
        setLoadingPlans(false);
      }
    };
    loadPlans();
  }, []);

  const handleSubmit = async () => {
    if (!planId) {
      Alert.alert(
        'No plan yet',
        'Create a recovery plan first, then you can log quick check-ins.',
        [{ text: 'OK' }, { text: 'Create plan', onPress: () => router.replace('/intake/body-area') }]
      );
      return;
    }
    setSubmitting(true);
    try {
      const session = await getSession();
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/check-ins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          quick: true,
          pain_level: painLevel,
          pain_change: painChange,
          recovery_plan_id: planId,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        }),
      });
      if (!response.ok) throw new Error('Failed to save');
      // #region agent log
      const canGoBack = router.canGoBack();
      fetch('http://127.0.0.1:7889/ingest/a2a93dc1-6ddc-4917-a00c-d8dc1a903f11',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c1e4e7'},body:JSON.stringify({sessionId:'c1e4e7',location:'check-in/quick.tsx:after_submit',message:'GO_BACK after submit',data:{canGoBack,action:'router.back()'},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save check-in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const painColor = getPainColor(painLevel);

  if (loadingPlans) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            // #region agent log
            const canGoBack = router.canGoBack();
            fetch('http://127.0.0.1:7889/ingest/a2a93dc1-6ddc-4917-a00c-d8dc1a903f11',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c1e4e7'},body:JSON.stringify({sessionId:'c1e4e7',location:'check-in/quick.tsx:back_button',message:'GO_BACK from Back button',data:{canGoBack,action:'router.back()'},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
            // #endregion
            router.back();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.header}>
        <Text style={styles.title}>Log pain (10 sec)</Text>
        <Text style={styles.subtitle}>Quick check-in to keep your streak</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Pain level (1–10)</Text>
        <View style={styles.painRow}>
          <Text style={styles.painEmoji}>{PAIN_EMOJIS[painLevel]}</Text>
          <Text style={[styles.painValue, { color: painColor }]}>{painLevel}</Text>
        </View>
        <View style={styles.painScaleRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
            const isSelected = painLevel === n;
            const numColor = getPainColor(n);
            return (
              <TouchableOpacity
                key={n}
                style={[
                  styles.painLevelBtn,
                  { borderColor: numColor },
                  isSelected && { backgroundColor: numColor, borderWidth: 3 },
                ]}
                onPress={() => setPainLevel(n)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.painLevelText,
                  { color: isSelected ? Colors.textInverse : numColor },
                ]}>
                  {n}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={[styles.painLevelInfo, { backgroundColor: painColor + '18' }]}>
          <Text style={styles.painEmojiSmall}>{PAIN_EMOJIS[painLevel]}</Text>
          <Text style={[styles.painLevelMessage, { color: painColor }]}>
            {painLevel}: {PAIN_LEVEL_MESSAGES[painLevel]}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Compared to yesterday?</Text>
        <View style={styles.toggleGroup}>
          {PAIN_CHANGE_OPTIONS.map(({ value, emoji, color }) => {
            const selected = painChange === value;
            return (
              <TouchableOpacity
                key={value}
                style={[
                  styles.toggleOption,
                  selected && {
                    backgroundColor: color + '18',
                    borderColor: color,
                    borderWidth: 3,
                    ...getShadow('card'),
                  },
                ]}
                onPress={() => setPainChange(value)}
                activeOpacity={0.8}
              >
                <Text style={styles.changeEmoji}>{emoji}</Text>
                <Text style={[styles.changeText, selected && { color, fontWeight: '700' }]}>
                  {value}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {!notesExpanded ? (
        <TouchableOpacity
          style={styles.notesExpandTrigger}
          onPress={() => setNotesExpanded(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.notesExpandText}>Add more detail (optional)</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.notesSection}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Any extra context..."
            placeholderTextColor={Colors.textMuted}
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitText}>{submitting ? 'Saving...' : 'Done'}</Text>
      </TouchableOpacity>

      {!planId && !loadingPlans && (
        <TouchableOpacity style={styles.link} onPress={() => router.replace('/intake/body-area')}>
          <Text style={styles.linkText}>Create a recovery plan first</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.xxl,
    paddingBottom: 48,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  backBtn: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  header: {
    marginBottom: Spacing.xxl,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  painRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  painEmoji: {
    fontSize: 32,
  },
  painValue: {
    fontSize: 36,
    fontWeight: '800',
  },
  painScaleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.md,
  },
  painLevelBtn: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 2,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  painLevelText: {
    fontSize: 16,
    fontWeight: '700',
  },
  painLevelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  painEmojiSmall: {
    fontSize: 20,
  },
  painLevelMessage: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  changeEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  notesExpandTrigger: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    marginBottom: Spacing.xl,
  },
  notesExpandText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  notesSection: {
    marginBottom: Spacing.xl,
  },
  notesInput: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    fontSize: 16,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: 80,
    marginTop: Spacing.sm,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  link: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
});
