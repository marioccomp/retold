import { FileCode } from "lucide-react";

/** Evidence attached by the two-stage analysis (worker llm/two-stage/run.ts). */
export type AnalysisEvidence =
  | { type: "code"; claimId: string; file: string; startLine: number; endLine: number; url: string | null }
  | { type: "fact"; factId: string; text: string };

type EvidenceLinksProps = {
  evidence?: AnalysisEvidence[];
  label: string;
  linkTitle: string;
};

function lineLabel(e: Extract<AnalysisEvidence, { type: "code" }>) {
  const name = e.file.split("/").pop() ?? e.file;
  return e.startLine === e.endLine ? `${name}:${e.startLine}` : `${name}:${e.startLine}-${e.endLine}`;
}

/** Code citations as permalinks to the analyzed commit; measured facts are not repeated here. */
export function EvidenceLinks({ evidence, label, linkTitle }: EvidenceLinksProps) {
  const code = (evidence ?? []).filter(
    (e): e is Extract<AnalysisEvidence, { type: "code" }> => e.type === "code"
  );
  if (code.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5" data-testid="analysis-evidence">
      <span className="text-xs font-medium text-muted-foreground">{label}:</span>
      {code.slice(0, 3).map((e) => {
        const content = (
          <>
            <FileCode className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-56">{lineLabel(e)}</span>
          </>
        );
        const className =
          "inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs text-foreground/80";

        return e.url ? (
          <a
            key={e.claimId}
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`${e.file} — ${linkTitle}`}
            className={`${className} hover:border-primary hover:text-primary transition-colors`}
          >
            {content}
          </a>
        ) : (
          <span key={e.claimId} title={e.file} className={className}>
            {content}
          </span>
        );
      })}
    </div>
  );
}
