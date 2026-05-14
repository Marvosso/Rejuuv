export type ProfileId = 'desk' | 'gym' | 'runner' | 'custom';

export type ProfileMerge = {
  trigger: string[];
  movement_limitations: string[];
};

export type IntakeProfileOption = {
  id: ProfileId;
  title: string;
  helper: string;
  emoji: string;
  merge: ProfileMerge;
};

/** Optional shortcuts — merge adds suggested triggers & limitations (user can edit on step 4). */
export const INTAKE_PROFILES: IntakeProfileOption[] = [
  {
    id: 'desk',
    title: 'Desk Worker (6+ hrs sitting)',
    helper: 'Pre-fills sitting-related triggers and common desk-posture limitations. Your body area and pain level stay as you chose.',
    emoji: '💺',
    merge: {
      trigger: ['Sitting long periods', 'Screen time / forward head'],
      movement_limitations: [
        'Prolonged static posture',
        'Hip flexors often tighten with long sitting',
      ],
    },
  },
  {
    id: 'gym',
    title: 'Gym Strength Trainer',
    helper: 'Adds lifting and post-workout patterns we often see with strength training. Does not change your pain score.',
    emoji: '🏋️',
    merge: {
      trigger: ['After exercise', 'Lifting or carrying'],
      movement_limitations: ['Heavy compound lifts', 'Overhead pressing'],
    },
  },
  {
    id: 'runner',
    title: 'Runner / Cardio',
    helper: 'Adds running and repetitive impact triggers. Fine-tune on the next step.',
    emoji: '🏃',
    merge: {
      trigger: ['Running or jumping', 'After exercise'],
      movement_limitations: ['High-mileage weeks', 'Hard surfaces'],
    },
  },
  {
    id: 'custom',
    title: 'Custom / Start from scratch',
    helper: 'Clears profile suggestions only. Your own selections on the last step are kept.',
    emoji: '✨',
    merge: { trigger: [], movement_limitations: [] },
  },
];

export function getProfileById(id: ProfileId): IntakeProfileOption {
  return INTAKE_PROFILES.find((p) => p.id === id) ?? INTAKE_PROFILES[3];
}
