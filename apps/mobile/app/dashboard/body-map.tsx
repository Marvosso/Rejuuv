import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Svg, { Circle, Path, G, Rect, Ellipse } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { getSession } from '../../lib/auth';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AreaHistory {
  id: string;
  pain_level: number | null;
  date: string;
}

interface AreaData {
  body_area: string;
  latest_pain_level: number | null;
  latest_date: string;
  history: AreaHistory[];
}

// ─── Body part definitions ────────────────────────────────────────────────────
// cx/cy/rx/ry are in SVG units (viewBox 0 0 200 420)

interface BodyPart {
  key: string;
  label: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

const BODY_PARTS: BodyPart[] = [
  { key: 'neck',           label: 'Neck',          cx: 100, cy: 72,  rx: 12, ry: 10 },
  { key: 'shoulder_left',  label: 'Left Shoulder',  cx: 68,  cy: 100, rx: 14, ry: 12 },
  { key: 'shoulder_right', label: 'Right Shoulder', cx: 132, cy: 100, rx: 14, ry: 12 },
  { key: 'upper_back',     label: 'Upper Back',     cx: 100, cy: 130, rx: 22, ry: 18 },
  { key: 'lower_back',     label: 'Lower Back',     cx: 100, cy: 175, rx: 20, ry: 16 },
  { key: 'hip_left',       label: 'Left Hip',       cx: 76,  cy: 210, rx: 16, ry: 14 },
  { key: 'hip_right',      label: 'Right Hip',      cx: 124, cy: 210, rx: 16, ry: 14 },
  { key: 'knee_left',      label: 'Left Knee',      cx: 78,  cy: 295, rx: 14, ry: 14 },
  { key: 'knee_right',     label: 'Right Knee',     cx: 122, cy: 295, rx: 14, ry: 14 },
  { key: 'ankle_left',     label: 'Left Ankle',     cx: 80,  cy: 375, rx: 11, ry: 10 },
  { key: 'ankle_right',    label: 'Right Ankle',    cx: 120, cy: 375, rx: 11, ry: 10 },
];

// Maps assessment body_area keys → one or more body part keys.
// Generic keys (no left/right) map to both sides so neither is falsely highlighted.
const AREA_KEY_MAP: Record<string, string[]> = {
  neck:           ['neck'],
  shoulder:       ['shoulder_left', 'shoulder_right'],
  left_shoulder:  ['shoulder_left'],
  right_shoulder: ['shoulder_right'],
  upper_back:     ['upper_back'],
  lower_back:     ['lower_back'],
  hip:            ['hip_left', 'hip_right'],
  left_hip:       ['hip_left'],
  right_hip:      ['hip_right'],
  knee:           ['knee_left', 'knee_right'],
  left_knee:      ['knee_left'],
  right_knee:     ['knee_right'],
  ankle:          ['ankle_left', 'ankle_right'],
  left_ankle:     ['ankle_left'],
  right_ankle:    ['ankle_right'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function painColor(level: number | null): string {
  if (level === null) return '#d1d5db'; // gray — no data
  if (level <= 3)     return '#16a34a'; // green — low
  if (level <= 6)     return '#d97706'; // yellow/amber — moderate
  return '#dc2626';                      // red — high
}

function painLabel(level: number | null): string {
  if (level === null) return 'No data';
  if (level <= 3)     return `Pain ${level}/10 — Low`;
  if (level <= 6)     return `Pain ${level}/10 — Moderate`;
  return `Pain ${level}/10 — High`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BodyMapScreen() {
  const router = useRouter();
  const [areaMap, setAreaMap] = useState<Record<string, AreaData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BodyPart | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const session = await getSession();
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
        const response = await fetch(`${apiUrl}/assessments/history`, {
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {}),
          },
        });

        if (!response.ok) throw new Error('Failed to load history');

        const data = await response.json();
        const map: Record<string, AreaData> = {};
        for (const area of data.areas ?? []) {
          const mappedKeys = AREA_KEY_MAP[area.body_area] ?? [area.body_area];
          for (const key of mappedKeys) {
            // Keep the highest pain entry if multiple areas map to the same key
            if (!map[key] || (area.latest_pain_level ?? 0) > (map[key].latest_pain_level ?? 0)) {
              map[key] = area;
            }
          }
        }
        setAreaMap(map);
      } catch {
        setError('Could not load pain history.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handlePartPress = (part: BodyPart) => {
    setSelected(part);
    setModalVisible(true);
  };

  const selectedData = selected ? areaMap[selected.key] ?? null : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Pain Body Map</Text>
        <Text style={styles.subheading}>Tap a region to see your history</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Legend */}
        <View style={styles.legend}>
          {[
            { color: '#16a34a', label: 'Low (1–3)' },
            { color: '#d97706', label: 'Moderate (4–6)' },
            { color: '#dc2626', label: 'High (7–10)' },
            { color: '#d1d5db', label: 'No data' },
          ].map(({ color, label }) => (
            <View key={label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading your data...</Text>
          </View>
        ) : (
          <>
            {error && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* SVG Body Diagram */}
            <View style={styles.svgContainer}>
              <Svg width="100%" viewBox="0 0 200 420" style={styles.svg}>
                {/* ── Body outline ── */}
                <G opacity={0.15}>
                  {/* Head */}
                  <Circle cx={100} cy={42} r={24} fill="#6b7280" />
                  {/* Neck */}
                  <Rect x={91} y={64} width={18} height={18} rx={4} fill="#6b7280" />
                  {/* Torso */}
                  <Rect x={68} y={82} width={64} height={110} rx={10} fill="#6b7280" />
                  {/* Pelvis */}
                  <Ellipse cx={100} cy={200} rx={34} ry={18} fill="#6b7280" />
                  {/* Left upper arm */}
                  <Rect x={44} y={86} width={18} height={60} rx={8} fill="#6b7280" />
                  {/* Right upper arm */}
                  <Rect x={138} y={86} width={18} height={60} rx={8} fill="#6b7280" />
                  {/* Left forearm */}
                  <Rect x={40} y={152} width={16} height={56} rx={8} fill="#6b7280" />
                  {/* Right forearm */}
                  <Rect x={144} y={152} width={16} height={56} rx={8} fill="#6b7280" />
                  {/* Left thigh */}
                  <Rect x={70} y={218} width={22} height={68} rx={10} fill="#6b7280" />
                  {/* Right thigh */}
                  <Rect x={108} y={218} width={22} height={68} rx={10} fill="#6b7280" />
                  {/* Left shin */}
                  <Rect x={72} y={292} width={18} height={72} rx={8} fill="#6b7280" />
                  {/* Right shin */}
                  <Rect x={110} y={292} width={18} height={72} rx={8} fill="#6b7280" />
                  {/* Left foot */}
                  <Ellipse cx={80} cy={388} rx={14} ry={8} fill="#6b7280" />
                  {/* Right foot */}
                  <Ellipse cx={120} cy={388} rx={14} ry={8} fill="#6b7280" />
                </G>

                {/* ── Tappable pain regions ── */}
                {BODY_PARTS.map((part) => {
                  const data = areaMap[part.key];
                  const fill = painColor(data?.latest_pain_level ?? null);
                  const isSelected = selected?.key === part.key && modalVisible;

                  return (
                    <G key={part.key} onPress={() => handlePartPress(part)}>
                      <Ellipse
                        cx={part.cx}
                        cy={part.cy}
                        rx={part.rx}
                        ry={part.ry}
                        fill={fill}
                        opacity={0.85}
                        stroke={isSelected ? '#2563eb' : '#ffffff'}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                      />
                    </G>
                  );
                })}
              </Svg>
            </View>

            {/* Body part list summary */}
            <Text style={styles.sectionTitle}>All Regions</Text>
            {BODY_PARTS.map((part) => {
              const data = areaMap[part.key];
              const level = data?.latest_pain_level ?? null;
              const color = painColor(level);
              return (
                <TouchableOpacity
                  key={part.key}
                  style={styles.regionRow}
                  onPress={() => handlePartPress(part)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.regionDot, { backgroundColor: color }]} />
                  <View style={styles.regionInfo}>
                    <Text style={styles.regionLabel}>{part.label}</Text>
                    <Text style={styles.regionStatus}>{painLabel(level)}</Text>
                  </View>
                  {data && (
                    <Text style={styles.regionDate}>{formatDate(data.latest_date)}</Text>
                  )}
                  <Text style={styles.regionArrow}>›</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {selected && (
              <>
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalDot,
                      { backgroundColor: painColor(selectedData?.latest_pain_level ?? null) },
                    ]}
                  />
                  <Text style={styles.modalTitle}>{selected.label}</Text>
                </View>

                {selectedData ? (
                  <>
                    <Text style={styles.modalCurrentLabel}>Most recent</Text>
                    <View style={styles.modalCurrentRow}>
                      <Text style={styles.modalCurrentPain}>
                        {painLabel(selectedData.latest_pain_level)}
                      </Text>
                      <Text style={styles.modalCurrentDate}>
                        {formatDate(selectedData.latest_date)}
                      </Text>
                    </View>

                    {selectedData.history.length > 1 && (
                      <>
                        <Text style={styles.modalHistoryTitle}>History</Text>
                        {selectedData.history.slice(0, 6).map((h) => (
                          <View key={h.id} style={styles.modalHistoryRow}>
                            <View
                              style={[
                                styles.modalHistoryDot,
                                { backgroundColor: painColor(h.pain_level) },
                              ]}
                            />
                            <Text style={styles.modalHistoryText}>
                              {painLabel(h.pain_level)}
                            </Text>
                            <Text style={styles.modalHistoryDate}>{formatDate(h.date)}</Text>
                          </View>
                        ))}
                      </>
                    )}
                  </>
                ) : (
                  <View style={styles.modalEmpty}>
                    <Text style={styles.modalEmptyText}>
                      No assessments recorded for this area yet.
                    </Text>
                    <TouchableOpacity
                      style={styles.modalStartButton}
                      onPress={() => {
                        setModalVisible(false);
                        router.push('/intake/body-area');
                      }}
                    >
                      <Text style={styles.modalStartButtonText}>Start Assessment</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: { marginBottom: 6 },
  backBtnText: { color: '#2563eb', fontSize: 15, fontWeight: '500' },
  heading: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 2 },
  subheading: { fontSize: 13, color: '#6b7280' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText: { fontSize: 15, color: '#6b7280' },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: { color: '#991b1b', fontSize: 14 },

  // Legend
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 12, color: '#374151', fontWeight: '500' },

  // SVG
  svgContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 24,
    elevation: 2,
    alignItems: 'center',
  },
  svg: { width: '70%', maxWidth: 280 },

  // Region list
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    gap: 12,
  },
  regionDot: { width: 14, height: 14, borderRadius: 7, flexShrink: 0 },
  regionInfo: { flex: 1 },
  regionLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  regionStatus: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  regionDate: { fontSize: 11, color: '#9ca3af' },
  regionArrow: { fontSize: 18, color: '#9ca3af', marginLeft: 4 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
    minHeight: 280,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  modalDot: { width: 18, height: 18, borderRadius: 9 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  modalCurrentLabel: { fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  modalCurrentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalCurrentPain: { fontSize: 16, fontWeight: '600', color: '#111827' },
  modalCurrentDate: { fontSize: 13, color: '#6b7280' },
  modalHistoryTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  modalHistoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  modalHistoryDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  modalHistoryText: { flex: 1, fontSize: 14, color: '#374151' },
  modalHistoryDate: { fontSize: 12, color: '#9ca3af' },
  modalEmpty: { alignItems: 'center', paddingVertical: 20, gap: 16 },
  modalEmptyText: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  modalStartButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  modalStartButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
});
