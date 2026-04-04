import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "@/src/i18n/client";
import {
    getProjectAnalysisAction,
    startProjectAnalysisAction,
} from "@/src/domains/project/actions";
import { ProjectForOverlay } from "../types";

export function useProjectAnalysis(project: ProjectForOverlay) {
    const { dict } = useTranslation();
    const queryClient = useQueryClient();

    const { data, isFetching, refetch } = useQuery({
        queryKey: ["project-analysis", project.id],
        queryFn: () => getProjectAnalysisAction(project.id),
        enabled: true,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (status === "ANALYZING" || status === "PENDING") return 2000;
            return false;
        },
    });

    const handleAnalyzeRepo = async () => {
        try {
            const result = await startProjectAnalysisAction(project.id);

            if (result.limitReached) {
                const hoursLeft = result.hoursLeft ?? 0;
                const minutesLeft = result.minutesLeft ?? 0;

                const timeStr = hoursLeft > 0
                    ? dict.project.analysis.retry_time_hours
                        .replace("{hours}", String(hoursLeft))
                        .replace("{minutes}", String(minutesLeft))
                    : dict.project.analysis.retry_time_minutes
                        .replace("{minutes}", String(minutesLeft));

                toast.error(dict.project.analysis.limit_reached_title, {
                    description: `${dict.project.analysis.limit_reached_description} ${timeStr}`,
                });
                return;
            }

            if (result.queued) {
                const remaining = result.remaining ?? 0;
                toast.success(dict.project.analysis.started, {
                    description: dict.project.analysis.remaining
                        .replace("{remaining}", String(remaining))
                        .replace("{limit}", String(result.limit)),
                });
                refetch();
                queryClient.invalidateQueries({ queryKey: ["projects"] });
            } else {
                toast.error(dict.project.analysis.start_error);
            }
        } catch (err) {
            console.error(err);
            toast.error(dict.project.analysis.start_error);
        }
    };

    const status = data?.status ?? project.status;
    const analysis = data?.analysis ?? null;
    const rawAnalysis = (analysis as any)?.rawAnalysis ?? null;

    const llmOverview = analysis?.llmOverview ?? null;
    const summary = rawAnalysis?.summary ?? null;
    const stack = rawAnalysis?.stack ?? analysis?.stack ?? null;
    const stats = rawAnalysis?.stats ?? null;
    const infra = rawAnalysis?.infra ?? analysis?.signals ?? null;
    const structure = rawAnalysis?.structure ?? analysis?.structure ?? null;

    const frameworks: string[] = (stack?.frameworks ?? []) as string[];
    const tools: string[] = (stack?.tools ?? []) as string[];
    const languages: string[] = (stack?.languages ?? []) as string[];

    // Track previous status and if analysis ran while component was open
    const prevStatusRef = useRef(status);
    const wasAnalyzingRef = useRef(false);

    useEffect(() => {
        // Track if we saw ANALYZING status
        if (status === "ANALYZING") {
            wasAnalyzingRef.current = true;
        }

        // When analysis completes, invalidate profile immediately
        if (prevStatusRef.current === "ANALYZING" && status === "DONE") {
            queryClient.invalidateQueries({ queryKey: ["profile"], refetchType: "all" });
        }
        prevStatusRef.current = status;
    }, [status, queryClient]);

    // Invalidate profile when component unmounts if analysis completed
    useEffect(() => {
        return () => {
            if (wasAnalyzingRef.current || status === "DONE") {
                queryClient.invalidateQueries({ queryKey: ["profile"], refetchType: "all" });
            }
        };
    }, [queryClient, status]);

    return {
        status,
        analysis,
        data: {
            llmOverview,
            summary,
            stats,
            infra,
            structure,
            stack: {
                frameworks,
                tools,
                languages
            }
        },
        handleAnalyzeRepo,
        isFetching
    };
}
