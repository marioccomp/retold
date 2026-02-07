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
export function useProjectModal(projectKey: string = "project") {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const projectId = searchParams.get(projectKey);

  const openProject = useCallback(
    (id: number | string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(projectKey, String(id));
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, projectKey]
  );

  const closeProject = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(projectKey);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [router, pathname, searchParams, projectKey]);

  return {
    projectId: projectId ? Number(projectId) : null,
    isOpen: !!projectId,
    openProject,
    closeProject,
  };
}
