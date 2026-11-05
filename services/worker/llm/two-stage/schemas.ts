/**
 * Output contracts of the map and reduce calls. Parsing is lenient at the item
 * level: one malformed claim or strength is dropped, not the whole answer.
 */
import { z } from "zod";

export const CLAIM_KINDS = ["responsibility", "pattern", "notable", "risk"] as const;
export type ClaimKind = (typeof CLAIM_KINDS)[number];

const lineNumber = z.coerce.number().int().positive();

export const rawClaimSchema = z.object({
  kind: z.enum(CLAIM_KINDS),
  text: z.string().trim().min(8).max(600),
  file: z.string().trim().min(1),
  startLine: lineNumber,
  endLine: lineNumber,
  symbol: z.string().trim().min(1).max(160),
});
export type RawClaim = z.infer<typeof rawClaimSchema>;

export const mapOutputSchema = z.object({
  summary: z.string().trim().max(1200).catch(""),
  claims: z.array(z.unknown()).catch([]),
});

export function parseMapOutput(value: unknown) {
  const parsed = mapOutputSchema.safeParse(value);
  if (!parsed.success) return null;

  const claims: RawClaim[] = [];
  let invalid = 0;
  for (const item of parsed.data.claims) {
    const claim = rawClaimSchema.safeParse(item);
    if (claim.success) claims.push(claim.data);
    else invalid++;
  }
  return { summary: parsed.data.summary, claims, invalid };
}

const checkResultSchema = z.object({
  id: z.string().trim(),
  supported: z.boolean(),
});

export const checkOutputSchema = z.object({ results: z.array(z.unknown()).catch([]) });

/** id -> supported, for the answers that parse. */
export function parseCheckOutput(value: unknown) {
  const parsed = checkOutputSchema.safeParse(value);
  if (!parsed.success) return null;
  const verdicts = new Map<string, boolean>();
  for (const item of parsed.data.results) {
    const result = checkResultSchema.safeParse(item);
    if (result.success) verdicts.set(result.data.id.toLowerCase(), result.data.supported);
  }
  return verdicts;
}

const refs = z.array(z.string().trim()).catch([]);

const itemSchema = z.object({
  name: z.string().trim().min(2).max(200),
  explanation: z.string().trim().min(8).max(1500),
  refs,
});
export type ReduceItem = z.infer<typeof itemSchema>;

const scoreSchema = z
  .object({
    score: z.coerce.number().int().min(1).max(5),
    rationale: z.string().trim().min(4).max(800),
    refs,
  })
  .nullable()
  .catch(null);

export const reduceOutputSchema = z.object({
  summary: z.object({
    title: z.string().trim().max(200).catch(""),
    paragraphs: z.array(z.string().trim().min(20)).min(1).max(4),
  }),
  architecture: z
    .object({ explanation: z.string().trim().catch(""), refs })
    .catch({ explanation: "", refs: [] }),
  strengths: z.array(z.unknown()).catch([]),
  suggestions: z.array(z.unknown()).catch([]),
  scores: z
    .object({ architecture: scoreSchema, security: scoreSchema })
    .catch({ architecture: null, security: null }),
});

export function parseReduceOutput(value: unknown) {
  const parsed = reduceOutputSchema.safeParse(value);
  if (!parsed.success) return null;

  const items = (list: unknown[]) =>
    list.flatMap((item) => {
      const result = itemSchema.safeParse(item);
      return result.success ? [result.data] : [];
    });

  return {
    ...parsed.data,
    strengths: items(parsed.data.strengths),
    suggestions: items(parsed.data.suggestions),
  };
}
export type ReduceOutput = NonNullable<ReturnType<typeof parseReduceOutput>>;
