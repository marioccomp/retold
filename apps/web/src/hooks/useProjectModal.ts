"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

/**
 * Hook to manage project modal state via URL query params.
 * This enables browser back/forward navigation support.
 * 
 * Usage:
 *   const { projectId, openProject, closeProject } = useProjectModal();
 */
export function useProjectModal() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const projectId = searchParams.get("project");

    const openProject = useCallback(
        (id: number | string) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("project", String(id));
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        },
        [router, pathname, searchParams]
    );

    const closeProject = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("project");
        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [router, pathname, searchParams]);

    return {
        projectId: projectId ? Number(projectId) : null,
        isOpen: !!projectId,
        openProject,
        closeProject,
    };
}
