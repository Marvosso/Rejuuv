import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  model: string = 'claude-sonnet-4-5-20250929'
) {
  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    return response;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

export function extractJSON(response: any): any {
  try {
    // Extract text content from the response
    // The response from messages.create() has a content array
    const content = response.content || [];
    const textContent = content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    if (!textContent) {
      console.error('No text content found in Claude response. Response:', JSON.stringify(response, null, 2));
      throw new Error('No text content found in Claude response');
    }

    // Strip markdown code fences (```json, ```, or just ```)
    let cleanedText = textContent.trim();
    
    // Remove opening code fence (```json or ```)
    cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, '');
    
    // Remove closing code fence (```)
    cleanedText = cleanedText.replace(/\s*```$/i, '');
    
    // Remove any remaining backticks
    cleanedText = cleanedText.replace(/^`+|`+$/g, '');

    // Parse as JSON
    return JSON.parse(cleanedText.trim());
  } catch (error) {
    console.error('Error extracting JSON from Claude response:', error);
    console.error('Raw response:', JSON.stringify(response, null, 2));
    throw error;
  }
}
