import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
  Animated,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { registerPushToken } from '../lib/notifications';
import { Colors, Spacing, Radius, getShadow } from '../lib/theme';

// Placeholder timeline steps: first completed, rest upcoming (can be wired to API later)
const RECOVERY_STEPS: { id: string; emoji: string; label: string; description: string; status: 'completed' | 'current' | 'upcoming' }[] = [
  { id: '1', emoji: '📍', label: 'Track Your Pain', description: "Log symptoms and monitor pain levels over time to see what's working.", status: 'completed' },
  { id: '2', emoji: '💡', label: 'Get Expert Guidance', description: 'AI-powered recovery plans tailored to your specific condition and needs.', status: 'upcoming' },
  { id: '3', emoji: '📈', label: 'See Your Progress', description: 'Visual tracking of your improvement journey week by week.', status: 'upcoming' },
];

function TimelineStep({
  emoji,
  label,
  description,
  status,
  isLast,
  delay,
}: {
  emoji: string;
  label: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  isLast: boolean;
  delay: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, [delay]);

  const iconBg = status === 'completed' ? Colors.success : status === 'current' ? Colors.primary : Colors.textMuted;

  return (
    <Animated.View style={[styles.timelineRow, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineIcon, { backgroundColor: iconBg }]}>
          <Text style={[styles.timelineEmoji, { opacity: status === 'upcoming' ? 0.7 : 1 }]}>{emoji}</Text>
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineContent}>
        <Text style={styles.timelineLabel}>{label}</Text>
        <Text style={[styles.timelineDescription, status === 'upcoming' && { color: Colors.textMuted }]}>{description}</Text>
      </View>
    </Animated.View>
  );
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

function SmallActionCard({
  emoji,
  title,
  subtitle,
  onPress,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isWeb = Platform.OS === 'web';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallCard,
        getShadow(hovered || pressed ? 'card' : 'none'),
        (hovered || pressed) && { borderColor: Colors.primary },
      ]}
      onMouseEnter={isWeb ? () => setHovered(true) : undefined}
      onMouseLeave={isWeb ? () => setHovered(false) : undefined}
    >
      <Text style={styles.smallCardEmoji}>{emoji}</Text>
      <Text style={styles.smallCardTitle}>{title}</Text>
      <Text style={styles.smallCardSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [dailyTip, setDailyTip] = React.useState<string | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (user) registerPushToken();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const session = await import('../lib/auth').then((m) => m.getSession());
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
        const res = await fetch(`${apiUrl}/tips/daily`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && data.tip) setDailyTip(data.tip);
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
    try { await signOut(); } catch (error) { console.error('Error signing out:', error); }
  };

  if (user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.headerCompact}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Text style={styles.logoTextSmall}>Rejuuv</Text>
            <Text style={styles.welcomeHeading}>Welcome back! 👋</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </Animated.View>
        </View>
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.heroCard, getShadow('card'), { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.heroCardHeading}>How are you feeling today?</Text>
            <TouchableOpacity style={[styles.heroCardButton, getShadow('button')]} onPress={() => router.push('/check-in/quick')} activeOpacity={0.85}>
              <Text style={styles.heroCardButtonText}>Log Pain</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.actionGrid}>
            <View style={styles.actionGridRow}>
              <SmallActionCard emoji="🩺" title="New Assessment" subtitle="Start fresh" onPress={() => router.push('/intake/body-area')} />
              <SmallActionCard emoji="⚡" title="Quick check-in" subtitle="10 sec" onPress={() => router.push('/check-in/quick')} />
            </View>
            <View style={styles.actionGridRow}>
              <SmallActionCard emoji="📋" title="My Plans" subtitle="Recovery plans" onPress={() => router.push('/plans')} />
              <SmallActionCard emoji="🫀" title="Body Map" subtitle="Pain by area" onPress={() => router.push('/dashboard/body-map')} />
            </View>
            <View style={styles.actionGridRowSingle}>
              <SmallActionCard emoji="📈" title="Progress" subtitle="Timeline & streak" onPress={() => router.push('/dashboard/history')} />
            </View>
          </View>

          {dailyTip ? (
            <View style={styles.tipCallout}>
              <Text style={styles.tipCalloutIcon}>💡</Text>
              <View style={styles.tipCalloutContent}>
                <Text style={styles.tipCalloutLabel}>Today's Tip</Text>
                <Text style={styles.tipCalloutText}>{dailyTip}</Text>
              </View>
            </View>
          ) : null}

          <Text style={styles.sectionHeading}>Your Recovery Journey</Text>
          <View style={styles.timeline}>
            {RECOVERY_STEPS.map((step, i) => (
              <TimelineStep
                key={step.id}
                emoji={step.emoji}
                label={step.label}
                description={step.description}
                status={step.status}
                isLast={i === RECOVERY_STEPS.length - 1}
                delay={100 + i * 80}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.7}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
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
  heroSection: { backgroundColor: Colors.primary, paddingTop: 60, paddingBottom: 36, paddingHorizontal: 24 },
  headerCompact: { backgroundColor: Colors.primary, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 24 },
  logoText: { fontSize: 36, fontWeight: '800', color: Colors.textInverse, marginBottom: 8, letterSpacing: -0.5 },
  logoTextSmall: { fontSize: 24, fontWeight: '800', color: Colors.textInverse, marginBottom: 4, letterSpacing: -0.5 },
  heroHeading: { fontSize: 30, fontWeight: '800', color: Colors.textInverse, lineHeight: 38, marginBottom: 12 },
  heroSubheading: { fontSize: 16, color: 'rgba(255,255,255,0.85)', lineHeight: 24 },
  welcomeHeading: { fontSize: 20, fontWeight: '700', color: Colors.textInverse, marginBottom: 2 },
  userEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  scrollArea: { flex: 1 },
  scrollContent: { padding: Spacing.xxl, paddingBottom: 48 },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    marginBottom: Spacing.xxl,
    alignItems: 'center',
  },
  heroCardHeading: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xl, textAlign: 'center' },
  heroCardButton: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: 32, minWidth: 160, alignItems: 'center' },
  heroCardButtonText: { color: Colors.textInverse, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  actionGrid: { marginBottom: Spacing.xxl },
  actionGridRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  actionGridRowSingle: { flexDirection: 'row', justifyContent: 'center' },
  smallCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  smallCardEmoji: { fontSize: 24, marginBottom: Spacing.xs },
  smallCardTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2, textAlign: 'center' },
  smallCardSubtitle: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  tipCallout: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  tipCalloutIcon: { fontSize: 20, marginTop: 2 },
  tipCalloutContent: { flex: 1 },
  tipCalloutLabel: { fontSize: 11, fontWeight: '700', color: Colors.primaryDark, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  tipCalloutText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 21 },
  sectionHeading: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.lg },
  timeline: { marginBottom: Spacing.lg },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  timelineLeft: { alignItems: 'center', width: 40, marginRight: Spacing.md },
  timelineIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  timelineEmoji: { fontSize: 18 },
  timelineLine: { width: 2, height: 28, backgroundColor: Colors.border, marginVertical: 2 },
  timelineContent: { flex: 1, paddingBottom: Spacing.xl },
  timelineLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  timelineDescription: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
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
  signOutButton: { alignItems: 'center', paddingVertical: Spacing.lg, marginTop: Spacing.md },
  signOutText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '500' },
});
