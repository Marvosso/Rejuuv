import { STARTER_PLAN } from './starter-plan';
import { recoveryPlanOutputSchema, type RecoveryPlanValidated } from './ai-schemas';

/** When safety JSON cannot be parsed or validated — conservative path (same UX as REFER). */
export const SAFETY_SCREENING_FALLBACK = {
  status: 'REFER' as const,
  reasoning_internal: 'automated_screen_unavailable',
  user_message: null as string | null,
};

export const ANALYSIS_FALLBACK = {
  summary:
    'We could not finish generating your personalized summary. Here is general guidance you can still use while you try again.',
  possible_contributors: [
    'Day-to-day posture and positions',
    'Recent changes in activity or load',
    'Sleep and stress affecting how movement feels',
  ],
  education:
    'Movement recovery is often influenced by gradual, consistent habits rather than big pushes. Many people feel better when they ease in, notice how their body responds, and adjust pace based on comfort — not pain as a test of progress. This information is educational only and not a substitute for in-person care.',
  safety_note:
    'If symptoms are severe, worsening quickly, or include numbness, weakness, fever, or major trauma, seek urgent in-person medical care. Otherwise, consider checking in with a qualified clinician for guidance tailored to you.',
};

export function recoveryPlanSchemaFallback(): RecoveryPlanValidated {
  const raw = JSON.parse(JSON.stringify(STARTER_PLAN)) as unknown;
  const p = recoveryPlanOutputSchema.safeParse(raw);
  if (!p.success) {
    throw new Error('STARTER_PLAN must satisfy recoveryPlanOutputSchema');
  }
  return p.data;
}

export const CHECK_IN_ADJUSTMENTS_FALLBACK = {
  adjustment_summary:
    'We saved your check-in, but could not generate detailed coaching text this time. Your entries still count toward your plan.',
  updated_recommendations: [
    'Keep movements gentle and within a comfortable range today.',
    'If pain spikes sharply or spreads in a new way, ease back and consider professional guidance.',
  ],
  next_check_in: 'Try another check-in in a day or two, or sooner if your symptoms change noticeably.',
  safety_reminder:
    'Stop any activity that causes sharp or spreading pain, numbness, or weakness, and seek care if those symptoms appear.',
};
