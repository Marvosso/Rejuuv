import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Colors, Spacing, Radius } from '../lib/theme';

export type ExerciseDemoProps = {
  name: string;
  whyThisHelps: string;
  setsReps: string;
  /** Remote `{ uri }` from Supabase or bundled `require()` asset number */
  videoSource: { uri: string } | number | null;
  regressionHint?: string;
  onTooHard?: () => void;
  /** Nested inside phase list: lighter chrome, no extra outer margin */
  variant?: 'standalone' | 'embedded';
};

export function ExerciseDemo({
  name,
  whyThisHelps,
  setsReps,
  videoSource,
  regressionHint = 'Try half the reps, a smaller range of motion, or rest longer between sets. If anything feels sharp or radiating, stop and use your check-in to tell us.',
  onTooHard,
  variant = 'standalone',
}: ExerciseDemoProps) {
  const embedded = variant === 'embedded';
  const wrapperRef = useRef<View>(null);
  const [videoKey, setVideoKey] = useState(0);

  const uri =
    videoSource != null && typeof videoSource === 'object' ? videoSource.uri : null;
  const hasRemoteUri = Boolean(uri && uri.length > 0);
  const hasLocalAsset = typeof videoSource === 'number';
  const canPlay = hasRemoteUri || hasLocalAsset;

  useEffect(() => {
    setVideoKey((k) => k + 1);
  }, [uri, videoSource]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !hasRemoteUri) return;
    const id = setTimeout(() => {
      const wrapper = wrapperRef.current as unknown as HTMLElement | null;
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
  }, [hasRemoteUri, videoKey]);

  const handleTooHard = useCallback(() => {
    if (__DEV__) {
      console.log('[ExerciseDemo] too_hard feedback', { exercise: name });
    }
    onTooHard?.();
    Alert.alert('Ease up a bit', regressionHint, [{ text: 'Got it', style: 'default' }]);
  }, [name, onTooHard, regressionHint]);

  return (
    <View style={[styles.card, embedded && styles.cardEmbedded]}>
      {!embedded ? <View style={styles.accentBar} /> : null}
      <View style={[styles.inner, embedded && styles.innerEmbedded]}>
        {canPlay ? (
          <View ref={wrapperRef} style={styles.videoShell} collapsable={false}>
            <Video
              key={videoKey}
              source={
                hasLocalAsset
                  ? (videoSource as number)
                  : { uri: uri as string }
              }
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
              isLooping={false}
            />
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>Demo on the way</Text>
            <Text style={styles.placeholderBody}>
              A short form-check clip will show here once this exercise is linked in your video
              library.
            </Text>
          </View>
        )}

        <Text style={[styles.name, embedded && styles.nameEmbedded]}>{name}</Text>

        <View style={styles.metaRow}>
          <View style={styles.setsPill}>
            <Text style={styles.setsLabel}>Sets / reps</Text>
            <Text style={styles.setsValue}>{setsReps}</Text>
          </View>
        </View>

        <View style={styles.whyBlock}>
          <Text style={styles.whyLabel}>Why this helps</Text>
          <Text style={styles.whyText}>{whyThisHelps}</Text>
        </View>

        <TouchableOpacity
          style={styles.tooHardBtn}
          onPress={handleTooHard}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Too hard — show easier options"
        >
          <Text style={styles.tooHardBtnText}>Too hard?</Text>
          <Text style={styles.tooHardSub}>We'll suggest a gentler approach</Text>
        </TouchableOpacity>
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
    borderColor: 'rgba(13, 148, 136, 0.18)',
    marginTop: Spacing.sm,
  },
  cardEmbedded: {
    marginTop: 0,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    borderColor: Colors.border,
  },
  accentBar: {
    height: 3,
    backgroundColor: Colors.primary,
    opacity: 0.85,
  },
  inner: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  innerEmbedded: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  videoShell: {
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
  placeholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    padding: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.2)',
  },
  placeholderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: Spacing.sm,
  },
  placeholderBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  nameEmbedded: {
    fontSize: 17,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  setsPill: {
    backgroundColor: Colors.primaryLight,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.25)',
  },
  setsLabel: {
    fontSize: 11,
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
  whyBlock: {
    gap: Spacing.xs,
  },
  whyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  whyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 23,
  },
  tooHardBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: 'rgba(13, 148, 136, 0.45)',
    alignItems: 'center',
  },
  tooHardBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  tooHardSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
