/**
 * Local Rejuuv form-check videos (from assets/videos).
 * Used when no remote video URL is configured — matches activity text to exercise_key.
 */

export type LocalVideoSource = number; // require() result for Video source

const LOCAL_VIDEOS: Record<string, LocalVideoSource> = {
  bridge: require('../assets/videos/bridge.mp4'),
  calf_stretch: require('../assets/videos/calf_stretch.mp4'),
  clamshells: require('../assets/videos/clamshells.mp4'),
  heel_slide: require('../assets/videos/heel_slide.mp4'),
  hip_flexor_stretch: require('../assets/videos/hip_flexor_stretch.mp4'),
  hip_mobility: require('../assets/videos/hip_mobility.mp4'),
  prone_press_ups: require('../assets/videos/prone_press_ups.mp4'),
  quad_stretch: require('../assets/videos/quad_stretch.mp4'),
  repeated_extension: require('../assets/videos/repeated_extension.mp4'),
  scapular_setting: require('../assets/videos/scapular_setting.mp4'),
  short_arc_quad: require('../assets/videos/short_arc_quad.mp4'),
  shoulder_rotation: require('../assets/videos/shoulder_rotation.mp4'),
  sleeper_stretch: require('../assets/videos/sleeper_stretch.mp4'),
  straight_leg_raise: require('../assets/videos/straight_leg_raise.mp4'),
};

export interface LocalVideoMatch {
  exercise_key: string;
  source: LocalVideoSource;
}

/**
 * Returns a local video for the given activity text if one exists.
 * Matches by normalizing activity text and checking for exercise_key phrase.
 */
export function getLocalVideoForActivity(activityText: string): LocalVideoMatch | undefined {
  const normalized = activityText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  for (const [key, source] of Object.entries(LOCAL_VIDEOS)) {
    const keyAsPhrase = key.replace(/_/g, ' ');
    if (
      normalized.includes(keyAsPhrase) ||
      keyAsPhrase.split(' ').every((w) => normalized.includes(w))
    ) {
      return { exercise_key: key, source };
    }
  }
  return undefined;
}

/** Default local video for Day 1 Win when no URL is set (e.g. hip mobility). */
export const DEFAULT_DAY1_VIDEO = require('../assets/videos/hip_mobility.mp4');
