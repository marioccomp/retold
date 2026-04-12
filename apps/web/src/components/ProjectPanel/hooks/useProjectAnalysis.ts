import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "@/src/i18n/client";
import {
    getProjectAnalysisAction,
    startProjectAnalysisAction,
} from "@/src/domains/project/actions";
import { ProjectForOverlay } from "../types";
import { createLogger } from "@repo/observability";

const logger = createLogger("web.ui.project-analysis");

export function useProjectAnalysis(project: ProjectForOverlay) {
    const { dict } = useTranslation();
    const queryClient = useQueryClient();
    const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);

    const { data, isFetching, refetch } = useQuery({
        queryKey: ["project-analysis", project.id],
        queryFn: () => getProjectAnalysisAction(project.id),
        enabled: true,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            const retryBlockedUntil = query.state.data?.retryBlockedUntil;
            if (status === "ANALYZING") return 2000;
            if (status === "RATE_LIMITED") return 5000;
            if (
                status === "ERROR" &&
                retryBlockedUntil &&
                new Date(retryBlockedUntil).getTime() > Date.now()
            ) {
                return 1000;
            }
            return false;
        },
        retry: (failureCount, error) => {
            const message = error instanceof Error ? error.message : "";
            if (
                message.includes("PROJECT_NOT_FOUND") ||
                message.includes("PROJECT_INTERNAL_ERROR") ||
                message.includes("PROJECT_NOT_ACCESSIBLE") ||
                message.includes("Project not found")
            ) {
                return false;
            }

            return failureCount < 2;
        },
    });

    const handleAnalyzeRepo = async () => {
        if (isStartingAnalysis) {
            return;
        }

        try {
            setIsStartingAnalysis(true);
            const result = await startProjectAnalysisAction(project.id);

            if ("limitReached" in result && result.limitReached) {
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

            if ("retryBlocked" in result && result.retryBlocked) {
                const minutesLeft = result.minutesLeft ?? 1;
                toast.error(dict.project.overlay.error_view.cooldown_title, {
                    description: dict.project.overlay.error_view.cooldown_description.replace(
                        "{minutes}",
                        String(minutesLeft)
                    ),
                });
                refetch();
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
            logger.error("project.analysis_start_failed", err, {
                projectId: project.id,
            });
            toast.error(dict.project.analysis.start_error);
        } finally {
            setIsStartingAnalysis(false);
        }
    };

    const status = data?.status ?? project.status;
    const nextRetryAt = data?.nextRetryAt ?? null;
    const retryBlockedUntil = data?.retryBlockedUntil ?? null;
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
        if (
            (prevStatusRef.current === "ANALYZING" || prevStatusRef.current === "RATE_LIMITED") &&
            status === "DONE"
        ) {
            queryClient.invalidateQueries({ queryKey: ["profile"], refetchType: "all" });
        }

        if (prevStatusRef.current === "ANALYZING" && status === "PROJECT_INTERNAL_ERROR") {
            const retryAt = nextRetryAt ? new Date(nextRetryAt) : null;
            const retryLabel =
                retryAt && !Number.isNaN(retryAt.getTime())
                    ? new Intl.DateTimeFormat(undefined, {
                        dateStyle: "short",
                        timeStyle: "short",
                    }).format(retryAt)
                    : null;

            toast.error(dict.project.overlay.internal_error.title, {
                description: retryLabel
                    ? `${dict.project.overlay.internal_error.description} ${dict.project.overlay.internal_error.cooldown_suffix.replace("{time}", retryLabel)}`
                    : dict.project.overlay.internal_error.description,
            });
            queryClient.invalidateQueries({ queryKey: ["profile"], refetchType: "all" });
            queryClient.invalidateQueries({ queryKey: ["feed-projects"] });
            queryClient.invalidateQueries({ queryKey: ["highlighted-project"] });
        }
        prevStatusRef.current = status;
    }, [status, nextRetryAt, queryClient, dict.project.overlay.internal_error]);

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
        nextRetryAt,
        retryBlockedUntil,
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
        isFetching,
        isStartingAnalysis
    };
}
