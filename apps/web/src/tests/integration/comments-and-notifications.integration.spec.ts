import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { currentSession } = vi.hoisted(() => ({
  currentSession: {
    value: null as any,
  },
}));

vi.mock("@/src/domains/auth/auth", () => ({
  auth: vi.fn(async () => currentSession.value),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { prisma } from "@repo/database";
import {
  createComment,
  deleteComment,
  getProjectComments,
} from "@/src/domains/project/actions/comment.actions";
import {
  clearAllNotificationsAction,
  deleteNotificationAction,
  getNotificationsAction,
  markAllAsReadAction,
  markAsReadAction,
} from "@/src/domains/notification/actions";
import { toggleFollowAction } from "@/src/domains/user/actions/toggle-follow.action";
import {
  buildAuthSession,
  cleanupIntegrationRun,
  createIntegrationNotification,
  createIntegrationProject,
  createIntegrationRepository,
  createIntegrationRunId,
  createIntegrationUser,
  disconnectIntegrationDb,
} from "@/src/test-utils/integration-db";

describe("comments, follows and notifications integration", () => {
  const runsToCleanup = new Set<string>();

  beforeEach(() => {
    currentSession.value = null;
  });

  afterEach(async () => {
    currentSession.value = null;

    for (const runId of runsToCleanup) {
      await cleanupIntegrationRun(runId);
    }
    runsToCleanup.clear();
  });

  afterAll(async () => {
    await disconnectIntegrationDb();
  });

  it("should create a comment, trim content and notify the project owner", async () => {
    const runId = createIntegrationRunId("cmt");
    runsToCleanup.add(runId);

    const owner = await createIntegrationUser(runId, { label: "owner" });
    const commenter = await createIntegrationUser(runId, { label: "commenter" });
    const repository = await createIntegrationRepository(runId, {
      userId: owner.id,
      label: "repo",
    });
    const project = await createIntegrationProject(runId, {
      userId: owner.id,
      repositoryId: repository.id,
      label: "project",
      visibility: "public",
    });

    currentSession.value = buildAuthSession(commenter);

    const result = await createComment(project.id, "  Great work!  ");

    expect(result).toEqual({ success: true });

    const comments = await prisma.comment.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "asc" },
    });
    expect(comments).toHaveLength(1);
    expect(comments[0].content).toBe("Great work!");

    const notifications = await prisma.notification.findMany({
      where: {
        userId: owner.id,
        sourceUserId: commenter.id,
        type: "COMMENT",
      },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].projectId).toBe(project.id);
  });

  it("should reject replies that point to a parent comment from another project", async () => {
    const runId = createIntegrationRunId("cpr");
    runsToCleanup.add(runId);

    const owner = await createIntegrationUser(runId, { label: "owner" });
    const commenter = await createIntegrationUser(runId, { label: "commenter" });
    const repository = await createIntegrationRepository(runId, {
      userId: owner.id,
      label: "repo",
    });
    const projectA = await createIntegrationProject(runId, {
      userId: owner.id,
      repositoryId: repository.id,
      label: "project-a",
    });
    const projectB = await createIntegrationProject(runId, {
      userId: owner.id,
      repositoryId: repository.id,
      label: "project-b",
    });

    const parent = await prisma.comment.create({
      data: {
        content: "parent",
        userId: owner.id,
        projectId: projectA.id,
      },
    });

    currentSession.value = buildAuthSession(commenter);

    const result = await createComment(projectB.id, "reply", parent.id);

    expect(result).toEqual({
      success: false,
      message: "Parent comment not found",
    });
  });

  it("should only allow the comment author to delete their own comment", async () => {
    const runId = createIntegrationRunId("cmd");
    runsToCleanup.add(runId);

    const owner = await createIntegrationUser(runId, { label: "owner" });
    const author = await createIntegrationUser(runId, { label: "author" });
    const otherUser = await createIntegrationUser(runId, { label: "other" });
    const repository = await createIntegrationRepository(runId, {
      userId: owner.id,
      label: "repo",
    });
    const project = await createIntegrationProject(runId, {
      userId: owner.id,
      repositoryId: repository.id,
      label: "project",
    });

    const comment = await prisma.comment.create({
      data: {
        content: "delete me",
        userId: author.id,
        projectId: project.id,
      },
    });

    currentSession.value = buildAuthSession(otherUser);
    const blocked = await deleteComment(comment.id, project.id);
    expect(blocked).toEqual({
      success: false,
      message: "Unauthorized or comment not found",
    });

    currentSession.value = buildAuthSession(author);
    const success = await deleteComment(comment.id, project.id);
    expect(success).toEqual({ success: true });

    const persisted = await prisma.comment.findUnique({ where: { id: comment.id } });
    expect(persisted).toBeNull();
  });

  it("should create and toggle follows, and avoid duplicate follow notifications", async () => {
    const runId = createIntegrationRunId("fol");
    runsToCleanup.add(runId);

    const target = await createIntegrationUser(runId, { label: "target" });
    const follower = await createIntegrationUser(runId, { label: "follower" });

    currentSession.value = buildAuthSession(follower);

    const firstResult = await toggleFollowAction(target.id);
    expect(firstResult).toEqual({ success: true });

    const follow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: follower.id,
          followingId: target.id,
        },
      },
    });
    expect(follow).not.toBeNull();

    const firstNotificationCount = await prisma.notification.count({
      where: {
        userId: target.id,
        sourceUserId: follower.id,
        type: "FOLLOW",
      },
    });
    expect(firstNotificationCount).toBe(1);

    const secondResult = await toggleFollowAction(target.id);
    expect(secondResult).toEqual({ success: true });

    const removedFollow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: follower.id,
          followingId: target.id,
        },
      },
    });
    expect(removedFollow).toBeNull();

    const secondNotificationCount = await prisma.notification.count({
      where: {
        userId: target.id,
        sourceUserId: follower.id,
        type: "FOLLOW",
      },
    });
    expect(secondNotificationCount).toBe(1);
  });

  it("should list, mark, delete and clear only the authenticated users notifications", async () => {
    const runId = createIntegrationRunId("ntf");
    runsToCleanup.add(runId);

    const receiver = await createIntegrationUser(runId, { label: "receiver" });
    const source = await createIntegrationUser(runId, { label: "source" });
    const outsider = await createIntegrationUser(runId, { label: "outsider" });

    const ownNotification = await createIntegrationNotification({
      userId: receiver.id,
      sourceUserId: source.id,
      type: "FOLLOW",
    });
    await createIntegrationNotification({
      userId: outsider.id,
      sourceUserId: source.id,
      type: "FOLLOW",
    });

    currentSession.value = buildAuthSession(receiver);

    const listResult = await getNotificationsAction();
    expect(listResult.success).toBe(true);
    expect(listResult.data).toHaveLength(1);
    expect(listResult.data[0].id).toBe(ownNotification.id);

    expect(await markAsReadAction(ownNotification.id)).toEqual({ success: true });
    const marked = await prisma.notification.findUnique({ where: { id: ownNotification.id } });
    expect(marked?.read).toBe(true);

    const outsiderDeleteAttempt = await deleteNotificationAction(999999999);
    expect(outsiderDeleteAttempt).toEqual({
      success: false,
      error: "Notification not found or unauthorized",
    });

    const deleteResult = await deleteNotificationAction(ownNotification.id);
    expect(deleteResult).toEqual({ success: true });

    const freshNotification = await createIntegrationNotification({
      userId: receiver.id,
      sourceUserId: source.id,
      type: "LIKE",
      read: false,
    });
    await createIntegrationNotification({
      userId: receiver.id,
      sourceUserId: source.id,
      type: "COMMENT",
      read: false,
    });

    expect(await markAllAsReadAction()).toEqual({ success: true });
    const unreadCount = await prisma.notification.count({
      where: {
        userId: receiver.id,
        read: false,
      },
    });
    expect(unreadCount).toBe(0);

    expect(await clearAllNotificationsAction()).toEqual({ success: true });
    const remainingOwnNotifications = await prisma.notification.count({
      where: { userId: receiver.id },
    });
    expect(remainingOwnNotifications).toBe(0);

    const outsiderNotifications = await prisma.notification.count({
      where: { userId: outsider.id },
    });
    expect(outsiderNotifications).toBe(1);

    expect(freshNotification.id).toBeTypeOf("number");
  });

  it("should return an empty list when trying to read comments from an inaccessible private project", async () => {
    const runId = createIntegrationRunId("gpc");
    runsToCleanup.add(runId);

    const owner = await createIntegrationUser(runId, { label: "owner" });
    const outsider = await createIntegrationUser(runId, { label: "outsider" });
    const repository = await createIntegrationRepository(runId, {
      userId: owner.id,
      label: "repo",
      private: true,
    });
    const project = await createIntegrationProject(runId, {
      userId: owner.id,
      repositoryId: repository.id,
      label: "private-project",
      visibility: "private",
    });

    currentSession.value = buildAuthSession(outsider);

    await prisma.comment.create({
      data: {
        content: "hidden comment",
        userId: owner.id,
        projectId: project.id,
      },
    });

    const comments = await getProjectComments(project.id);

    expect(comments).toEqual([]);
  });
});
