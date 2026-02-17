import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getSession } from '../../lib/auth';

interface CheckInRecord {
  id: string;
  pain_level: number;
  pain_change: string;
  difficulty: string;
  notes: string;
  adjustments: string; // JSON string
  created_at: string;
}

interface PlanRecord {
  id: string;
  body_area: string;
  phase: number;
  status: string;
  created_at: string;
  plan_data: string; // JSON string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function bodyAreaLabel(area: string) {
  return area.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function painChangeColor(change: string) {
  if (change === 'Better') return '#16a34a';
  if (change === 'Worse') return '#dc2626';
  return '#d97706';
}

export default function PlanDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plan, setPlan] = useState<PlanRecord | null>(null);
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const session = await getSession();
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
        const response = await fetch(`${apiUrl}/plans/${id}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {}),
          },
        });

        if (!response.ok) throw new Error('Failed to load plan');

        const data = await response.json();
        setPlan(data.plan);
        setCheckIns(data.checkIns ?? []);
      } catch {
        setError('Could not load this plan.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleStartCheckIn = () => {
    if (!plan) return;
    const planData = JSON.parse(plan.plan_data);
    router.push(
      '/check-in/?' +
        new URLSearchParams({
          recovery_plan: JSON.stringify(planData),
          plan_id: plan.id,
        }).toString()
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading plan...</Text>
      </View>
    );
  }

  if (error || !plan) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Plan not found.'}</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const planData = JSON.parse(plan.plan_data);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← My Plans</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>{bodyAreaLabel(plan.body_area)}</Text>
        <Text style={styles.subheading}>
          Phase {plan.phase} · Started {formatDate(plan.created_at)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Focus Areas */}
        {planData.focus_areas?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Focus Areas</Text>
            <View style={styles.chipRow}>
              {planData.focus_areas.map((area: string, i: number) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Phase 1 exercises */}
        {planData.recovery_plan?.phase_1_days_1_to_7?.activities?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Phase 1 Exercises (Days 1–7)</Text>
            {planData.recovery_plan.phase_1_days_1_to_7.activities.map(
              (ex: string, i: number) => (
                <View key={i} style={styles.listRow}>
                  <View style={styles.dot} />
                  <Text style={styles.listText}>{ex}</Text>
                </View>
              )
            )}
          </View>
        )}

        {/* Check-in history */}
        <Text style={styles.sectionHeading}>
          Check-In History ({checkIns.length})
        </Text>

        {checkIns.length === 0 && (
          <View style={styles.emptyCheckins}>
            <Text style={styles.emptyCheckinsText}>No check-ins yet.</Text>
          </View>
        )}

        {checkIns.map((ci) => {
          let adjustments: any = {};
          try { adjustments = JSON.parse(ci.adjustments); } catch {}

          return (
            <View key={ci.id} style={styles.checkInCard}>
              <View style={styles.checkInHeader}>
                <Text style={styles.checkInDate}>{formatDate(ci.created_at)}</Text>
                <Text
                  style={[
                    styles.checkInChange,
                    { color: painChangeColor(ci.pain_change) },
                  ]}
                >
                  {ci.pain_change}
                </Text>
              </View>

              <View style={styles.checkInStats}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Pain Level</Text>
                  <Text style={styles.statValue}>{ci.pain_level}/10</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Difficulty</Text>
                  <Text style={styles.statValue}>{ci.difficulty}</Text>
                </View>
              </View>

              {adjustments.adjustment_summary ? (
                <Text style={styles.adjustmentSummary}>
                  {adjustments.adjustment_summary}
                </Text>
              ) : null}

              {ci.notes ? (
                <Text style={styles.checkInNotes}>"{ci.notes}"</Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      {/* Sticky check-in CTA */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.checkInButton} onPress={handleStartCheckIn}>
          <Text style={styles.checkInButtonText}>Start Today's Check-In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    fontSize: 15,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
  },
  backLink: {
    marginTop: 8,
  },
  backLinkText: {
    color: '#2563eb',
    fontSize: 15,
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    marginBottom: 8,
  },
  backBtnText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '500',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  subheading: {
    fontSize: 13,
    color: '#6b7280',
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  chipText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '500',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563eb',
    marginTop: 7,
    flexShrink: 0,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    marginTop: 4,
  },
  emptyCheckins: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyCheckinsText: {
    color: '#6b7280',
    fontSize: 14,
  },
  checkInCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkInDate: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  checkInChange: {
    fontSize: 13,
    fontWeight: '700',
  },
  checkInStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 10,
  },
  stat: {
    gap: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  adjustmentSummary: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
    marginBottom: 6,
  },
  checkInNotes: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  checkInButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkInButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
