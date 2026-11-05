"use server";

import { revalidatePath } from "next/cache";
import { createLogger } from "@repo/observability";

import { ActionResponse } from "@/lib/action-response";
import {
  CollaboratorError,
  getProjectTeam,
  inviteCollaborator,
  ProjectTeam,
  removeCollaborator,
  respondToInvitation,
  TeamMemberUser,
} from "@/src/domains/project/lib/collaborators";
import { ProjectAccessError, requireProjectAccess } from "@/src/domains/project/lib/project-access";
import {
  getAuthenticatedUserId,
  requireAuthenticatedUserId,
  UnauthorizedError,
} from "@/src/lib/server-auth";

const logger = createLogger("web.action.project-collaborators");

/**
 * Failure `message` is a stable error code (e.g. "USER_NOT_FOUND"); the UI maps
 * it to a translated text.
 */
function toFailure(error: unknown, event: string, context: Record<string, unknown>) {
  if (error instanceof CollaboratorError) {
    return { success: false as const, message: error.code };
  }
  if (error instanceof UnauthorizedError) {
    return { success: false as const, message: "UNAUTHORIZED" };
  }
  if (error instanceof ProjectAccessError) {
    return { success: false as const, message: error.code };
  }

  logger.error(event, error, context);
  return { success: false as const, message: "UNEXPECTED_ERROR" };
}

export async function getProjectTeamAction(projectId: number): Promise<ActionResponse<ProjectTeam>> {
  try {
    const viewerId = await getAuthenticatedUserId();
    await requireProjectAccess(projectId, viewerId);
    return { success: true, data: await getProjectTeam({ projectId, viewerId }) };
  } catch (error) {
    return toFailure(error, "collaborators.team_fetch_failed", { projectId });
  }
}

export async function inviteCollaboratorAction(
  projectId: number,
  username: string
): Promise<ActionResponse<{ user: TeamMemberUser }>> {
  try {
    const ownerId = await requireAuthenticatedUserId();
    const result = await inviteCollaborator({ projectId, ownerId, username });
    return { success: true, data: result };
  } catch (error) {
    return toFailure(error, "collaborators.invite_failed", { projectId });
  }
}

export async function respondToInvitationAction(
  projectId: number,
  accept: boolean
): Promise<ActionResponse<{ accepted: boolean }>> {
  try {
    const userId = await requireAuthenticatedUserId();
    const result = await respondToInvitation({ projectId, userId, accept });
    if (result.accepted) revalidatePath("/[username]", "page");
    return { success: true, data: result };
  } catch (error) {
    return toFailure(error, "collaborators.respond_failed", { projectId, accept });
  }
}

/** Owner removes a member / cancels an invitation, or a member leaves (userId = self). */
export async function removeCollaboratorAction(
  projectId: number,
  userId: number
): Promise<ActionResponse> {
  try {
    const actorId = await requireAuthenticatedUserId();
    await removeCollaborator({ projectId, actorId, userId });
    revalidatePath("/[username]", "page");
    return { success: true };
  } catch (error) {
    return toFailure(error, "collaborators.remove_failed", { projectId });
  }
}
