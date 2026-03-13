/**
 * Static starter plan returned to free users when they have already used their one AI plan.
 * Generic lower-back focused; can be shown for any body area as a simple maintenance template.
 */
export const STARTER_PLAN = {
  focus_areas: ['Gentle movement', 'Posture awareness', 'Progressive activity'],
  recovery_plan: {
    phase_1_days_1_to_7: {
      goal: 'Reduce irritation and support early recovery with gentle movement.',
      activities: [
        'Short walks (5–10 min) 2x daily',
        'Gentle cat-cow or pelvic tilts if comfortable',
        'Avoid prolonged sitting; break every 30 min',
      ],
      avoid: ['Heavy lifting', 'Twisting under load', 'High-impact exercise'],
    },
    phase_2_days_8_to_21: {
      goal: 'Gradually increase mobility and strength with low-load activities.',
      activities: [
        'Walking 15–20 min daily',
        'Basic core and hip mobility exercises',
        'Light stretching for hips and hamstrings',
      ],
      avoid: ['Sitting for long periods without breaks', 'Heavy lifting', 'Sudden movements'],
    },
    phase_3_week_4_and_beyond: {
      goal: 'Maintain gains and build resilience with consistent habits.',
      activities: [
        'Regular walking and light strength work',
        'Daily mobility and stretching routine',
        'Progressive return to preferred activities as tolerated',
      ],
      avoid: ['Returning to high load too soon', 'Ignoring pain that increases with activity'],
    },
  },
  daily_habits: [
    'Move regularly; avoid long static postures.',
    'Stay hydrated.',
    'Prioritize sleep and recovery.',
  ],
  red_flags: [
    'Severe or worsening pain',
    'Numbness, tingling, or weakness in legs',
    'Loss of bladder or bowel control',
    'Pain after trauma or fall',
  ],
};
