import { Colors } from './theme';

export const BODY_AREAS = [
  { key: 'neck', label: 'Neck', emoji: '🦴', description: 'Cervical spine & neck', color: Colors.primary },
  { key: 'shoulder', label: 'Shoulder', emoji: '💪', description: 'Shoulder joint & rotator cuff', color: '#8B5CF6' },
  { key: 'upper_back', label: 'Upper Back', emoji: '🔼', description: 'Thoracic spine & upper back', color: '#F59E0B' },
  { key: 'lower_back', label: 'Lower Back', emoji: '🔧', description: 'Lumbar spine & lower back', color: Colors.secondary },
  { key: 'hip', label: 'Hip', emoji: '🦷', description: 'Hip joint & surrounding area', color: '#EF4444' },
  { key: 'knee', label: 'Knee', emoji: '🦵', description: 'Knee joint & surrounding area', color: Colors.success },
  { key: 'ankle', label: 'Ankle', emoji: '🦶', description: 'Ankle joint & lower leg', color: '#06B6D4' },
] as const;

export type BodyAreaKey = (typeof BODY_AREAS)[number]['key'];

export const SILHOUETTE_PARTS: {
  key: string;
  bodyAreaKey: BodyAreaKey;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}[] = [
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

export const BODY_AREA_COLORS: Record<string, string> = {
  neck: Colors.primary,
  shoulder: '#8B5CF6',
  upper_back: '#F59E0B',
  lower_back: Colors.secondary,
  hip: '#EF4444',
  knee: Colors.success,
  ankle: '#06B6D4',
};

export function getBodyAreaDisplayName(area: string): string {
  const names: Record<string, string> = {
    neck: 'Neck',
    shoulder: 'Shoulder',
    upper_back: 'Upper Back',
    lower_back: 'Lower Back',
    hip: 'Hip',
    knee: 'Knee',
    ankle: 'Ankle',
  };
  return names[area] || area.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
