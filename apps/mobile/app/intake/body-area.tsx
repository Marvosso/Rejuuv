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
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { G, Rect, Ellipse } from 'react-native-svg';
import { Colors, Spacing, Radius } from '../../lib/theme';
import { BODY_AREAS, SILHOUETTE_PARTS } from '../../lib/intake-constants';
import { useIntakeWizard } from '../../lib/intake-wizard-context';
import { microInsightForBodyArea } from '../../lib/intake-micro-insights';
import { IntakeProgressHeader, IntakeMicroInsight } from '../../components/intake';

const BREAKPOINT_WIDE = 600;

export default function BodyAreaScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const router = useRouter();
  const { reset: resetParam } = useLocalSearchParams<{ reset?: string }>();
  const { setBodyArea, resetWizard, bodyArea: ctxBody } = useIntakeWizard();
  const { width } = useWindowDimensions();
  const numColumns = width >= BREAKPOINT_WIDE ? 3 : 2;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(BODY_AREAS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (resetParam === '1') {
      resetWizard();
      setSelected(null);
      return;
    }
    if (ctxBody) {
      setSelected(ctxBody);
    }
  }, [resetParam, resetWizard, ctxBody]);

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
    setBodyArea(selected);
    router.push('/intake/pain-level');
  };

  const selectFromMap = (bodyAreaKey: string) => setSelected(bodyAreaKey);

  const insight = selected ? microInsightForBodyArea(selected) : null;

  return (
    <View style={styles.container}>
      <IntakeProgressHeader
        currentStep={1}
        showBack={false}
        onCancel={() => router.replace('/')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.title}>Where does it hurt?</Text>
          <Text style={styles.subtitle}>Pick the area that bothers you most — you can refine later.</Text>
        </Animated.View>

        {insight ? <IntakeMicroInsight message={insight} /> : null}

        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.8}
          >
            <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>Large icons</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'map' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('map')}
            activeOpacity={0.8}
          >
            <Text style={[styles.viewToggleText, viewMode === 'map' && styles.viewToggleTextActive]}>Body map</Text>
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
                    {
                      opacity: cardAnims[index],
                      transform: [
                        {
                          translateY: cardAnims[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [12, 0],
                          }),
                        },
                      ],
                    },
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
                    <Text style={styles.chipEmojiLarge}>{area.emoji}</Text>
                    <Text style={[styles.chipLabel, isSelected && { color: area.color, fontWeight: '700' }]}>
                      {area.label}
                    </Text>
                    <Text style={styles.chipDesc} numberOfLines={2}>
                      {area.description}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        ) : (
          <Animated.View style={[styles.silhouetteWrap, { opacity: fadeAnim }]}>
            <Text style={styles.mapTeaser}>Tap a highlighted region</Text>
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
                        width: `${((part.rx * 2) / 200) * 100}%`,
                        height: `${((part.ry * 2) / 420) * 100}%`,
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
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !selected && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>
            {selected ? `Continue — ${BODY_AREAS.find((a) => a.key === selected)?.label}` : 'Select an area'}
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
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  viewToggle: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
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
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }
      : { elevation: 1, shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }),
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
    gap: Spacing.md,
  },
  chipGridItem: {
    paddingHorizontal: 2,
  },
  chip: {
    minHeight: 120,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  chipEmojiLarge: {
    fontSize: 36,
  },
  chipLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  chipDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  mapTeaser: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  silhouetteWrap: {
    alignSelf: 'center',
    marginVertical: Spacing.md,
    width: 180,
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
