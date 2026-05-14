import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Colors, Radius, Spacing } from '../lib/theme';

export type PainChangeValue = 'Better' | 'Same' | 'Worse';

function messageForChange(change: PainChangeValue): { headline: string; sub: string } {
  switch (change) {
    case 'Better':
      return {
        headline: "You're moving the right way",
        sub: 'Small wins stack up. Come back tomorrow and keep the streak warm.',
      };
    case 'Worse':
      return {
        headline: 'Thanks for checking in',
        sub: "Honest logs help us spot patterns. You're still showing up — that counts.",
      };
    default:
      return {
        headline: 'Nice — logged',
        sub: 'Steady days still build recovery. Tap anywhere to continue.',
      };
  }
}

type Props = {
  visible: boolean;
  painChange: PainChangeValue;
  onDismiss: () => void;
};

export function CheckInCelebration({ visible, painChange, onDismiss }: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const { headline, sub } = messageForChange(painChange);

  useEffect(() => {
    if (!visible) {
      scale.setValue(0);
      opacity.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, opacity, scale]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Animated.View style={[styles.backdropTint, { opacity }]} />
        <Pressable style={styles.cardWrap} onPress={(e) => e.stopPropagation()}>
          <Animated.View
            style={[
              styles.card,
              {
                opacity,
                transform: [{ scale }],
              },
            ]}
          >
            <Text style={styles.emoji}>🎉</Text>
            <Text style={styles.sparkles}>✨</Text>
            <Text style={styles.headline}>{headline}</Text>
            <Text style={styles.sub}>{sub}</Text>
            <Pressable style={styles.cta} onPress={onDismiss} hitSlop={12}>
              <Text style={styles.ctaText}>Awesome</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  cardWrap: {
    width: '100%',
    maxWidth: 340,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emoji: {
    fontSize: 56,
    marginBottom: Spacing.sm,
  },
  sparkles: {
    fontSize: 18,
    marginBottom: Spacing.md,
    opacity: 0.85,
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  sub: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  cta: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: Radius.md,
  },
  ctaText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
});
