import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getSession } from '../../lib/auth';
import { Colors, Shadows, Spacing, Radius } from '../../lib/theme';

interface Plan {
  id: string;
  body_area: string;
  phase: number;
  status: string;
  created_at: string;
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

const PHASE_COLORS = ['', Colors.success, Colors.secondary, Colors.primary];

export default function PlansListScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setError(null);
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
      setPlans(data.plans ?? []);
    } catch (err) {
      setError('Could not load your plans. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlans();
  };

  const handleDelete = (plan: Plan) => {
    Alert.alert(
      'Delete Plan',
      `Delete your ${bodyAreaLabel(plan.body_area)} recovery plan? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const session = await getSession();
              const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
              const response = await fetch(`${apiUrl}/plans/${plan.id}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                },
              });
              if (!response.ok) throw new Error('Failed to delete plan');
              setPlans((prev) => prev.filter((p) => p.id !== plan.id));
            } catch {
              Alert.alert('Error', 'Could not delete the plan. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your plans...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>My Recovery Plans</Text>
        <Text style={styles.subheading}>
          {plans.length === 0 ? 'No plans yet' : `${plans.length} plan${plans.length === 1 ? '' : 's'}`}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!error && plans.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No plans yet</Text>
            <Text style={styles.emptySubtitle}>
              Complete an intake assessment to get your first personalized recovery plan.
            </Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => router.push('/intake/body-area')}
              activeOpacity={0.85}
            >
              <Text style={styles.startButtonText}>Start First Assessment</Text>
            </TouchableOpacity>
          </View>
        )}

        {plans.map((plan) => {
          const phaseColor = PHASE_COLORS[plan.phase] || Colors.primary;
          return (
            <View key={plan.id} style={styles.planCard}>
              {/* Left accent bar */}
              <View style={[styles.planAccentBar, { backgroundColor: phaseColor }]} />

              <TouchableOpacity
                style={styles.planCardContent}
                onPress={() => router.push(`/plans/${plan.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.planCardTop}>
                  <View style={[styles.phaseBadge, { backgroundColor: phaseColor + '20' }]}>
                    <Text style={[styles.phaseBadgeText, { color: phaseColor }]}>
                      Phase {plan.phase}
                    </Text>
                  </View>
                  <View style={styles.planCardTopRight}>
                    <View style={[
                      styles.statusBadge,
                      plan.status === 'active' ? styles.statusActive : styles.statusInactive,
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: plan.status === 'active' ? Colors.success : Colors.textMuted },
                      ]}>
                        {plan.status === 'active' ? '● Active' : '○ Inactive'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(plan)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.deleteBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.planBodyArea}>{bodyAreaLabel(plan.body_area)}</Text>
                <Text style={styles.planDate}>Started {formatDate(plan.created_at)}</Text>

                <View style={styles.planArrowRow}>
                  <Text style={[styles.planArrow, { color: phaseColor }]}>View details →</Text>
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: Spacing.xxl,
  },
  backBtn: {
    marginBottom: 12,
  },
  backBtnText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '500',
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textInverse,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  content: {
    padding: Spacing.xxl,
    paddingBottom: 48,
  },
  errorCard: {
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.md,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
  },
  errorIcon: {
    fontSize: 20,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    flex: 1,
    lineHeight: 21,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 40,
    alignItems: 'center',
    marginTop: 24,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 28,
  },
  startButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: Radius.md,
  },
  startButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  planAccentBar: {
    width: 5,
  },
  planCardContent: {
    flex: 1,
    padding: Spacing.xl,
  },
  planCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  planCardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  deleteBtn: {
    padding: 4,
  },
  deleteBtnText: {
    fontSize: 16,
  },
  phaseBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  phaseBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusActive: {
    backgroundColor: Colors.successLight,
  },
  statusInactive: {
    backgroundColor: Colors.inputBg,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  planBodyArea: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 5,
  },
  planDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  planArrowRow: {
    flexDirection: 'row',
  },
  planArrow: {
    fontSize: 13,
    fontWeight: '600',
  },
});
