import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { G, Rect, Ellipse } from 'react-native-svg';
import { Colors, Spacing, Radius } from '../../lib/theme';

const BREAKPOINT_WIDE = 600;

const BODY_AREAS = [
  { key: 'neck',       label: 'Neck',       emoji: '🦴', description: 'Cervical spine & neck',          color: Colors.primary },
  { key: 'shoulder',   label: 'Shoulder',   emoji: '💪', description: 'Shoulder joint & rotator cuff',  color: '#8B5CF6' },
  { key: 'upper_back', label: 'Upper Back', emoji: '🔼', description: 'Thoracic spine & upper back',    color: '#F59E0B' },
  { key: 'lower_back', label: 'Lower Back', emoji: '🔧', description: 'Lumbar spine & lower back',      color: Colors.secondary },
  { key: 'hip',        label: 'Hip',        emoji: '🦷', description: 'Hip joint & surrounding area',   color: '#EF4444' },
  { key: 'knee',       label: 'Knee',       emoji: '🦵', description: 'Knee joint & surrounding area',  color: Colors.success },
  { key: 'ankle',      label: 'Ankle',      emoji: '🦶', description: 'Ankle joint & lower leg',        color: '#06B6D4' },
];

// Silhouette regions: ellipse positions (viewBox 0 0 200 420) mapped to intake body_area key
const SILHOUETTE_PARTS: { key: string; bodyAreaKey: string; cx: number; cy: number; rx: number; ry: number }[] = [
  { key: 'neck', bodyAreaKey: 'neck', cx: 100, cy: 72, rx: 12, ry: 10 },
  { key: 'shoulder_left', bodyAreaKey: 'shoulder', cx: 68, cy: 100, rx: 14, ry: 12 },
  { key: 'shoulder_right', bodyAreaKey: 'shoulder', cx: 132, cy: 100, rx: 14, ry: 12 },
  { key: 'upper_back', bodyAreaKey: 'upper_back', cx: 100, cy: 130, rx: 22, ry: 18 },
  { key: 'lower_back', bodyAreaKey: 'lower_back', cx: 100, cy: 175, rx: 20, ry: 16 },
  { key: 'hip_left', bodyAreaKey: 'hip', cx: 76, cy: 210, rx: 16, ry: 14 },
  { key: 'hip_right', bodyAreaKey: 'hip', cx: 124, cy: 210, rx: 16, ry: 14 },
  { key: 'knee_left', bodyAreaKey: 'knee', cx: 78, cy: 295, rx: 14, ry: 14 },
  { key: 'knee_right', bodyAreaKey: 'knee', cx: 122, cy: 295, rx: 14, ry: 14 },
  { key: 'ankle_left', bodyAreaKey: 'ankle', cx: 80, cy: 375, rx: 11, ry: 10 },
  { key: 'ankle_right', bodyAreaKey: 'ankle', cx: 120, cy: 375, rx: 11, ry: 10 },
];

