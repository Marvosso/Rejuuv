import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { apiFetchJson } from '../lib/api-fetch';
import { registerPushToken } from '../lib/notifications';
import {
  pickPrimaryPlan,
  syncDailyWinReminder,
  firstExerciseFromPlan,
  type PlanForDailyWin,
} from '../lib/daily-win-notifications';
import {
  processCheckInOutbox,
  getPendingCheckInOutboxCount,
  submitCheckInWithOfflineQueue,
} from '../lib/check-in-outbox';
import { deriveTodayRecoveryState } from '../lib/today-recovery-state';
import { Colors, Spacing, Radius } from '../lib/theme';
import { CheckInCelebration, type PainChangeValue } from '../components/check-in-celebration';
import {
  AdaptiveGuidance,
  DailyActionCard,
  RecoveryInsightCard,
  TimelinePreview,
  ProgressSummary,
  CheckInPrompt,
} from '../components/today';

interface CheckInRow {
  id: string;
  pain_level: number | null;
  pain_change: string;
  difficulty: string;
  recovery_plan_id: string | null;
  created_at: string;
}

interface HistorySummary {
  total: number;
  avg_pain: number | null;
  trend: string;
  streak_days?: number;
}

type PlanRow = PlanForDailyWin & {
  id: string;
  body_area: string;
  status: string;
  created_at: string;
};

