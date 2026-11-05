import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { queueAdd } = vi.hoisted(() => ({ queueAdd: vi.fn() }));

// Accepting an invitation schedules a stats recalculation; keep Redis out of it.
vi.mock("@repo/queue", () => ({
  userAnalyzeQueue: { add: queueAdd },
}));

import { prisma, userRepository } from "@repo/database";
import {
  getProjectTeam,
  inviteCollaborator,
  MAX_COLLABORATORS_PER_PROJECT,
  removeCollaborator,
  respondToInvitation,
} from "@/src/domains/project/lib/collaborators";
import { requireProjectAccess } from "@/src/domains/project/lib/project-access";
import {
  cleanupIntegrationRun,
  createIntegrationProject,
  createIntegrationRunId,
  createIntegrationUser,
} from "@/src/test-utils/integration-db";

const runIds: string[] = [];

afterEach(async () => {
  while (runIds.length > 0) {
    await cleanupIntegrationRun(runIds.pop()!);
  }
});

beforeEach(() => {
  queueAdd.mockReset();
  queueAdd.mockResolvedValue({});
});

async function setupTeam(visibility: "public" | "private" = "public") {
  const runId = createIntegrationRunId("team");
  runIds.push(runId);

  const owner = await createIntegrationUser(runId, { label: "owner" });
  const mate = await createIntegrationUser(runId, { label: "mate" });
  const stranger = await createIntegrationUser(runId, { label: "stranger" });
  const project = await createIntegrationProject(runId, {
    userId: owner.id,
    label: "project",
    visibility,
    status: "DONE",
  });

  return { runId, owner, mate, stranger, project };
}

function expectCode(promise: Promise<unknown>, code: string) {
  return expect(promise).rejects.toEqual(expect.objectContaining({ code }));
}

