import { execFile } from "node:child_process";
import type { ZodType } from "zod";

// Live LLM provider: shells out to the locally authenticated `claude` CLI
// (Claude Code) in headless mode. This reuses the user's existing Claude
// subscription — no API key, no separate billing — and works wherever the CLI
// is installed and logged in. CI and offline demos leave LLM_PROVIDER unset and
// fall back to the deterministic rule-based agents behind the same schemas.

export const CLAUDE_CLI_MODEL = "claude-cli (Claude Code)";

export function llmEnabled(): boolean {
  return process.env.LLM_PROVIDER === "claude-cli";
}

interface ClaudeOptions {
  model?: string;
  timeoutMs?: number;
}

function runClaude(prompt: string, opts: ClaudeOptions = {}): Promise<string> {
  const args = ["-p", prompt];
  if (opts.model) args.push("--model", opts.model);
  return new Promise((resolve, reject) => {
    const child = execFile(
      "claude",
      args,
      { timeout: opts.timeoutMs ?? 120_000, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `claude CLI failed: ${error.message}${stderr ? ` — ${stderr.trim()}` : ""}`,
            ),
          );
          return;
        }
        resolve(stdout.trim());
      },
    );
    // Close stdin so the CLI does not wait for piped input.
    child.stdin?.end();
  });
}

// Pull the first JSON object or array out of a model response, tolerating
// stray prose or ```json fences.
function extractJson(raw: string): unknown {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.search(/[[{]/);
  if (start === -1) throw new Error(`No JSON found in model output: ${raw.slice(0, 200)}`);
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  const end = text.lastIndexOf(close);
  if (end <= start) throw new Error(`Unbalanced JSON in model output: ${raw.slice(0, 200)}`);
  return JSON.parse(text.slice(start, end + 1));
}

const JSON_ONLY_REMINDER =
  "\n\nReturn ONLY valid JSON matching the requested shape. No prose, no markdown fences.";

// Run a prompt and validate the JSON response against a zod schema, retrying
// once with a stricter reminder before giving up.
export async function completeJson<T>(
  prompt: string,
  schema: ZodType<T>,
  opts: ClaudeOptions = {},
): Promise<T> {
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await runClaude(
      attempt === 0 ? prompt : prompt + JSON_ONLY_REMINDER,
      opts,
    );
    try {
      const parsed = schema.safeParse(extractJson(raw));
      if (parsed.success) return parsed.data;
      lastError = parsed.error.message;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(`claude CLI returned no schema-valid JSON: ${lastError}`);
}
