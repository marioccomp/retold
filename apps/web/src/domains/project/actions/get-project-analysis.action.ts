"use server";

import { getAuthenticatedUserId } from "@/src/lib/server-auth";
import { prisma } from "@repo/database";

import { requireProjectAccess } from "../lib/project-access";

type JsonRecord = Record<string, unknown>;

function sanitizeSuggestionsInRecord(value: unknown, includeSuggestions: boolean): unknown {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return value;
    }

    const record = value as JsonRecord;

    return {
        ...record,
        ...(includeSuggestions ? {} : { suggestions: undefined }),
    };
}

function sanitizeLlmOverview(
    llmOverview: string | null | undefined,
    includeSuggestions: boolean
): string | null {
    if (!llmOverview) return null;
    if (includeSuggestions) return llmOverview;

    try {
        const parsed = JSON.parse(llmOverview) as JsonRecord;
        const sanitized = sanitizeSuggestionsInRecord(parsed, false);
        return JSON.stringify(sanitized);
    } catch {
        return llmOverview;
    }
}

export async function getProjectAnalysisAction(projectId: number) {
    const currentUserId = await getAuthenticatedUserId();
    const accessibleProject = await requireProjectAccess(projectId, currentUserId);
    const isOwner = Boolean(currentUserId && accessibleProject.userId === currentUserId);

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
            status: true,
            user: {
                select: {
                    rateLimitResetAt: true,
                },
            },
            analysis: {
                select: {
                    createdAt: true,
                    appType: true,
                    stack: true,
                    structure: true,
                    signals: true,
                    rawAnalysis: true,
                    llmOverview: true,
                },
            },
        },
    });

    if (!project) throw new Error("Project not found");

    const rawAnalysis = sanitizeSuggestionsInRecord(project.analysis?.rawAnalysis, isOwner);

    return {
        status: project.status,
        nextRetryAt:
            isOwner && project.status === "RATE_LIMITED" && project.user.rateLimitResetAt
                ? project.user.rateLimitResetAt.toISOString()
                : null,
        analysis: project.analysis
            ? {
                appType: project.analysis.appType,
                stack: project.analysis.stack,
                structure: project.analysis.structure,
                signals: project.analysis.signals,
                rawAnalysis,
                llmOverview: sanitizeLlmOverview(project.analysis.llmOverview, isOwner),
                createdAt: project.analysis.createdAt.toISOString(),
            }
            : null,
    };
}