describe("project collaborators", () => {
  it("invites by username, notifies the invitee and accepts the invitation", async () => {
    const { owner, mate, project } = await setupTeam();

    await inviteCollaborator({
      projectId: project.id,
      ownerId: owner.id,
      username: `@${mate.username!.toUpperCase()}`,
    });

    const invite = await prisma.notification.findFirst({
      where: { userId: mate.id, projectId: project.id, type: "PROJECT_INVITE" },
    });
    expect(invite?.sourceUserId).toBe(owner.id);

    const teamWhileInvited = await getProjectTeam({ projectId: project.id, viewerId: mate.id });
    expect(teamWhileInvited.viewerRole).toBe("invited");
    expect(teamWhileInvited.members.map((m) => m.user.id)).toEqual([owner.id]);
    // Pending invitations are only listed for the owner.
    expect(teamWhileInvited.pendingInvitations).toEqual([]);

    await respondToInvitation({ projectId: project.id, userId: mate.id, accept: true });

    const team = await getProjectTeam({ projectId: project.id, viewerId: owner.id });
    expect(team.viewerRole).toBe("owner");
    expect(team.members.map((m) => [m.user.id, m.role])).toEqual([
      [owner.id, "owner"],
      [mate.id, "collaborator"],
    ]);

    // Invite notification consumed; owner notified; stats recalculation scheduled.
    expect(
      await prisma.notification.count({
        where: { userId: mate.id, projectId: project.id, type: "PROJECT_INVITE" },
      })
    ).toBe(0);
    expect(
      await prisma.notification.count({
        where: { userId: owner.id, sourceUserId: mate.id, type: "PROJECT_INVITE_ACCEPTED" },
      })
    ).toBe(1);
    expect(queueAdd).toHaveBeenCalledWith(
      "analyze-user",
      { projectId: project.id },
      expect.any(Object)
    );
  });

  it("does not schedule contribution stats for private projects", async () => {
    const { owner, mate, project } = await setupTeam("private");

    await inviteCollaborator({ projectId: project.id, ownerId: owner.id, username: mate.username! });
    await respondToInvitation({ projectId: project.id, userId: mate.id, accept: true });

    expect(queueAdd).not.toHaveBeenCalled();
  });

  it("declining deletes the invitation so the user can be invited again", async () => {
    const { owner, mate, project } = await setupTeam();

    await inviteCollaborator({ projectId: project.id, ownerId: owner.id, username: mate.username! });
    await respondToInvitation({ projectId: project.id, userId: mate.id, accept: false });

    expect(await prisma.projectCollaborator.count({ where: { projectId: project.id } })).toBe(0);
    await expect(
      inviteCollaborator({ projectId: project.id, ownerId: owner.id, username: mate.username! })
    ).resolves.toBeDefined();
  });

  it("rejects invalid invitations", async () => {
    const { owner, mate, stranger, project } = await setupTeam();

    await expectCode(
      inviteCollaborator({ projectId: project.id, ownerId: stranger.id, username: mate.username! }),
      "NOT_PROJECT_OWNER"
    );
    await expectCode(
      inviteCollaborator({ projectId: project.id, ownerId: owner.id, username: owner.username! }),
      "CANNOT_INVITE_SELF"
    );
    await expectCode(
      inviteCollaborator({ projectId: project.id, ownerId: owner.id, username: "nobody-here-xyz" }),
      "USER_NOT_FOUND"
    );

    await inviteCollaborator({ projectId: project.id, ownerId: owner.id, username: mate.username! });
    await expectCode(
      inviteCollaborator({ projectId: project.id, ownerId: owner.id, username: mate.username! }),
      "ALREADY_INVITED"
    );

    await respondToInvitation({ projectId: project.id, userId: mate.id, accept: true });
    await expectCode(
      inviteCollaborator({ projectId: project.id, ownerId: owner.id, username: mate.username! }),
      "ALREADY_MEMBER"
    );
    await expectCode(
      respondToInvitation({ projectId: project.id, userId: mate.id, accept: true }),
      "INVITATION_NOT_FOUND"
    );
  });

  it("limits the number of collaborators per project", async () => {
    const { runId, owner, project } = await setupTeam();

    for (let i = 0; i < MAX_COLLABORATORS_PER_PROJECT; i++) {
      const user = await createIntegrationUser(runId, { label: `extra${i}` });
      await inviteCollaborator({ projectId: project.id, ownerId: owner.id, username: user.username! });
    }

    const oneTooMany = await createIntegrationUser(runId, { label: "toomany" });
    await expectCode(
      inviteCollaborator({ projectId: project.id, ownerId: owner.id, username: oneTooMany.username! }),
      "TOO_MANY_COLLABORATORS"
    );
  });

  it("lets a member leave and removes their contribution to the project", async () => {
    const { owner, mate, stranger, project } = await setupTeam();

    await inviteCollaborator({ projectId: project.id, ownerId: owner.id, username: mate.username! });
    await respondToInvitation({ projectId: project.id, userId: mate.id, accept: true });
    await prisma.userProjectStats.create({
      data: { userId: mate.id, projectId: project.id, commitsCount: 12 },
    });

    // Only the owner or the member themselves can remove a member.
    await expectCode(
      removeCollaborator({ projectId: project.id, actorId: stranger.id, userId: mate.id }),
      "NOT_PROJECT_OWNER"
    );

    await removeCollaborator({ projectId: project.id, actorId: mate.id, userId: mate.id });

    expect(await prisma.projectCollaborator.count({ where: { projectId: project.id } })).toBe(0);
    expect(
      await prisma.userProjectStats.count({ where: { userId: mate.id, projectId: project.id } })
    ).toBe(0);
    await expectCode(
      removeCollaborator({ projectId: project.id, actorId: owner.id, userId: mate.id }),
      "NOT_A_MEMBER"
    );
  });

  it("shows each member's own contribution in the team", async () => {
    const { owner, mate, project } = await setupTeam();

    await inviteCollaborator({ projectId: project.id, ownerId: owner.id, username: mate.username! });
    await respondToInvitation({ projectId: project.id, userId: mate.id, accept: true });
    await prisma.userProjectStats.createMany({
      data: [
        { userId: owner.id, projectId: project.id, commitsCount: 30, linesAdded: 900 },
        { userId: mate.id, projectId: project.id, commitsCount: 12, linesAdded: 300 },
      ],
    });

    const team = await getProjectTeam({ projectId: project.id, viewerId: null });

    expect(team.viewerRole).toBe("none");
    expect(team.members.map((m) => [m.user.id, m.stats?.commitsCount])).toEqual([
      [owner.id, 30],
      [mate.id, 12],
    ]);
  });
});