export default function BodyAreaScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const router = useRouter();
  const { width } = useWindowDimensions();
  const numColumns = width >= BREAKPOINT_WIDE ? 3 : 2;

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
    router.push(`/intake/pain-level?body_area=${selected}`);
  };

  const handleQuickStart = (bodyAreaKey: string, presetTrigger: string[]) => {
    const triggerParam = encodeURIComponent(JSON.stringify(presetTrigger));
    router.push(`/intake/pain-level?body_area=${bodyAreaKey}&trigger=${triggerParam}`);
  };

  const selectFromMap = (bodyAreaKey: string) => setSelected(bodyAreaKey);

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

        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.8}
          >
            <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'map' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('map')}
            activeOpacity={0.8}
          >
            <Text style={[styles.viewToggleText, viewMode === 'map' && styles.viewToggleTextActive]}>Body Map</Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'list' ? (
          <View style={styles.chipGrid}>
            {BODY_AREAS.map((area, index) => {
              const isSelected = selected === area.key;
              return (
                <Animated.View
                  key={area.key}
                  style={[
                    styles.chipGridItem,
                    { width: `${100 / numColumns}%` },
                    { opacity: cardAnims[index], transform: [{ translateY: cardAnims[index].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      isSelected && { borderColor: area.color, borderWidth: 2, backgroundColor: area.color + '12' },
                    ]}
                    onPress={() => setSelected(area.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.chipEmoji}>{area.emoji}</Text>
                    <Text style={[styles.chipLabel, isSelected && { color: area.color, fontWeight: '700' }]}>{area.label}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        ) : (
          <Animated.View style={[styles.silhouetteWrap, { opacity: fadeAnim }]}>
            <Svg
              viewBox="0 0 200 420"
              style={styles.silhouetteSvg}
              pointerEvents={Platform.OS === 'web' ? 'none' : 'auto'}
            >
              <G fill={Colors.border}>
                <Rect x={91} y={64} width={18} height={18} rx={4} />
                <Rect x={68} y={82} width={64} height={110} rx={10} />
                <Ellipse cx={100} cy={200} rx={34} ry={18} />
                <Rect x={44} y={86} width={18} height={60} rx={8} />
                <Rect x={138} y={86} width={18} height={60} rx={8} />
                <Rect x={40} y={152} width={16} height={56} rx={8} />
                <Rect x={144} y={152} width={16} height={56} rx={8} />
                <Rect x={70} y={218} width={22} height={68} rx={10} />
                <Rect x={108} y={218} width={22} height={68} rx={10} />
                <Rect x={72} y={292} width={18} height={72} rx={8} />
                <Rect x={110} y={292} width={18} height={72} rx={8} />
                <Ellipse cx={80} cy={388} rx={14} ry={8} />
                <Ellipse cx={120} cy={388} rx={14} ry={8} />
              </G>
              {SILHOUETTE_PARTS.map((part) => {
                const area = BODY_AREAS.find((a) => a.key === part.bodyAreaKey);
                const isSelected = selected === part.bodyAreaKey;
                const fill = area ? (isSelected ? area.color : area.color + '60') : Colors.border;
                return (
                  <G
                    key={part.key}
                    {...(Platform.OS !== 'web' ? { onPress: () => selectFromMap(part.bodyAreaKey) } : {})}
                  >
                    <Ellipse
                      cx={part.cx}
                      cy={part.cy}
                      rx={part.rx}
                      ry={part.ry}
                      fill={fill}
                      opacity={0.9}
                      stroke={isSelected ? (area?.color ?? Colors.primary) : '#fff'}
                      strokeWidth={isSelected ? 2.5 : 1}
                    />
                  </G>
                );
              })}
            </Svg>
            {Platform.OS === 'web' && (
              <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                {SILHOUETTE_PARTS.map((part) => (
                  <TouchableOpacity
                    key={part.key}
                    onPress={() => selectFromMap(part.bodyAreaKey)}
                    style={[
                      styles.silhouetteWebOverlay,
                      {
                        left: `${((part.cx - part.rx) / 200) * 100}%`,
                        top: `${((part.cy - part.ry) / 420) * 100}%`,
                        width: `${(part.rx * 2 / 200) * 100}%`,
                        height: `${(part.ry * 2 / 420) * 100}%`,
                      },
                    ]}
                    activeOpacity={1}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${part.bodyAreaKey}`}
                  />
                ))}
              </View>
            )}
          </Animated.View>
        )}

        <View style={styles.commonIssuesSection}>
          <Text style={styles.commonIssuesLabel}>Common Issues</Text>
          <TouchableOpacity style={styles.commonIssuesCard} onPress={() => handleQuickStart('lower_back', ['Sitting'])} activeOpacity={0.8}>
            <View style={styles.commonIssuesCardContent}>
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>Popular</Text>
              </View>
              <Text style={styles.commonIssuesEmoji}>💺</Text>
              <View style={styles.commonIssuesText}>
                <Text style={styles.commonIssuesTitle}>I sit 8+ hours, lower back</Text>
                <Text style={styles.commonIssuesSubtitle}>Desk worker · Lower back</Text>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.commonIssuesCard} onPress={() => handleQuickStart('neck', ['Sitting'])} activeOpacity={0.8}>
            <View style={styles.commonIssuesCardContent}>
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>Popular</Text>
              </View>
              <Text style={styles.commonIssuesEmoji}>🖥️</Text>
              <View style={styles.commonIssuesText}>
                <Text style={styles.commonIssuesTitle}>Desk worker, neck</Text>
                <Text style={styles.commonIssuesSubtitle}>Neck · Screen time</Text>
              </View>
            </View>
          </TouchableOpacity>
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
  viewToggle: {
    flexDirection: 'row',
    gap: 0,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    padding: 4,
  },
  viewToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  viewToggleBtnActive: {
    backgroundColor: Colors.surface,
    ...(Platform.OS === 'web' ? { boxShadow: '0 1px 2px rgba(0,0,0,0.06)' } : { elevation: 1, shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }),
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  viewToggleTextActive: {
    color: Colors.primary,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chipGridItem: {
    paddingHorizontal: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipEmoji: {
    fontSize: 20,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  silhouetteWrap: {
    alignSelf: 'center',
    marginVertical: Spacing.md,
    width: 160,
    maxWidth: '100%',
    aspectRatio: 200 / 420,
    position: 'relative',
  },
  silhouetteSvg: {
    width: '100%',
    height: '100%',
  },
  silhouetteWebOverlay: {
    position: 'absolute',
  },
  commonIssuesSection: {
    marginTop: Spacing.xxl,
    padding: Spacing.lg,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    gap: Spacing.md,
  },
  commonIssuesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  commonIssuesCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commonIssuesCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -6,
    right: 0,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textInverse,
    letterSpacing: 0.5,
  },
  commonIssuesEmoji: {
    fontSize: 24,
  },
  commonIssuesText: {
    flex: 1,
  },
  commonIssuesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  commonIssuesSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
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
