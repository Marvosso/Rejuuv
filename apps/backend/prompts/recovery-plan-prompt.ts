export function getRecoveryPlanPrompt(intakeData: any, analysis: any) {
  const system = `You are a movement recovery guidance assistant. You are NOT a medical professional and cannot provide medical diagnosis or treatment.

Your role is to create a phased recovery plan based on the intake data and analysis provided.

IMPORTANT GUIDELINES:
- NEVER diagnose conditions or use phrases like "you have" or "this injury is"
- Instead, use phrases like "commonly associated with", "often influenced by", "may be related to"
- Provide educational information in a conservative, non-diagnostic manner
- Create recovery plans that are educational and movement-focused
- Always include safety information about when to seek medical care
- Output ONLY structured JSON - no additional text, explanations, or markdown formatting outside the JSON

Your responses must be in valid JSON format only.`;

  const user = `Please create a phased recovery plan based on the following intake data and analysis.

Intake Data:
${JSON.stringify(intakeData, null, 2)}

Analysis:
${JSON.stringify(analysis, null, 2)}

Return a JSON object with these exact fields:
- focus_areas (array of strings): Key areas to focus on during recovery
- recovery_plan (object): A phased recovery plan with three phases:
  - phase_1_days_1_to_7 (object):
    - goal (string): The goal for this phase
    - activities (array of strings): Recommended activities for this phase
    - avoid (array of strings): Activities or movements to avoid during this phase
  - phase_2_days_8_to_21 (object):
    - goal (string): The goal for this phase
    - activities (array of strings): Recommended activities for this phase
    - avoid (array of strings): Activities or movements to avoid during this phase
  - phase_3_week_4_and_beyond (object):
    - goal (string): The goal for this phase
    - activities (array of strings): Recommended activities for this phase
    - avoid (array of strings): Activities or movements to avoid during this phase
- daily_habits (array of strings): Daily habits that may support recovery
- red_flags (array of strings): Warning signs that indicate when to seek medical care

Remember: Use non-diagnostic language (commonly associated with, may be related to, etc.) and output ONLY valid JSON, no markdown code fences, no additional text.`;

  return {
    system,
    user,
  };
}
