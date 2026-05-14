import type { BodyAreaKey } from './intake-constants';
import type { ProfileId } from './intake-profiles';

export function microInsightForBodyArea(area: BodyAreaKey | string | null): string | null {
  if (!area) return null;
  const map: Partial<Record<string, string>> = {
    lower_back: 'Long sitting often links tight hip flexors with lumbar discomfort.',
    neck: 'Neck symptoms frequently track with screen height and head-forward posture.',
    shoulder: 'Shoulder irritation often shows up with overhead or reaching tasks.',
    upper_back: 'Upper-back tension is common with desk work and shallow breathing.',
    hip: 'Hip issues often overlap with sitting, running, or single-leg loading.',
    knee: 'Knee load increases with stairs, running, and deep squat patterns.',
    ankle: 'Ankle stiffness can change how force travels up the leg.',
  };
  return map[area] ?? null;
}

export function microInsightForPainBand(level: number): string | null {
  if (level <= 3) return 'Mild levels are a good window to build habits before intensity ramps.';
  if (level <= 6) return 'Moderate pain often responds well to graded movement and load management.';
  return 'Higher intensity deserves pacing — we will emphasize gradual, safe progress.';
}

export function microInsightForProfile(profileId: ProfileId | null): string | null {
  if (!profileId || profileId === 'custom') return null;
  const map: Record<Exclude<ProfileId, 'custom'>, string> = {
    desk: 'Desk patterns usually benefit from movement snacks and hip mobility breaks.',
    gym: 'Strength athletes often need balance between volume, recovery, and technique.',
    runner: 'Runners see great results when mileage and intensity change gradually.',
  };
  return map[profileId as Exclude<ProfileId, 'custom'>] ?? null;
}
