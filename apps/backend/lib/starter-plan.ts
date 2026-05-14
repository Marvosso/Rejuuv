/**
 * Static starter plan returned to free users when they have already used their one AI plan.
 * Shape matches the structured recovery-plan prompt (exercises with coaching fields).
 */
export const STARTER_PLAN = {
  focus_areas: [
    'Gentle daily movement',
    'Kind habits that support your body',
    'Building confidence little by little',
  ],
  recovery_plan: {
    phase_1_days_1_to_7: {
      goal: 'Ease in with movement that feels doable. Small steps count more than big pushes.',
      exercises: [
        {
          name: 'Easy walking',
          sets_reps: '5–10 minutes, 2–4 times today',
          why_this_helps: 'Light walking keeps circulation going and reminds your body that moving can still feel okay.',
          form_tips: [
            'Walk at a pace where you could chat without gasping.',
            'Flat routes beat hills for now.',
            'If anything sharpens, shorten the walk — you can try again later.',
          ],
        },
        {
          name: 'Pelvic tilts or gentle cat-cow',
          sets_reps: '6–8 slow cycles, 2 rounds',
          why_this_helps: 'Small spine and pelvis motions can loosen stiffness without asking much from sore tissues.',
          form_tips: [
            'Move in a range that feels mild, not forced.',
            'Let your breath lead: exhale on the gentle effort, inhale as you return.',
            'Stop if you feel pinching or pain that spreads.',
          ],
        },
        {
          name: 'Movement snacks from sitting',
          sets_reps: '1–2 minutes every 30–45 minutes',
          why_this_helps: 'Short breaks interrupt long stillness, which often helps cranky backs and hips.',
          form_tips: [
            'Stand, take a few steps, or do a gentle reach — keep it simple.',
            'Set a quiet timer so you do not have to remember.',
          ],
        },
      ],
      avoid: ['Heavy lifting or twisting while holding weight', 'All-out workouts until things feel steadier'],
    },
    phase_2_days_8_to_21: {
      goal: 'Gradually add a little more time and variety as comfort allows.',
      exercises: [
        {
          name: 'Brisk walking',
          sets_reps: '15–20 minutes most days',
          why_this_helps: 'A bit more walking builds stamina and keeps joints and muscles used to moving.',
          form_tips: [
            'Add time slowly — a few extra minutes beats jumping straight to an hour.',
            'Good shoes and soft surfaces help if feet or knees are picky.',
          ],
        },
        {
          name: 'Hip and core mobility',
          sets_reps: '8–10 minutes, once daily',
          why_this_helps: 'Hips and trunk work as a team; gentle mobility can take pressure off a sensitive back.',
          form_tips: [
            'Pick two or three moves you actually enjoy — consistency beats perfection.',
            'No hero stretches; mild pull is enough.',
          ],
        },
        {
          name: 'Light stretching',
          sets_reps: '5–8 minutes after walking or before bed',
          why_this_helps: 'Easy stretching can make the rest of your day feel a little less tight.',
          form_tips: [
            'Hold positions comfortably, not competitively.',
            'Breathe slowly; if you have to hold your breath, ease off.',
          ],
        },
      ],
      avoid: [
        'Sitting for hours without a break',
        'Sudden twists or jerks under load',
        'Ignoring pain that ramps up during an activity',
      ],
    },
    phase_3_week_4_and_beyond: {
      goal: 'Keep what is working and nudge toward the activities you care about.',
      exercises: [
        {
          name: 'Walking plus light strength',
          sets_reps: 'Walk most days; 2 short strength sessions weekly',
          why_this_helps: 'A touch of strength supports joints and makes everyday tasks feel easier.',
          form_tips: [
            'Use light resistance you could repeat with good form.',
            'Rest a day between strength days if you are sore.',
          ],
        },
        {
          name: 'Daily mobility routine',
          sets_reps: '8–12 minutes',
          why_this_helps: 'A short routine you can repeat keeps range of motion from quietly shrinking.',
          form_tips: [
            'Same time each day helps it stick — morning or evening both work.',
            'Swap moves that feel irritating for ones that feel neutral.',
          ],
        },
        {
          name: 'Return to favorite activities',
          sets_reps: 'As tolerated, add time or intensity weekly',
          why_this_helps: 'Doing what you love — in smaller doses at first — builds confidence and joy, not just fitness.',
          form_tips: [
            'Start at half the duration or intensity you used to consider “easy.”',
            'If symptoms flare, dial back for a few days; that is data, not failure.',
          ],
        },
      ],
      avoid: ['Jumping from zero back to full intensity overnight', 'Pushing through sharp or spreading pain'],
    },
  },
  daily_habits: [
    'Sip water through the day — boring, but your tissues like it.',
    'Aim for a wind-down routine so sleep gets a fair shot.',
    'Notice one thing that went okay with your body today, even if it is small.',
  ],
  red_flags: [
    'New numbness, tingling, or weakness in an arm or leg',
    'Pain that is sharply worse or different from your usual pattern',
    'Fever, feeling very unwell, or symptoms after a fall or accident',
    'Any loss of bladder or bowel control — seek urgent care',
  ],
};
