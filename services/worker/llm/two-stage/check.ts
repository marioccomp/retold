/**
 * Second look at claims. validate.ts proves *where* a claim points (the symbol
 * is in the cited lines), not that the claim is *true*: in the eval, the map
 * flagged "password stored before hashing" on code that calls
 * generate_password_hash. One batched call shows only the cited lines and asks
 * whether they support each claim; refuted claims are dropped.
 */
import type { LlmMessage } from "../provider.js";
import { estimateTokens } from "../budget.js";
import { SYSTEM_PROMPT } from "./prompts.js";
import type { SourceExcerpt } from "./units.js";
import type { VerifiedClaim } from "./validate.js";

/** Kinds that reach the review as praise or criticism, most damaging when wrong first. */
const CHECK_PRIORITY: Record<VerifiedClaim["kind"], number> = {
  risk: 0,
  notable: 1,
  pattern: 2,
  responsibility: 3,
};

const CONTEXT_LINES = 3;
const MAX_SNIPPET_LINES = 40;

export function claimSnippet(claim: VerifiedClaim, lines: string[]) {
  const from = Math.max(1, claim.startLine - CONTEXT_LINES);
  const to = Math.min(lines.length, claim.endLine + CONTEXT_LINES, from + MAX_SNIPPET_LINES - 1);
  const body: string[] = [];
  for (let n = from; n <= to; n++) {
    const text = lines[n - 1];
    if (text.trim() !== "") body.push(`${n}| ${text.length > 220 ? `${text.slice(0, 220)}…` : text}`);
  }
  return body.join("\n");
}

function renderClaim(claim: VerifiedClaim, lines: string[]) {
  return `${claim.id} [${claim.kind}] ${claim.text}\n--- ${claim.file}\n${claimSnippet(claim, lines)}`;
}

export function buildCheckMessages(rendered: string[]): LlmMessage[] {
  const user = `Each claim below was made about the code shown under it. For each one, decide whether the shown lines clearly support the claim.
Be strict: answer false when the code contradicts the claim, when it depends on code not shown, or when it overstates what the lines do.

${rendered.join("\n\n")}

JSON: {"results":[{"id":"c1","supported":true}]}`;
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: user },
  ];
}

/**
 * Picks the claims to check within `inputTokenCap` (riskiest kinds first) and
 * returns the messages plus the ids included.
 */
export function planClaimCheck(
  claims: VerifiedClaim[],
  filesByPath: Map<string, SourceExcerpt>,
  inputTokenCap: number
) {
  const overhead = estimateTokens(buildCheckMessages([]).map((m) => m.content).join("\n")) + 20;
  const ordered = [...claims]
    .filter((c) => c.kind !== "responsibility")
    .sort((a, b) => CHECK_PRIORITY[a.kind] - CHECK_PRIORITY[b.kind]);

  const rendered: string[] = [];
  const ids: string[] = [];
  let tokens = overhead;
  for (const claim of ordered) {
    const file = filesByPath.get(claim.file);
    if (!file) continue;
    const text = renderClaim(claim, file.lines);
    const cost = estimateTokens(text) + 2;
    if (tokens + cost > inputTokenCap) continue;
    rendered.push(text);
    ids.push(claim.id);
    tokens += cost;
  }

  return { ids, messages: ids.length > 0 ? buildCheckMessages(rendered) : null };
}

/**
 * Applies the verdicts: refuted claims go; risks that could not be checked go
 * too (a wrong criticism costs more than a missing one); other unchecked
 * claims stay, since their location was already verified.
 */
export function applyCheckVerdicts(
  claims: VerifiedClaim[],
  checkedIds: string[],
  verdicts: Map<string, boolean>
) {
  const checked = new Set(checkedIds);
  const kept: VerifiedClaim[] = [];
  let refuted = 0;
  let uncheckedRisks = 0;

  for (const claim of claims) {
    const verdict = checked.has(claim.id) ? verdicts.get(claim.id) : undefined;
    if (verdict === false) {
      refuted++;
      continue;
    }
    if (verdict === undefined && claim.kind === "risk") {
      uncheckedRisks++;
      continue;
    }
    kept.push({ ...claim, checked: verdict === true });
  }

  return { kept, refuted, uncheckedRisks };
}
