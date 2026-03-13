import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import Svg, { G, Ellipse, Rect, Circle } from 'react-native-svg';
import { Colors } from '../lib/theme';

// Logical selection keys for parent state
export type AnatomicalRegion =
  | 'neck'
  | 'shoulders'
  | 'back'
  | 'hips'
  | 'knees'
  | 'ankles';

export interface AnatomicalMapProps {
  /** Currently selected region (controlled). */
  selected?: AnatomicalRegion | null;
  /** Called when a hotspot is tapped; passes the region key. */
  onSelect?: (region: AnatomicalRegion) => void;
  /** Rejuuv Teal used for highlight; defaults to theme primary. */
  highlightColor?: string;
  /** Optional test ID for the SVG container. */
  accessibilityLabel?: string;
}

// viewBox 0 0 200 420 — ellipse positions for tappable hotspots
const HOTSPOT_ELLIPSES: Record<
  AnatomicalRegion,
  { cx: number; cy: number; rx: number; ry: number }[]
> = {
  neck: [{ cx: 100, cy: 72, rx: 12, ry: 10 }],
  shoulders: [
    { cx: 68, cy: 100, rx: 14, ry: 12 },
    { cx: 132, cy: 100, rx: 14, ry: 12 },
  ],
  back: [
    { cx: 100, cy: 130, rx: 22, ry: 18 },
    { cx: 100, cy: 175, rx: 20, ry: 16 },
  ],
  hips: [
    { cx: 76, cy: 210, rx: 16, ry: 14 },
    { cx: 124, cy: 210, rx: 16, ry: 14 },
  ],
  knees: [
    { cx: 78, cy: 295, rx: 14, ry: 14 },
    { cx: 122, cy: 295, rx: 14, ry: 14 },
  ],
  ankles: [
    { cx: 80, cy: 375, rx: 11, ry: 10 },
    { cx: 120, cy: 375, rx: 11, ry: 10 },
  ],
};

const VIEWBOX_WIDTH = 200;
const VIEWBOX_HEIGHT = 420;
const ASPECT_RATIO = VIEWBOX_WIDTH / VIEWBOX_HEIGHT;

/** Bounding box as % of viewBox for overlay hit areas (web only). */
function getRegionBoxPercent(region: AnatomicalRegion): { left: number; top: number; width: number; height: number } {
  const ellipses = HOTSPOT_ELLIPSES[region];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const e of ellipses) {
    minX = Math.min(minX, e.cx - e.rx);
    maxX = Math.max(maxX, e.cx + e.rx);
    minY = Math.min(minY, e.cy - e.ry);
    maxY = Math.max(maxY, e.cy + e.ry);
  }
  return {
    left: (minX / VIEWBOX_WIDTH) * 100,
    top: (minY / VIEWBOX_HEIGHT) * 100,
    width: ((maxX - minX) / VIEWBOX_WIDTH) * 100,
    height: ((maxY - minY) / VIEWBOX_HEIGHT) * 100,
  };
}

export function AnatomicalMap({
  selected = null,
  onSelect,
  highlightColor = Colors.primary,
  accessibilityLabel = 'Anatomical body map',
}: AnatomicalMapProps) {
  const regions = (['neck', 'shoulders', 'back', 'hips', 'knees', 'ankles'] as const);
  const isWeb = Platform.OS === 'web';

  return (
    <View
      style={styles.container}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
    >
      <Svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        style={styles.svg}
        preserveAspectRatio="xMidYMid meet"
        pointerEvents={isWeb ? 'none' : 'auto'}
      >
        {/* Silhouette outline */}
        <G opacity={0.2}>
          <Circle cx={100} cy={42} r={24} fill="#6b7280" />
          <Rect x={91} y={64} width={18} height={18} rx={4} fill="#6b7280" />
          <Rect x={68} y={82} width={64} height={110} rx={10} fill="#6b7280" />
          <Ellipse cx={100} cy={200} rx={34} ry={18} fill="#6b7280" />
          <Rect x={44} y={86} width={18} height={60} rx={8} fill="#6b7280" />
          <Rect x={138} y={86} width={18} height={60} rx={8} fill="#6b7280" />
          <Rect x={40} y={152} width={16} height={56} rx={8} fill="#6b7280" />
          <Rect x={144} y={152} width={16} height={56} rx={8} fill="#6b7280" />
          <Rect x={70} y={218} width={22} height={68} rx={10} fill="#6b7280" />
          <Rect x={108} y={218} width={22} height={68} rx={10} fill="#6b7280" />
          <Rect x={72} y={292} width={18} height={72} rx={8} fill="#6b7280" />
          <Rect x={110} y={292} width={18} height={72} rx={8} fill="#6b7280" />
          <Ellipse cx={80} cy={388} rx={14} ry={8} fill="#6b7280" />
          <Ellipse cx={120} cy={388} rx={14} ry={8} fill="#6b7280" />
        </G>

        {/* Hotspot visuals — no onPress on web to avoid responder props on <g> */}
        {regions.map((region) => {
          const ellipses = HOTSPOT_ELLIPSES[region];
          const isSelected = selected === region;
          const fill = isSelected ? highlightColor : Colors.border;
          const fillOpacity = isSelected ? 0.6 : 0.4;
          const stroke = isSelected ? highlightColor : '#ffffff';
          const strokeWidth = isSelected ? 2.5 : 1;

          return (
            <G key={region} {...(!isWeb ? { onPress: () => onSelect?.(region) } : {})}>
              {ellipses.map((e, i) => (
                <Ellipse
                  key={`${region}-${i}`}
                  cx={e.cx}
                  cy={e.cy}
                  rx={e.rx}
                  ry={e.ry}
                  fill={fill}
                  opacity={fillOpacity}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                />
              ))}
            </G>
          );
        })}
      </Svg>
      {/* Web: overlay Pressables so DOM gets onClick only, no responder props on SVG */}
      {isWeb && onSelect && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {regions.map((region) => {
            const box = getRegionBoxPercent(region);
            return (
              <Pressable
                key={region}
                onPress={() => onSelect(region)}
                style={[
                  styles.webHotspotOverlay,
                  {
                    left: `${box.left}%`,
                    top: `${box.top}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Select ${region}`}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: ASPECT_RATIO,
    maxWidth: 280,
    alignSelf: 'center',
    position: 'relative',
  },
  svg: {
    width: '100%',
    height: '100%',
  },
  webHotspotOverlay: {
    position: 'absolute',
  },
});

export default AnatomicalMap;
