import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Colors, Spacing, Radius } from '../../lib/theme';
import type { PainSeriesPoint } from '../../lib/recovery-timeline-types';

const SCREEN_WIDTH = Dimensions.get('window').width;

function shortLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

type Props = {
  series: PainSeriesPoint[];
};

/**
 * Longitudinal pain trend — teal palette (theme), no harsh reds on the curve itself.
 */
export function RecoveryTimelineChart({ series }: Props) {
  if (series.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Your curve will grow here</Text>
        <Text style={styles.emptySub}>
          After two pain scores in this view, you will see how things move over time — gently, without judgment.
        </Text>
      </View>
    );
  }

  const chartWidth = Math.max(220, SCREEN_WIDTH - Spacing.xxl * 2 - 16);
  const labels = series.map((p) => shortLabel(p.at));
  const data = {
    labels,
    datasets: [
      {
        data: series.map((p) => p.pain_level),
        color: () => Colors.primary,
        strokeWidth: 2,
      },
    ],
  };

  return (
    <LineChart
      data={data}
      width={chartWidth}
      height={190}
      yAxisSuffix=""
      yAxisInterval={1}
      fromZero
      chartConfig={{
        backgroundColor: Colors.surface,
        backgroundGradientFrom: Colors.surface,
        backgroundGradientTo: Colors.surface,
        decimalPlaces: 0,
        color: () => Colors.primary,
        labelColor: () => Colors.textSecondary,
        propsForDots: {
          r: '5',
          strokeWidth: '2',
          stroke: Colors.primaryDark,
        },
        propsForBackgroundLines: {
          stroke: Colors.border,
          strokeWidth: 1,
        },
      }}
      bezier
      style={styles.chart}
      withHorizontalLabels
      withVerticalLabels={series.length <= 14}
      segments={4}
    />
  );
}

const styles = StyleSheet.create({
  chart: {
    marginVertical: Spacing.sm,
    borderRadius: Radius.md,
    paddingRight: 0,
  },
  empty: {
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
});
