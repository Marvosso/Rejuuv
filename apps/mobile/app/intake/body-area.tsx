import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Shadows, Spacing, Radius } from '../../lib/theme';

const BODY_AREAS = [
  { key: 'neck',       label: 'Neck',       emoji: '🦴', description: 'Cervical spine & neck',          color: Colors.primary },
  { key: 'shoulder',   label: 'Shoulder',   emoji: '💪', description: 'Shoulder joint & rotator cuff',  color: '#8B5CF6' },
  { key: 'upper_back', label: 'Upper Back', emoji: '🔼', description: 'Thoracic spine & upper back',    color: '#F59E0B' },
  { key: 'lower_back', label: 'Lower Back', emoji: '🔧', description: 'Lumbar spine & lower back',      color: Colors.secondary },
  { key: 'hip',        label: 'Hip',        emoji: '🦷', description: 'Hip joint & surrounding area',   color: '#EF4444' },
  { key: 'knee',       label: 'Knee',       emoji: '🦵', description: 'Knee joint & surrounding area',  color: Colors.success },
  { key: 'ankle',      label: 'Ankle',      emoji: '🦶', description: 'Ankle joint & lower leg',        color: '#06B6D4' },
];

export default function BodyAreaScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(BODY_AREAS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.stagger(
        100,
        cardAnims.map((anim) =>
          Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true })
        )
      ),
    ]).start();
  }, []);

  const handleContinue = () => {
    if (!selected) return;
    router.push(`/intake/pain-details?body_area=${selected}`);
  };

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '25%' }]} />
      </View>
      <View style={styles.topBar}>
        <Text style={styles.progressLabel}>Step 1 of 4</Text>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.title}>Where does it hurt?</Text>
          <Text style={styles.subtitle}>Select the area giving you the most trouble</Text>
        </Animated.View>

        <View style={styles.areaGrid}>
          {BODY_AREAS.map((area, index) => {
            const isSelected = selected === area.key;
            return (
              <Animated.View
                key={area.key}
                style={{
                  opacity: cardAnims[index],
                  transform: [{ translateY: cardAnims[index].interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
                  width: '48%',
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.areaCard,
                    isSelected && styles.areaCardSelected,
                    isSelected && { borderColor: area.color },
                  ]}
                  onPress={() => setSelected(area.key)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.emojiContainer, { backgroundColor: area.color + (isSelected ? 'FF' : '20') }]}>
                    <Text style={styles.areaEmoji}>{area.emoji}</Text>
                  </View>
                  <Text style={[styles.areaLabel, isSelected && { color: area.color }]}>{area.label}</Text>
                  <Text style={styles.areaDescription}>{area.description}</Text>
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: area.color }]}>
                      <Text style={styles.checkBadgeText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !selected && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>
            {selected ? `Continue with ${BODY_AREAS.find((a) => a.key === selected)?.label}` : 'Select an area to continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.sm,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cancelBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelBtnText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  scrollContent: {
    padding: Spacing.xxl,
    paddingBottom: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxl,
    lineHeight: 24,
  },
  areaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  areaCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  areaCardSelected: {
    borderWidth: 2,
  },
  emojiContainer: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  areaEmoji: {
    fontSize: 30,
  },
  areaLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  areaDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeText: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xxl,
    paddingBottom: 40,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 18,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: Colors.textMuted,
  },
  continueButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
