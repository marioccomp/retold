/**
 * Deterministic verification of map claims. A claim survives only if the file
 * was actually sent, the cited lines exist, and the cited `symbol` appears in
 * them. When the symbol is elsewhere in the sent part of the file, the citation
 * is moved there ("reanchored"); when it is nowhere, the claim is dropped.
 */
import type { ClaimKind, RawClaim } from "./schemas.js";
import type { SourceExcerpt } from "./units.js";

export type VerifiedClaim = {
  id: string;
  unitId: string;
  module: string;
  kind: ClaimKind;
  text: string;
  file: string;
  startLine: number;
  endLine: number;
  symbol: string;
  status: "verified" | "reanchored";
  /** Confirmed by the second-look check (check.ts); false when not checked. */
  checked?: boolean;
};

export type RejectedClaim = { claim: RawClaim; reason: RejectionReason };

export type RejectionReason =
  | "file_not_sent"
  | "lines_out_of_range"
  | "weak_symbol"
  | "symbol_not_found"
  | "duplicate";

/** Longest citation kept; longer ranges are narrowed around the symbol. */
const MAX_RANGE_LINES = 60;
/** Lines kept after the symbol when a citation is reanchored or narrowed. */
const REANCHOR_SPAN = 15;

/** Words that appear everywhere and prove nothing about a claim. */
const WEAK_SYMBOLS = new Set(
  [
    "if", "else", "for", "while", "return", "function", "func", "fn", "def", "class",
    "const", "let", "var", "import", "export", "from", "async", "await", "public",
    "private", "static", "void", "new", "this", "self", "true", "false", "null",
    "none", "nil", "try", "catch", "except", "throw", "raise", "type", "interface",
    "struct", "impl", "pub", "use", "package", "module", "default", "string", "int",
  ].map((s) => s.toLowerCase())
);

export function normalizeClaimPath(file: string) {
  return file.trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

/** "foo()" -> "foo", "`Bar.baz`" -> "Bar.baz"; keeps code fragments otherwise. */
export function normalizeSymbol(symbol: string) {
  return symbol
    .trim()
    .replace(/^[`'"]+|[`'"]+$/g, "")
    .replace(/\(\s*\)$/, "")
    .trim();
}

function isWeakSymbol(symbol: string) {
  return symbol.length < 3 || WEAK_SYMBOLS.has(symbol.toLowerCase()) || !/[A-Za-z_]/.test(symbol);
}

/** 1-based line numbers (within 1..lastLine) whose text contains the symbol. */
function findSymbolLines(lines: string[], symbol: string, lastLine: number) {
  const found: number[] = [];
  for (let n = 1; n <= Math.min(lastLine, lines.length); n++) {
    if (lines[n - 1].includes(symbol)) found.push(n);
  }
  // Qualified names ("Queue.add"): accept the last segment when the full form is absent.
  if (found.length === 0 && symbol.includes(".")) {
    const last = symbol.split(".").pop() ?? "";
    if (!isWeakSymbol(last)) return findSymbolLines(lines, last, lastLine);
  }
  return found;
}

export function validateClaim(
  claim: RawClaim,
  files: Map<string, SourceExcerpt>
):
  | { ok: true; file: string; startLine: number; endLine: number; symbol: string; status: VerifiedClaim["status"] }
  | { ok: false; reason: RejectionReason } {
  const file = normalizeClaimPath(claim.file);
  const excerpt = files.get(file);
  if (!excerpt) return { ok: false, reason: "file_not_sent" };

  const symbol = normalizeSymbol(claim.symbol);
  if (isWeakSymbol(symbol)) return { ok: false, reason: "weak_symbol" };

  const lastLine = excerpt.lastSentLine;
  let start = Math.min(claim.startLine, claim.endLine);
  let end = Math.max(claim.startLine, claim.endLine);
  if (start > lastLine) return { ok: false, reason: "lines_out_of_range" };
  end = Math.min(end, lastLine);

  const occurrences = findSymbolLines(excerpt.lines, symbol, lastLine);
  if (occurrences.length === 0) return { ok: false, reason: "symbol_not_found" };

  const inside = occurrences.filter((n) => n >= start && n <= end);
  if (inside.length > 0) {
    if (end - start + 1 > MAX_RANGE_LINES) {
      start = inside[0];
      end = Math.min(lastLine, start + REANCHOR_SPAN);
    }
    return { ok: true, file, startLine: start, endLine: end, symbol, status: "verified" };
  }

  // The model cited the wrong lines of the right file: use the closest occurrence.
  const closest = occurrences.reduce((best, n) =>
    Math.abs(n - start) < Math.abs(best - start) ? n : best
  );
  const span = Math.min(end - start, REANCHOR_SPAN);
  return {
    ok: true,
    file,
    startLine: closest,
    endLine: Math.min(lastLine, closest + span),
    symbol,
    status: "reanchored",
  };
}

/** Validates the claims of one unit; ids are assigned by the caller's counter. */
export function validateClaims(
  claims: RawClaim[],
  unit: { id: string; module: string; files: SourceExcerpt[] },
  nextId: () => string
) {
  const files = new Map(unit.files.map((f) => [f.path, f]));
  const verified: VerifiedClaim[] = [];
  const rejected: RejectedClaim[] = [];

  for (const claim of claims) {
    const result = validateClaim(claim, files);
    if (!result.ok) {
      rejected.push({ claim, reason: result.reason });
      continue;
    }

    const duplicate = verified.some(
      (v) =>
        v.kind === claim.kind &&
        v.file === result.file &&
        v.startLine <= result.endLine &&
        result.startLine <= v.endLine &&
        v.symbol === result.symbol
    );
    if (duplicate) {
      rejected.push({ claim, reason: "duplicate" });
      continue;
    }

    verified.push({
      id: nextId(),
      unitId: unit.id,
      module: unit.module,
      kind: claim.kind,
      text: claim.text,
      file: result.file,
      startLine: result.startLine,
      endLine: result.endLine,
      symbol: result.symbol,
      status: result.status,
    });
  }

  return { verified, rejected };
}
