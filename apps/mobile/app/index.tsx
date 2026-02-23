import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { Colors, Spacing, Radius } from '../lib/theme';

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
  }, []);

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

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

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
        <View style={styles.heroSection}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Text style={styles.logoText}>Rejuuv</Text>
            <Text style={styles.welcomeHeading}>Welcome back! 👋</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </Animated.View>
        </View>
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.actionCardsRow}>
            <TouchableOpacity style={[styles.actionCard, styles.actionCardPrimary]} onPress={() => router.push('/intake/body-area')} activeOpacity={0.85}>
              <Text style={styles.actionCardEmoji}>🩺</Text>
              <Text style={[styles.actionCardTitle, { color: Colors.textInverse }]}>New Assessment</Text>
              <Text style={[styles.actionCardSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>Start fresh evaluation</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionCard, styles.actionCardSecondary]} onPress={() => router.push('/plans')} activeOpacity={0.85}>
              <Text style={styles.actionCardEmoji}>📋</Text>
              <Text style={[styles.actionCardTitle, { color: Colors.primary }]}>My Plans</Text>
              <Text style={[styles.actionCardSubtitle, { color: Colors.textSecondary }]}>View recovery plans</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionCardsRow}>
            <TouchableOpacity style={[styles.actionCard, styles.actionCardSecondary]} onPress={() => router.push('/dashboard/body-map')} activeOpacity={0.85}>
              <Text style={styles.actionCardEmoji}>🫀</Text>
              <Text style={[styles.actionCardTitle, { color: Colors.primary }]}>Body Map</Text>
              <Text style={[styles.actionCardSubtitle, { color: Colors.textSecondary }]}>Pain by area</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionCard, styles.actionCardSecondary]} onPress={() => router.push('/dashboard/history')} activeOpacity={0.85}>
              <Text style={styles.actionCardEmoji}>📈</Text>
              <Text style={[styles.actionCardTitle, { color: Colors.primary }]}>Progress</Text>
              <Text style={[styles.actionCardSubtitle, { color: Colors.textSecondary }]}>Pain timeline</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionHeading}>Your Recovery Journey</Text>
          <FeatureCard emoji="📍" title="Track Your Pain" description="Log symptoms and monitor pain levels over time to see what's working." delay={100} />
          <FeatureCard emoji="💡" title="Get Expert Guidance" description="AI-powered recovery plans tailored to your specific condition and needs." delay={200} />
          <FeatureCard emoji="📈" title="See Your Progress" description="Visual tracking of your improvement journey week by week." delay={300} />
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
  logoText: { fontSize: 36, fontWeight: '800', color: Colors.textInverse, marginBottom: 8, letterSpacing: -0.5 },
  heroHeading: { fontSize: 30, fontWeight: '800', color: Colors.textInverse, lineHeight: 38, marginBottom: 12 },
  heroSubheading: { fontSize: 16, color: 'rgba(255,255,255,0.85)', lineHeight: 24 },
  welcomeHeading: { fontSize: 26, fontWeight: '700', color: Colors.textInverse, marginBottom: 4 },
  userEmail: { fontSize: 15, color: 'rgba(255,255,255,0.75)' },
  scrollArea: { flex: 1 },
  scrollContent: { padding: Spacing.xxl, paddingBottom: 48 },
  actionCardsRow: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.xxl },
  actionCard: { flex: 1, borderRadius: Radius.lg, padding: Spacing.xl, alignItems: 'center' },
  actionCardPrimary: { backgroundColor: Colors.primary },
  actionCardSecondary: { backgroundColor: Colors.surface, borderWidth: 2, borderColor: Colors.primary },
  actionCardEmoji: { fontSize: 32, marginBottom: Spacing.sm },
  actionCardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2, textAlign: 'center' },
  actionCardSubtitle: { fontSize: 12, textAlign: 'center' },
  sectionHeading: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.lg },
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
