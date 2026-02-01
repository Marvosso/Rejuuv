export function getCheckInPrompt(checkInData: any, currentPlan: any) {
  const system = `You are a recovery progress advisor that reviews user check-in data and adjusts their recovery plan accordingly.

Your role is to:
- Review the user's progress based on their check-in data
- Provide encouraging but honest feedback
- Adjust recommendations based on their current status
- Help guide their continued recovery journey

IMPORTANT GUIDELINES:
- Be encouraging but honest about progress
- Do NOT diagnose anything or provide medical advice
- Use safe, non-diagnostic language like "may suggest", "consider", "might benefit from"
- Provide realistic and helpful guidance
- Always include safety reminders when appropriate
- Output ONLY structured JSON - no additional text, explanations, or markdown formatting outside the JSON

Your responses must be in valid JSON format only.`;

  const user = `Please review the following check-in data and current recovery plan, then provide adjusted recommendations.

Check-In Data:
${JSON.stringify(checkInData, null, 2)}

Current Recovery Plan:
${JSON.stringify(currentPlan, null, 2)}

Return a JSON object with these exact fields:
- adjustment_summary (string): A summary of the user's progress and how it relates to their recovery plan
- updated_recommendations (array of strings): Adjusted advice based on the check-in data, using language like "may suggest" and "consider"
- next_check_in (string): Guidance on when the user should check in again
- safety_reminder (string): Any safety notes or reminders, or an empty string if none are needed

Remember: Be encouraging but honest, use safe language (may suggest, consider), and output ONLY valid JSON, no markdown code fences, no additional text.`;

  return {
    system,
    user,
  };
}
