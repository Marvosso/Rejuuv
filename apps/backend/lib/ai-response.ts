import type { ZodType } from 'zod';
import { callClaudeForTask, tryExtractJSON } from './claude';
import { aiJsonRepairEnabled } from './ai-config';
import type { ClaudeTask } from './ai-config';
import { log } from './logger';

const JSON_REPAIR_SYSTEM = `You are a JSON repair assistant for a health-and-movement app.

The user message contains assistant output that was supposed to be exactly one JSON object but may include markdown fences, extra prose, or minor syntax issues.

Rules:
- Output ONLY one valid JSON value (an object or array as appropriate). No markdown, no code fences, no commentary.
- Preserve the original structure and keys whenever possible. Do not invent clinical diagnoses.
- If the input is irreparably ambiguous, output the closest well-formed JSON object you can derive from the first complete JSON-like structure in the text.`;

function repairUserMessage(failedSnippet: string): string {
  return [
    'The following text failed strict JSON.parse. Return only valid JSON that captures the same content.',
    '',
    failedSnippet,
  ].join('\n');
}

export type AiJsonPipelineResult<T> = {
  value: T;
  /** Where the final value came from */
  source: 'model' | 'repair' | 'fallback';
  usedRepair: boolean;
  validationOk: boolean;
};

/**
 * 1) Parse model text as JSON (with existing fence stripping / salvage).
 * 2) If parse fails and repair is enabled: one repair call with a dedicated model, then parse again.
 * 3) Validate with Zod; on failure return `fallback` (no second repair for validation).
 */
export async function parseClaudeJsonWithRepairAndValidate<T>(opts: {
  response: unknown;
  schema: ZodType<T>;
  fallback: T;
  repairTask?: ClaudeTask;
  log: { route: string; kind: string };
}): Promise<AiJsonPipelineResult<T>> {
  const { response, schema, fallback, log: logCtx } = opts;
  const repairTask = opts.repairTask ?? 'json_repair';

  let usedRepair = false;
  let first = tryExtractJSON(response);

  if (!first.ok && aiJsonRepairEnabled()) {
    const failedBeforeRepair = first;
    const snippet =
      failedBeforeRepair.rawText.length > 25_000
        ? failedBeforeRepair.rawText.slice(0, 25_000)
        : failedBeforeRepair.rawText;
    if (snippet.length > 0) {
      usedRepair = true;
      try {
        const repairResp = await callClaudeForTask(
          repairTask,
          JSON_REPAIR_SYSTEM,
          repairUserMessage(snippet)
        );
        first = tryExtractJSON(repairResp);
      } catch (e) {
        log.warn('ai-response', 'json_repair_call_failed', {
          route: logCtx.route,
          kind: logCtx.kind,
          message: e instanceof Error ? e.message.slice(0, 200) : String(e),
        });
        first = {
          ok: false,
          reason: failedBeforeRepair.reason,
          rawText: failedBeforeRepair.rawText,
          cause: e,
        };
      }
    }
  }

  if (!first.ok) {
    log.warn('ai-response', 'json_parse_failed', {
      route: logCtx.route,
      kind: logCtx.kind,
      reason: first.reason,
      used_repair: usedRepair,
    });
    return { value: fallback, source: 'fallback', usedRepair, validationOk: false };
  }

  const parsed = schema.safeParse(first.data);
  if (!parsed.success) {
    log.warn('ai-response', 'json_schema_failed', {
      route: logCtx.route,
      kind: logCtx.kind,
      issues: parsed.error.issues.slice(0, 12).map((i) => i.path.join('.') || '(root)'),
      used_repair: usedRepair,
    });
    return { value: fallback, source: 'fallback', usedRepair, validationOk: false };
  }

  const source: 'model' | 'repair' = usedRepair ? 'repair' : 'model';
  return { value: parsed.data, source, usedRepair, validationOk: true };
}
