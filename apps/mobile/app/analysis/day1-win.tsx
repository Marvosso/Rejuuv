import { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Video } from 'expo-av';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radius } from '../../lib/theme';
import { DEFAULT_DAY1_VIDEO } from '../../lib/localVideos';

// Optional: set EXPO_PUBLIC_DAY1_WIN_VIDEO_URL to a 15s mobility video URL; otherwise we use local hip_mobility.mp4
const DAY1_VIDEO_URI = process.env.EXPO_PUBLIC_DAY1_WIN_VIDEO_URL || null;

const BODY_AREA_LABELS: Record<string, string> = {
  neck: 'Neck',
  shoulder: 'Shoulder',
  upper_back: 'Upper Back',
  lower_back: 'Lower Back',
  hip: 'Hip',
  knee: 'Knee',
  ankle: 'Ankle',
};

export default function Day1WinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const bodyArea = (params.body_area as string) || '';
  const analysisParam = params.analysis as string | undefined;
  const intakeDataParam = params.intakeData as string | undefined;

  const areaLabel = BODY_AREA_LABELS[bodyArea] || bodyArea.replace(/_/g, ' ');

  const handleContinue = () => {
    const query: Record<string, string> = {};
    if (analysisParam) query.analysis = analysisParam;
    if (intakeDataParam) query.intakeData = intakeDataParam;
    router.push({
      pathname: '/analysis/results',
      params: query,
    });
  };

  const videoRef = useRef<Video>(null);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.emoji}>🎯</Text>
          <Text style={styles.title}>Here's your first win</Text>
          <Text style={styles.subtitle}>
            Try this gentle {areaLabel.toLowerCase()} mobility move before we build your full plan.
          </Text>
        </View>

        {DAY1_VIDEO_URI && Platform.OS !== 'web' ? (
          <View style={styles.videoContainer}>
            <Video
              ref={videoRef}
              source={{ uri: DAY1_VIDEO_URI }}
              style={styles.video}
              useNativeControls
              resizeMode="contain"
            />
          </View>
        ) : Platform.OS !== 'web' ? (
          <View style={styles.videoContainer}>
            <Video
              ref={videoRef}
              source={DEFAULT_DAY1_VIDEO}
              style={styles.video}
              useNativeControls
              resizeMode="contain"
            />
          </View>
        ) : (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderEmoji}>▶️</Text>
            <Text style={styles.placeholderTitle}>15-second mobility move</Text>
            <Text style={styles.placeholderSubtitle}>
              Here's your first win — try a gentle {areaLabel.toLowerCase()} mobility move.
            </Text>
          </View>
        )}

        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.continueButtonText}>Continue to my full plan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.xxl,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  emoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xxl,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholderCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  placeholderEmoji: {
    fontSize: 40,
    marginBottom: Spacing.md,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 8,
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaSection: {
    marginTop: Spacing.lg,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 18,
    alignItems: 'center',
  },
  continueButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
