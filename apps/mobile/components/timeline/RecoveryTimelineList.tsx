import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Spacing } from '../../lib/theme';
import type { TimelineEntry } from '../../lib/recovery-timeline-types';
import {
  TimelineAdaptationCard,
  TimelineCheckInCard,
  TimelineMilestoneCard,
} from './TimelineEntryCards';

export function RecoveryTimelineList({ entries }: { entries: TimelineEntry[] }) {
  return (
    <View style={styles.wrap}>
      {entries.map((e) => {
        if (e.kind === 'check_in') {
          return <TimelineCheckInCard key={e.id} entry={e} />;
        }
        if (e.kind === 'adaptation') {
          return <TimelineAdaptationCard key={e.id} entry={e} />;
        }
        return <TimelineMilestoneCard key={e.id} entry={e} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: Spacing.xs,
  },
});