describe("private project access for members", () => {
  it("lets accepted and invited members open a private project, but not strangers", async () => {
    const { owner, mate, stranger, project } = await setupTeam("private");

    await expectCode(requireProjectAccess(project.id, mate.id), "PROJECT_NOT_ACCESSIBLE");

    await inviteCollaborator({ projectId: project.id, ownerId: owner.id, username: mate.username! });
    await expect(requireProjectAccess(project.id, mate.id)).resolves.toMatchObject({
      id: project.id,
    });

    await respondToInvitation({ projectId: project.id, userId: mate.id, accept: true });
    await expect(requireProjectAccess(project.id, mate.id)).resolves.toMatchObject({
      id: project.id,
    });

    await expectCode(requireProjectAccess(project.id, stranger.id), "PROJECT_NOT_ACCESSIBLE");
    await expectCode(requireProjectAccess(project.id, null), "PROJECT_NOT_ACCESSIBLE");
  });
});

describe("profile projects", () => {
  it("lists collaborations on the member's profile with the real owner", async () => {
    const { owner, mate, project } = await setupTeam();

    await inviteCollaborator({ projectId: project.id, ownerId: owner.id, username: mate.username! });

    // A pending invitation is not a collaboration yet.
    const beforeAccept = await userRepository.findPublicProfileByUsername(mate.username!);
    expect(beforeAccept?.projects.map((p) => p.id)).toEqual([]);

    await respondToInvitation({ projectId: project.id, userId: mate.id, accept: true });

    const profile = await userRepository.findPublicProfileByUsername(mate.username!);
    expect(profile?.projects.map((p) => [p.id, p.user.id])).toEqual([[project.id, owner.id]]);
    expect(profile?._count.projects).toBe(1);
  });

  it("never shows private or pending projects to anonymous visitors", async () => {
    const { runId, owner, mate } = await setupTeam();
    await createIntegrationProject(runId, {
      userId: owner.id,
      label: "secret",
      visibility: "private",
      status: "DONE",
    });
    await createIntegrationProject(runId, {
      userId: owner.id,
      label: "not-analyzed",
      visibility: "public",
      status: "PENDING",
    });

    const anonymous = await userRepository.findPublicProfileByUsername(owner.username!);
    expect(anonymous?.projects.map((p) => p.title)).toEqual([`${runId}-project`]);
    expect(anonymous?._count.projects).toBe(1);

    // The owner still sees everything on their own profile.
    const ownView = await userRepository.findPublicProfileByUsername(owner.username!, owner.id);
    expect(ownView?.projects).toHaveLength(3);

    // Another signed-in user only sees the public, analyzed project.
    const otherView = await userRepository.findPublicProfileByUsername(owner.username!, mate.id);
    expect(otherView?.projects.map((p) => p.title)).toEqual([`${runId}-project`]);
  });

  it("shows a private team project to its members", async () => {
    const { owner, mate, project } = await setupTeam("private");

    await inviteCollaborator({ projectId: project.id, ownerId: owner.id, username: mate.username! });
    await respondToInvitation({ projectId: project.id, userId: mate.id, accept: true });

    const memberView = await userRepository.findPublicProfileByUsername(owner.username!, mate.id);
    expect(memberView?.projects.map((p) => p.id)).toEqual([project.id]);

    const anonymous = await userRepository.findPublicProfileByUsername(owner.username!);
    expect(anonymous?.projects).toEqual([]);
  });
});
