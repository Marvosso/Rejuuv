import { forwardRef } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { ExerciseItem } from './ExerciseItem';
import { AccordionSection } from './AccordionSection';
import { Colors, Spacing, Radius } from '../../lib/theme';
import {
  type ExerciseCatalogRow,
  buildInstructionsForActivity,
  resolveExerciseForPlanActivity,
  whyThisHelpsOneLine,
} from '../../lib/exercises';
import type { RecoveryPlanExerciseRow } from '../../lib/types';
import { getLocalVideoForActivity } from '../../lib/localVideos';

export type PlanPhaseExerciseSectionProps = {
  phaseNum: 1 | 2 | 3;
  title: string;
  phaseGoal: string;
  exercises: RecoveryPlanExerciseRow[];
  avoid?: string[];
  catalog: ExerciseCatalogRow[];
  accentColor: string;
  expanded: boolean;
  onToggle: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export const PlanPhaseExerciseSection = forwardRef<View, PlanPhaseExerciseSectionProps>(
  function PlanPhaseExerciseSection(
    {
      phaseNum,
      title,
      phaseGoal,
      exercises,
      avoid = [],
      catalog,
      accentColor,
      expanded,
      onToggle,
      onLayout,
    },
    ref
  ) {
    if (exercises.length === 0) return null;

    return (
      <View ref={ref} onLayout={onLayout} collapsable={false}>
        <AccordionSection
          title={title}
          subtitle={phaseGoal}
          expanded={expanded}
          onToggle={onToggle}
          leftAccentColor={accentColor}
          accessibilityLabel={`${title}, ${exercises.length} exercises`}
          headerRight={
            <View style={[styles.countBadge, { borderColor: accentColor + '55' }]}>
              <Text style={[styles.countBadgeText, { color: accentColor }]}>{exercises.length}</Text>
            </View>
          }
        >
          <Text style={styles.guidedHint}>
            Each move includes a short demo — press play when you're ready.
          </Text>
          <View style={styles.exerciseList}>
            {exercises.map((ex, i) => {
              const rowKey = `p${phaseNum}-${i}`;
              const local = getLocalVideoForActivity(ex.name);
              const resolved = resolveExerciseForPlanActivity(ex.name, catalog, local?.source);
              const uri =
                resolved.videoSource &&
                typeof resolved.videoSource === 'object' &&
                'uri' in resolved.videoSource &&
                resolved.videoSource.uri
                  ? resolved.videoSource.uri
                  : undefined;
              const localAsset =
                typeof resolved.videoSource === 'number' ? resolved.videoSource : undefined;
              const whyFromPlan = ex.why_this_helps.trim();
              const whyText = whyFromPlan
                ? whyThisHelpsOneLine(ex.why_this_helps)
                : whyThisHelpsOneLine(resolved.whyThisHelps);
              const instructions =
                ex.form_tips.length > 0 ? ex.form_tips : buildInstructionsForActivity(ex.name);
              const setsText =
                ex.sets_reps && ex.sets_reps !== 'As in your plan'
                  ? ex.sets_reps
                  : resolved.setsReps;
              return (
                <View key={rowKey} style={styles.exerciseBlock}>
                  <ExerciseItem
                    exercise={{
                      name: ex.name,
                      whyThisHelps: whyText,
                      setsReps: setsText,
                      instructions,
                      videoUrl: uri,
                      localVideoAsset: localAsset,
                    }}
                  />
                </View>
              );
            })}
          </View>
          {avoid.length > 0 ? (
            <View style={styles.avoidBlock}>
              <Text style={styles.avoidTitle}>Go easy on</Text>
              {avoid.map((line, i) => (
                <View key={i} style={styles.avoidRow}>
                  <View style={[styles.avoidDot, { backgroundColor: accentColor }]} />
                  <Text style={styles.avoidText}>{line}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </AccordionSection>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    backgroundColor: Colors.surface,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  guidedHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: Spacing.md,
  },
  exerciseList: {
    gap: Spacing.lg,
  },
  exerciseBlock: {
    marginBottom: Spacing.xs,
  },
  avoidBlock: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  avoidTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  avoidRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  avoidDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    flexShrink: 0,
    opacity: 0.85,
  },
  avoidText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
});
