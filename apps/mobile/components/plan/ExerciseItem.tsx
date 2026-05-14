/**
 * Reusable exercise card for recovery plan phases.
 *
 * @example
 * ```tsx
 * import { ExerciseItem } from './components/plan/ExerciseItem';
 * import { buildInstructionsForActivity } from './lib/exercises';
 *
 * <ExerciseItem
 *   exercise={{
 *     name: 'Glute bridge',
 *     whyThisHelps: 'Wakes up your glutes so your low back does less work.',
 *     setsReps: '2–3 × 8–12',
 *     instructions: buildInstructionsForActivity('Glute bridge; squeeze at the top'),
 *     videoUrl: 'https://.../clip.mp4',
 *   }}
 * />
 * ```
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
  TouchableOpacity,
  AppState,
} from 'react-native';
import Collapsible from 'react-native-collapsible';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Radius } from '../../lib/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type ExerciseItemExercise = {
  name: string;
  whyThisHelps: string;
  setsReps: string;
  instructions: string[];
  videoUrl?: string;
  /** Optional fallback when no video (remote URL). */
  imageUrl?: string;
  /**
   * Bundled `require('./x.mp4')` when there is no `videoUrl` (e.g. local demos).
   * Not in the minimal public shape but supported for plan integration.
   */
  localVideoAsset?: number;
};

export type ExerciseItemProps = {
  exercise: ExerciseItemExercise;
};

const VIEWPORT_PAD_TOP = 72;
const VIEWPORT_PAD_BOTTOM = 48;
const VISIBILITY_POLL_MS = 380;

export function ExerciseItem({ exercise }: ExerciseItemProps) {
  const { name, whyThisHelps, setsReps, instructions, videoUrl, imageUrl, localVideoAsset } =
    exercise;

  const [howExpanded, setHowExpanded] = useState(false);
  const [toast, setToast] = useState('');
  const [videoPlaying, setVideoPlaying] = useState(false);
  const mediaWrapRef = useRef<View>(null);
  const videoRef = useRef<Video>(null);
  const [mediaKey, setMediaKey] = useState(0);

  const hasRemoteVideo = Boolean(videoUrl && videoUrl.length > 0);
  const hasLocalVideo = localVideoAsset != null && typeof localVideoAsset === 'number';
  const showVideo = hasRemoteVideo || hasLocalVideo;

  useEffect(() => {
    setMediaKey((k) => k + 1);
  }, [videoUrl, localVideoAsset]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !hasRemoteVideo) return;
    const id = setTimeout(() => {
      const wrapper = mediaWrapRef.current as unknown as HTMLElement | null;
      const el = wrapper?.querySelector?.('video');
      if (el && el.style) {
        el.style.position = 'relative';
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.objectFit = 'contain';
        el.style.display = 'block';
      }
    }, 120);
    return () => clearTimeout(id);
  }, [hasRemoteVideo, mediaKey]);

  const pauseVideo = useCallback(async () => {
    try {
      await videoRef.current?.pauseAsync();
    } catch {
      /* ignore */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        pauseVideo();
      };
    }, [pauseVideo])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') pauseVideo();
    });
    return () => sub.remove();
  }, [pauseVideo]);

  useEffect(() => {
    if (!showVideo || !videoPlaying || Platform.OS === 'web') return;
    const winH = Dimensions.get('window').height;
    const id = setInterval(() => {
      mediaWrapRef.current?.measureInWindow((_x, y, _w, h) => {
        const offTop = y + h < VIEWPORT_PAD_TOP;
        const offBottom = y > winH - VIEWPORT_PAD_BOTTOM;
        if (offTop || offBottom) pauseVideo();
      });
    }, VISIBILITY_POLL_MS);
    return () => clearInterval(id);
  }, [showVideo, videoPlaying, pauseVideo]);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setVideoPlaying(status.isPlaying);
  }, []);

  const toggleHowTo = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setHowExpanded((v) => !v);
  };

  const onTooHard = () => {
    if (__DEV__) {
      console.log('[ExerciseItem] too_hard', { exercise: name });
    }
    setToast('Suggesting easier version…');
    setTimeout(() => setToast(''), 2200);
  };

  const instructionList = instructions.length > 0 ? instructions : ['Take it slow and stay comfortable.'];

  return (
    <View style={styles.card}>
      <View style={styles.accentBar} />

      <View style={styles.inner}>
        <Text style={styles.name}>{name}</Text>

        <View style={styles.whyBlock}>
          <Text style={styles.whyLabel}>Why this helps</Text>
          <Text style={styles.whyText}>{whyThisHelps}</Text>
        </View>

        <View style={styles.setsPill}>
          <Text style={styles.setsLabel}>Sets / reps</Text>
          <Text style={styles.setsValue}>{setsReps}</Text>
        </View>

        <View ref={mediaWrapRef} style={styles.mediaWrap} collapsable={false}>
          {showVideo ? (
            <Video
              ref={videoRef}
              key={`${videoUrl ?? 'local'}-${mediaKey}`}
              source={hasLocalVideo ? (localVideoAsset as number) : { uri: videoUrl as string }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
              isLooping={false}
              onPlaybackStatusUpdate={onPlaybackStatusUpdate}
            />
          ) : imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderIcon}>▶</Text>
              <Text style={styles.placeholderTitle}>Video coming soon</Text>
              <Text style={styles.placeholderBody}>
                We'll add a short form-check clip here. For now, follow the steps below.
              </Text>
            </View>
          )}
        </View>

        <Pressable
          style={styles.howHeader}
          onPress={toggleHowTo}
          accessibilityRole="button"
          accessibilityState={{ expanded: howExpanded }}
          accessibilityLabel="How to do this exercise"
        >
          <Text style={styles.howHeaderTitle}>How to do this exercise</Text>
          <Text style={styles.howHeaderChevron}>{howExpanded ? '▼' : '▶'}</Text>
        </Pressable>

        <Collapsible collapsed={!howExpanded} collapsedHeight={0}>
          <View style={styles.bulletList}>
            {instructionList.map((line, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{line}</Text>
              </View>
            ))}
          </View>
        </Collapsible>

        <TouchableOpacity
          style={styles.tooHardBtn}
          onPress={onTooHard}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Too hard — suggest an easier version"
        >
          <Text style={styles.tooHardText}>Too hard</Text>
        </TouchableOpacity>

        {toast ? <Text style={styles.toast}>{toast}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.16)',
    marginBottom: Spacing.sm,
  },
  accentBar: {
    height: 3,
    backgroundColor: Colors.primary,
    opacity: 0.9,
  },
  inner: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  whyBlock: {
    gap: Spacing.xs,
  },
  whyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.65,
  },
  whyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 23,
  },
  setsPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.22)',
  },
  setsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  setsValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  mediaWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.md,
    backgroundColor: '#0f172a',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.2)',
  },
  placeholderIcon: {
    fontSize: 28,
    color: Colors.primary,
    marginBottom: Spacing.sm,
    opacity: 0.85,
  },
  placeholderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: Spacing.xs,
  },
  placeholderBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  howHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginHorizontal: -Spacing.sm,
    borderRadius: Radius.sm,
  },
  howHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  howHeaderChevron: {
    fontSize: 12,
    color: Colors.textMuted,
    width: 24,
    textAlign: 'right',
  },
  bulletList: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 8,
    flexShrink: 0,
    opacity: 0.85,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  tooHardBtn: {
    marginTop: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(13, 148, 136, 0.4)',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  tooHardText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  toast: {
    fontSize: 13,
    color: Colors.primaryDark,
    textAlign: 'center',
    fontWeight: '600',
  },
});
