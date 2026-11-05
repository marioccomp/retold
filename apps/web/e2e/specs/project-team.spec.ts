import { test, expect } from "@playwright/test";
import { prisma } from "@repo/database";

import { cleanupE2ERun, createE2ERunId, createE2EUser, disconnectE2EDb } from "../helpers/db";
import { loginThroughUi, preparePage, waitForAuthSessionCookie } from "../helpers/ui";

const runIds: string[] = [];

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

test.afterEach(async () => {
  while (runIds.length > 0) {
    await cleanupE2ERun(runIds.pop()!);
  }
});

test.afterAll(async () => {
  await disconnectE2EDb();
});

test.describe("team projects", () => {
  test("owner invites a teammate, who accepts from the bell and sees the project on their profile", async ({
    page,
    browser,
  }) => {
    const runId = createE2ERunId("team");
    runIds.push(runId);

    const owner = await createE2EUser({ runId, label: "owner", name: "Owner Person" });
    const mate = await createE2EUser({ runId, label: "mate", name: "Mate Person" });
    const project = await prisma.project.create({
      data: {
        title: `${runId} team project`,
        description: "A project built by two people.",
        longerDescription: "A project built by two people.",
        images: [],
        userId: owner.user.id,
        visibility: "public",
        status: "DONE",
      },
    });

    // 1. The owner invites the teammate from the project panel.
    await loginThroughUi(page, owner.user.email, owner.password);
    await waitForAuthSessionCookie(page);
    await page.goto(`/${owner.user.username}?project=${project.id}`);

    const team = page.getByTestId("project-team-section");
    await expect(team).toBeVisible();
    await expect(team.getByTestId(`team-member-${owner.user.username}`)).toContainText("Owner");

    await team.getByTestId("team-invite-input").fill(`@${mate.user.username}`);
    await team.getByTestId("team-invite-submit").click();
    await expect(page.getByText(`Invitation sent to @${mate.user.username}`)).toBeVisible();
    await expect(team.getByTestId(`team-pending-${mate.user.username}`)).toBeVisible();

    // 2. The teammate (in their own browser) accepts the invitation from the bell.
    const mateContext = await browser.newContext();
    page = await mateContext.newPage();
    await preparePage(page);
    await loginThroughUi(page, mate.user.email, mate.password);
    await waitForAuthSessionCookie(page);
    await page.goto("/");
    await page.getByTestId("notification-bell-trigger").click();
    await page.getByTestId("notification-invite-accept").click();
    await expect(page.getByText("You are now part of the project")).toBeVisible();

    // 3. The project shows on the teammate's profile as a collaboration…
    await page.goto(`/${mate.user.username}?tab=projects`);
    await expect(page.getByTestId("project-card-collaboration-badge")).toBeVisible();

    // …and the panel lists both members, with the option to leave.
    await page.goto(`/${mate.user.username}?tab=projects&project=${project.id}`);
    const mateView = page.getByTestId("project-team-section");
    await expect(mateView.getByTestId(`team-member-${owner.user.username}`)).toContainText("Owner");
    await expect(mateView.getByTestId(`team-member-${mate.user.username}`)).toContainText(
      "Collaborator"
    );
    await expect(mateView.getByTestId("team-leave-button")).toBeVisible();
    await expect(mateView.getByTestId("team-invite-input")).toHaveCount(0);

    const collaborator = await prisma.projectCollaborator.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: mate.user.id } },
    });
    expect(collaborator?.status).toBe("ACCEPTED");

    await mateContext.close();
  });
});