function formatBodyAreaLabel(area: string): string {
  if (!area || !area.trim()) return 'Your recovery';
  const s = area.replace(/_/g, ' ');
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const FeatureCard = ({
  emoji,
  title,
  description,
  delay,
}: {
  emoji: string;
  title: string;
  description: string;
  delay: number;
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, [delay]);
  return (
    <Animated.View style={[styles.featureCard, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </Animated.View>
  );
};

export default function HomeScreen() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [dailyTip, setDailyTip] = React.useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckInRow[]>([]);
  const [summary, setSummary] = useState<HistorySummary | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [painLevel, setPainLevel] = useState(5);
  const [painChange, setPainChange] = useState<PainChangeValue>('Same');
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [celebrationChange, setCelebrationChange] = useState<PainChangeValue>('Same');
  const [pendingCheckInOutbox, setPendingCheckInOutbox] = useState(0);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setDashboardLoading(true);
    try {
      const [histRes, plansRes] = await Promise.all([
        apiFetchJson<{ checkIns?: CheckInRow[]; summary?: HistorySummary | null }>('/check-ins/history'),
        apiFetchJson<{ plans?: PlanRow[] }>('/plans'),
      ]);
      if (histRes.ok) {
        setCheckIns(histRes.data.checkIns ?? []);
        setSummary(histRes.data.summary ?? null);
      }
      if (plansRes.ok) {
        setPlans(plansRes.data.plans ?? []);
      }
    } catch {
      // non-blocking
    } finally {
      setDashboardLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        return () => {};
      }
      let cancelled = false;
      (async () => {
        await processCheckInOutbox();
        if (cancelled) return;
        await loadDashboard();
        if (cancelled) return;
        setPendingCheckInOutbox(await getPendingCheckInOutboxCount());
      })();
      return () => {
        cancelled = true;
      };
    }, [user, loadDashboard])
  );

  const handleInlineCheckIn = useCallback(async () => {
    const plan = pickPrimaryPlan(plans);
    if (!plan) {
      Alert.alert(
        'Create your plan first',
        'A quick plan unlocks check-ins and your streak.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Start', onPress: () => router.push('/intake/body-area?reset=1') },
        ]
      );
      return;
    }
    setCheckInSubmitting(true);
    try {
      const out = await submitCheckInWithOfflineQueue({
        quick: true,
        pain_level: Math.round(painLevel),
        pain_change: painChange,
        recovery_plan_id: plan.id,
      });
      if (out.kind === 'error') {
        if (out.unauthorized) {
          Alert.alert('Session expired', 'Please sign in again to continue.');
        } else {
          Alert.alert('Could not save', out.message || 'Check your connection and try again.');
        }
        return;
      }
      if (out.kind === 'queued') {
        setPendingCheckInOutbox(await getPendingCheckInOutboxCount());
        return;
      }
      setCelebrationChange(painChange);
      setCelebrationOpen(true);
      await loadDashboard();
      await syncDailyWinReminder(plan);
      setPendingCheckInOutbox(await getPendingCheckInOutboxCount());
    } catch {
      Alert.alert('Could not save', 'Check your connection and try again.');
    } finally {
      setCheckInSubmitting(false);
    }
  }, [plans, painLevel, painChange, loadDashboard, router]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      await registerPushToken();
      if (cancelled) return;
      await syncDailyWinReminder(pickPrimaryPlan(plans));
    })();
    return () => {
      cancelled = true;
    };
  }, [user, plans]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetchJson<{ tip?: string }>('/tips/daily');
        if (!res.ok || cancelled) return;
        if (!cancelled && res.data.tip) setDailyTip(res.data.tip);
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.logoText}>Rejuuv</Text>
      </View>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (user) {
    const primaryPlan = pickPrimaryPlan(plans);
    const hasPlan = !!primaryPlan;
    const recoveryState = deriveTodayRecoveryState(checkIns, summary);
    const focusExercise = primaryPlan ? firstExerciseFromPlan(primaryPlan) : null;
    const bodyAreaLabel = primaryPlan ? formatBodyAreaLabel(primaryPlan.body_area) : 'Your recovery';
    const streak = typeof summary?.streak_days === 'number' ? summary.streak_days : 0;

    const onDailyPrimary = () => {
      if (primaryPlan) {
        router.push(`/plans/${primaryPlan.id}`);
      } else {
        router.push('/intake/body-area?reset=1');
      }
    };

    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <CheckInCelebration
          visible={celebrationOpen}
          painChange={celebrationChange}
          onDismiss={() => setCelebrationOpen(false)}
        />
        <View style={styles.todayHeader}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Text style={styles.todayLabel}>Today</Text>
            <Text style={styles.todayGreeting}>Welcome back</Text>
            <Text style={styles.todaySub}>{user.email}</Text>
          </Animated.View>
        </View>
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {pendingCheckInOutbox > 0 ? (
            <View style={styles.outboxBanner} accessibilityLiveRegion="polite">
              <Text style={styles.outboxBannerTitle}>Saved locally</Text>
              <Text style={styles.outboxBannerBody}>
                {pendingCheckInOutbox === 1
                  ? 'One check-in is waiting to sync. It will send quietly when your connection is back.'
                  : `${pendingCheckInOutbox} check-ins are waiting to sync. They will send when your connection is back.`}
              </Text>
            </View>
          ) : null}

          {recoveryState !== 'stable' ? <AdaptiveGuidance state={recoveryState} /> : null}

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <DailyActionCard
              recoveryState={recoveryState}
              hasPlan={hasPlan}
              bodyAreaLabel={bodyAreaLabel}
              focusExercise={focusExercise}
              onPrimaryPress={onDailyPrimary}
            />
          </Animated.View>

          {dashboardLoading && checkIns.length === 0 && plans.length === 0 ? (
            <ActivityIndicator style={styles.inlineLoader} color={Colors.primary} />
          ) : null}

          <CheckInPrompt
            hasPlan={hasPlan}
            painLevel={painLevel}
            onPainLevelChange={setPainLevel}
            painChange={painChange}
            onPainChangeSelect={setPainChange}
            submitting={checkInSubmitting}
            onSubmit={handleInlineCheckIn}
            onOpenFullQuickCheckIn={() => router.push('/check-in/quick')}
          />

          <ProgressSummary
            streakDays={streak}
            totalCheckIns={summary?.total ?? 0}
            avgPain={summary?.avg_pain ?? null}
            trend={summary?.trend}
          />

          <TimelinePreview checkIns={checkIns} onOpenFull={() => router.push('/dashboard/history')} />

          <RecoveryInsightCard dailyTip={dailyTip} trend={summary?.trend} />

          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => router.push('/intake/body-area?reset=1')} hitSlop={8}>
              <Text style={styles.footerLink}>New assessment</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>·</Text>
            <TouchableOpacity onPress={() => router.push('/plans')} hitSlop={8}>
              <Text style={styles.footerLink}>Plans</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>·</Text>
            <TouchableOpacity onPress={() => router.push('/dashboard/body-map')} hitSlop={8}>
              <Text style={styles.footerLink}>Body map</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>·</Text>
            <TouchableOpacity onPress={() => router.push('/dashboard/history')} hitSlop={8}>
              <Text style={styles.footerLink}>Progress</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>·</Text>
            <TouchableOpacity onPress={() => router.push('/check-in/quick')} hitSlop={8}>
              <Text style={styles.footerLink}>Check-in</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>·</Text>
            <TouchableOpacity onPress={() => void handleSignOut()} hitSlop={8}>
              <Text style={styles.footerLink}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.heroSection}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.logoText}>Rejuuv</Text>
          <Text style={styles.heroHeading}>Your Recovery{'\n'}Journey Starts Here</Text>
          <Text style={styles.heroSubheading}>AI-powered movement recovery guidance, personalized for your body.</Text>
        </Animated.View>
      </View>
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <FeatureCard emoji="📍" title="Track Pain" description="Describe your symptoms and pain patterns with our guided assessment." delay={200} />
        <FeatureCard emoji="💡" title="Get Guidance" description="Receive a personalized recovery plan based on your specific condition." delay={350} />
        <FeatureCard emoji="📈" title="See Progress" description="Check in daily and watch your recovery unfold over time." delay={500} />
        <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/auth/signup')} activeOpacity={0.85}>
          <Text style={styles.ctaButtonText}>Get Started — It's Free</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/auth/login')} activeOpacity={0.7}>
          <Text style={styles.loginLinkText}>Already have an account? <Text style={styles.loginLinkBold}>Log In</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: Colors.background },
  scrollArea: { flex: 1 },
  scrollContent: { padding: Spacing.xxl, paddingBottom: 48 },
  heroSection: { backgroundColor: Colors.primary, paddingTop: 60, paddingBottom: 36, paddingHorizontal: 24 },
  todayHeader: {
    paddingTop: 56,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  todayLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: Spacing.xs,
  },
  todayGreeting: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  todaySub: { fontSize: 14, color: Colors.textSecondary },
  outboxBanner: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  outboxBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  outboxBannerBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  inlineLoader: { marginVertical: Spacing.md },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  footerLink: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  footerDot: { fontSize: 14, color: Colors.textMuted, fontWeight: '600' },
  logoText: { fontSize: 36, fontWeight: '800', color: Colors.textInverse, marginBottom: 8, letterSpacing: -0.5 },
  heroHeading: { fontSize: 30, fontWeight: '800', color: Colors.textInverse, lineHeight: 38, marginBottom: 12 },
  heroSubheading: { fontSize: 16, color: 'rgba(255,255,255,0.85)', lineHeight: 24 },
  featureCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.xxl, marginBottom: Spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
  featureEmoji: { fontSize: 28, width: 44, textAlign: 'center', marginTop: 2 },
  featureTextContainer: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  featureDescription: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  ctaButton: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 18, alignItems: 'center', marginBottom: Spacing.lg },
  ctaButtonText: { color: Colors.textInverse, fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  loginLink: { alignItems: 'center', paddingVertical: Spacing.md },
  loginLinkText: { color: Colors.textSecondary, fontSize: 15 },
  loginLinkBold: { color: Colors.primary, fontWeight: '700' },
});
