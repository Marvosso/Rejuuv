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
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { getSession } from '../../lib/auth';
import { Colors, Spacing, Radius } from '../../lib/theme';

interface Plan {
  id: string;
  body_area: string;
  phase: number;
  status: string;
  created_at: string;
  plan_data?: string;
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

/** Days since plan start, capped 1–30 for display. */
function getDaysActive(createdAt: string): { day: number; total: number } {
  const start = new Date(createdAt);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const day = Math.min(30, Math.max(1, diff + 1));
  return { day, total: 30 };
}

/** First activity of current phase from plan_data, or fallback. */
function getNextStepLabel(plan: Plan): string {
  if (!plan.plan_data) return 'Next: Open plan for today\'s exercises';
  try {
    const data = JSON.parse(plan.plan_data);
    const phases = data?.recovery_plan;
    if (!phases) return 'Next: View your exercises';
    const phaseKey =
      plan.phase === 1
        ? 'phase_1_days_1_to_7'
        : plan.phase === 2
          ? 'phase_2_days_8_to_21'
          : 'phase_3_week_4_and_beyond';
    const activities = phases[phaseKey]?.activities;
    const first = Array.isArray(activities) ? activities[0] : null;
    if (first) return `Next: ${first}`;
  } catch {
    // ignore
  }
  return 'Next: View your exercises';
}

/** Today's movement progress 0–1. Not yet from API; placeholder 0. */
function getDailyProgress(_plan: Plan): number {
  return 0;
}

const PHASE_COLORS = ['', Colors.success, Colors.secondary, Colors.primary];

const CIRCLE_SIZE = 44;
const CIRCLE_STROKE = 4;

function DailyProgressCircle({ progress, color }: { progress: number; color: string }) {
  const half = CIRCLE_SIZE / 2;
  const r = (CIRCLE_SIZE - CIRCLE_STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <View style={styles.progressCircleWrap}>
      <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.progressCircleSvg}>
        <Circle
          cx={half}
          cy={half}
          r={r}
          fill="none"
          stroke={Colors.border}
          strokeWidth={CIRCLE_STROKE}
        />
        <Circle
          cx={half}
          cy={half}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={CIRCLE_STROKE}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${half} ${half})`}
        />
      </Svg>
      <Text style={[styles.progressCircleText, { color }]}>
        {Math.round(progress * 100)}%
      </Text>
    </View>
  );
}

export default function PlansListScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuPlanId, setMenuPlanId] = useState<string | null>(null);

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
        <TouchableOpacity
          onPress={() => {
            const canGoBack = router.canGoBack();
            fetch('http://127.0.0.1:7889/ingest/a2a93dc1-6ddc-4917-a00c-d8dc1a903f11',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c1e4e7'},body:JSON.stringify({sessionId:'c1e4e7',location:'plans/index.tsx:backBtn',message:'GO_BACK from plans list',data:{canGoBack},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
            router.back();
          }}
          style={styles.backBtn}
        >
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
          const dailyProgress = getDailyProgress(plan);
          const daysActive = getDaysActive(plan.created_at);
          const nextStep = getNextStepLabel(plan);
          return (
            <View key={plan.id} style={styles.planCard}>
              <View style={[styles.planAccentBar, { backgroundColor: phaseColor }]} />

              <TouchableOpacity
                style={styles.planCardContent}
                onPress={() => router.push(`/plans/${plan.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.planCardHeader}>
                  <View style={styles.planTitleRow}>
                    <DailyProgressCircle progress={dailyProgress} color={phaseColor} />
                    <View style={styles.planTitleBlock}>
                      <Text style={styles.planBodyArea}>{bodyAreaLabel(plan.body_area)}</Text>
                      <Text style={styles.planNextStep}>{nextStep}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.managePlanBtn}
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      setMenuPlanId(plan.id);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.managePlanBtnText}>Manage plan</Text>
                    <Text style={styles.managePlanBtnChevron}>▾</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.planMetaRow}>
                  <View style={[styles.phaseBadgePill, { backgroundColor: phaseColor + '18' }]}>
                    <Text style={[styles.phaseBadgePillText, { color: phaseColor }]}>
                      Phase {plan.phase}
                    </Text>
                  </View>
                  <Text style={styles.daysActiveText}>
                    Day {daysActive.day} of {daysActive.total}
                  </Text>
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
                </View>

                <Text style={styles.planDate}>Started {formatDate(plan.created_at)}</Text>

                <View style={styles.planArrowRow}>
                  <Text style={[styles.planArrow, { color: phaseColor }]}>View details →</Text>
                </View>
              </TouchableOpacity>
            </View>
          );
        })}

        <Modal
          visible={menuPlanId !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuPlanId(null)}
        >
          <Pressable style={styles.menuOverlay} onPress={() => setMenuPlanId(null)}>
            <View style={styles.menuDropdown}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  if (menuPlanId) router.push(`/plans/${menuPlanId}`);
                  setMenuPlanId(null);
                }}
              >
                <Text style={styles.menuItemText}>View plan details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemDanger]}
                onPress={() => {
                  const plan = plans.find((p) => p.id === menuPlanId);
                  if (plan) handleDelete(plan);
                  setMenuPlanId(null);
                }}
              >
                <Text style={styles.menuItemTextDanger}>Delete plan</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
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
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  progressCircleWrap: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircleSvg: {
    position: 'absolute',
  },
  progressCircleText: {
    fontSize: 10,
    fontWeight: '700',
  },
  planTitleBlock: {
    flex: 1,
  },
  planNextStep: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 0,
  },
  managePlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    backgroundColor: Colors.inputBg,
  },
  managePlanBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  managePlanBtnChevron: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  planMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  phaseBadgePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  phaseBadgePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  daysActiveText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
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
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: Spacing.lg,
  },
  menuDropdown: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemDanger: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  menuItemTextDanger: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.danger,
  },
});
