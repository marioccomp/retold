import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    getProjectAnalysisAction,
    startProjectAnalysisAction,
} from "@/src/domains/project/actions";
import { ProjectForOverlay } from "../types";

export function useProjectAnalysis(project: ProjectForOverlay) {
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
            if (result.queued) {
                toast.success("Analysis started");
                refetch();
                queryClient.invalidateQueries({ queryKey: ["projects"] });
            } else {
                toast.error("Failed to start analysis");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to start analysis");
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
