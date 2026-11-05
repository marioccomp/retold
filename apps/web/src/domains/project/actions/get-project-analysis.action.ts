"use server";

import { getAuthenticatedUserId } from "@/src/lib/server-auth";
import { prisma } from "@repo/database";
import { MANUAL_REANALYZE_COOLDOWN_MS } from "../constants";

import { ProjectAccessError, requireProjectAccess } from "../lib/project-access";

type JsonRecord = Record<string, unknown>;

function sanitizeSuggestionsInRecord(value: unknown, includeSuggestions: boolean): unknown {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return value;
    }

    const record = value as JsonRecord;

    // Axis scores (analysis v3) carry rationales that may describe weaknesses, so they
    // stay owner-only like suggestions until the project page decides what is public.
    return {
        ...record,
        ...(includeSuggestions ? {} : { suggestions: undefined, scores: undefined }),
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
    let accessibleProject;

    try {
        accessibleProject = await requireProjectAccess(projectId, currentUserId);
    } catch (error) {
        if (error instanceof ProjectAccessError) {
            // Failed analyses keep the project in ERROR (it is no longer deleted),
            // so a missing project here really is missing.
            return {
                status: error.code,
                nextRetryAt: null,
                retryBlockedUntil: null,
                analysis: null,
            };
        }

        throw error;
    }

    const isOwner = Boolean(currentUserId && accessibleProject.userId === currentUserId);

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
            status: true,
            updatedAt: true,
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

    if (!project) {
        return {
            status: "PROJECT_NOT_FOUND" as const,
            nextRetryAt: null,
            retryBlockedUntil: null,
            analysis: null,
        };
    }

    const rawAnalysis = sanitizeSuggestionsInRecord(project.analysis?.rawAnalysis, isOwner);
    const retryBlockedUntil =
        isOwner && project.status === "ERROR"
            ? new Date(project.updatedAt.getTime() + MANUAL_REANALYZE_COOLDOWN_MS)
            : null;

    return {
        status: project.status,
        nextRetryAt:
            isOwner && project.status === "RATE_LIMITED" && project.user.rateLimitResetAt
                ? project.user.rateLimitResetAt.toISOString()
                : null,
        retryBlockedUntil:
            retryBlockedUntil && retryBlockedUntil > new Date()
                ? retryBlockedUntil.toISOString()
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
