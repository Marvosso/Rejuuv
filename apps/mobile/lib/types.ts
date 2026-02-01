export interface BodyArea {
  id: string;
  label: string;
  common_triggers: string[];
  common_pain_types: string[];
}

export interface PainIntake {
  body_area: string;
  specific_location: string;
  pain_type: string[];
  duration: string;
  trigger: string[];
  pain_level: number;
  movement_limitations: string[];
}

export interface Analysis {
  summary: string;
  possible_contributors: string[];
  education: string;
  safety_note: string;
}

export interface SafetyCheck {
  red_flag_detected: boolean;
  message: string;
  recommended_action: string;
}

export interface RecoveryPhase {
  goal: string;
  activities: string[];
  avoid: string[];
}

export interface RecoveryPlan {
  focus_areas: string[];
  recovery_plan: {
    phase_1_days_1_to_7: RecoveryPhase;
    phase_2_days_8_to_21: RecoveryPhase;
    phase_3_week_4_and_beyond: RecoveryPhase;
  };
  daily_habits: string[];
  red_flags: string[];
}

export interface CheckIn {
  pain_change: string;
  pain_level: number;
  difficulty: string;
  completed_activities: string[];
  notes: string;
}

export interface CheckInResponse {
  adjustment_summary: string;
  updated_recommendations: string[];
  next_check_in: string;
  safety_reminder: string;
}
