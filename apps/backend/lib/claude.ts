import Anthropic from '@anthropic-ai/sdk';
import { anthropicMaxRetries, anthropicTimeoutMs } from './env';
import { withRetry } from './retry';
import { log } from './logger';
import { getAnthropicCallParams, type ClaudeTask } from './ai-config';

export type { ClaudeTask } from './ai-config';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function callClaudeForTask(
  task: ClaudeTask,
  systemPrompt: string,
  userMessage: string
): Promise<unknown> {
  const { model, maxTokens } = getAnthropicCallParams(task);
  const timeoutMs = anthropicTimeoutMs();
  const attempts = 1 + anthropicMaxRetries();

  return withRetry(
    'anthropic.messages.create',
    async () => {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), timeoutMs);
      try {
        const response = await anthropic.messages.create(
          {
            model,
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: userMessage,
              },
            ],
          },
          { signal: ac.signal }
        );
        return response;
      } catch (error) {
        const aborted = error instanceof Error && error.name === 'AbortError';
        if (aborted) {
          log.error('claude', 'Anthropic request timed out', { model, task, timeoutMs });
          throw new Error(`Anthropic request timed out after ${timeoutMs}ms`);
        }
        log.error('claude', 'Anthropic request failed', {
          model,
          task,
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      } finally {
        clearTimeout(timer);
      }
    },
    { maxAttempts: attempts, baseDelayMs: 900 }
  );
}

function extractTextBlocks(response: unknown): string {
  const content = (response as { content?: unknown[] })?.content || [];
  return (content as { type?: string; text?: string }[])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

function stripCodeFences(s: string): string {
  let t = s.trim();
  t = t.replace(/^```(?:json)?\s*/i, '');
  t = t.replace(/\s*```$/i, '');
  t = t.replace(/^`+|`+$/g, '');
  return t.trim();
}

/** Best-effort: first balanced `{ ... }` substring. */
function tryParseEmbeddedObject(text: string): unknown | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export type TryExtractJSONResult =
  | { ok: true; data: unknown }
  | { ok: false; reason: 'no_text' | 'parse_error'; rawText: string; cause?: unknown };

export function tryExtractJSON(response: unknown): TryExtractJSONResult {
  const textContent = extractTextBlocks(response);
  if (!textContent) {
    log.error('claude', 'No text content in Claude response');
    return { ok: false, reason: 'no_text', rawText: '' };
  }

  const stripped = stripCodeFences(textContent);
  try {
    return { ok: true, data: JSON.parse(stripped) };
  } catch (first) {
    const salvage =
      tryParseEmbeddedObject(textContent) ?? tryParseEmbeddedObject(stripped);
    if (salvage != null) {
      log.warn('claude', 'extractJSON recovered via embedded object parse');
      return { ok: true, data: salvage };
    }
    log.error('claude', 'extractJSON failed', {
      message: first instanceof Error ? first.message : String(first),
    });
    return {
      ok: false,
      reason: 'parse_error',
      rawText: textContent,
      cause: first,
    };
  }
}

/** @throws if model output is not JSON — prefer {@link tryExtractJSON} + repair pipeline for production paths. */
export function extractJSON(response: unknown): any {
  const r = tryExtractJSON(response);
  if (!r.ok) {
    if (r.reason === 'no_text') {
      throw new Error('No text content found in Claude response');
    }
    throw r.cause instanceof Error ? r.cause : new Error('Failed to parse JSON from Claude response');
  }
  return r.data;
}
