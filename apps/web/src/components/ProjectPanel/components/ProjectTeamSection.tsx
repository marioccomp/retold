"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, LogOut, UserPlus, Users, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getProjectTeamAction,
  inviteCollaboratorAction,
  removeCollaboratorAction,
  respondToInvitationAction,
} from "@/src/domains/project/actions/collaborators.actions";
import type { TeamMember, TeamMemberUser } from "@/src/domains/project/lib/collaborators";
import { searchUsersAction } from "@/src/domains/user/actions/search-users.action";
import { useDebounce } from "@/src/hooks/useDebounce";
import { useTranslation } from "@/src/i18n/client";

type ProjectTeamSectionProps = {
  projectId: number;
  visibility?: string;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

function displayName(user: TeamMemberUser) {
  return user.name || user.username || "?";
}

function MemberAvatar({ user, className }: { user: TeamMemberUser; className?: string }) {
  return (
    <Avatar className={className ?? "h-10 w-10"}>
      <AvatarImage src={user.image || undefined} />
      <AvatarFallback className="bg-secondary text-xs font-bold text-foreground">
        {displayName(user).substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

export function ProjectTeamSection({ projectId, visibility }: ProjectTeamSectionProps) {
  const { dict } = useTranslation();
  const t = dict.project.team;
  const queryClient = useQueryClient();
  const queryKey = ["project-team", projectId];

  const [username, setUsername] = useState("");
  const debouncedUsername = useDebounce(username.trim().replace(/^@/, ""), 300);

  const { data: response, isLoading } = useQuery({
    queryKey,
    queryFn: () => getProjectTeamAction(projectId),
  });
  const team = response?.success ? response.data : undefined;

  const errorMessage = (code: string) =>
    (t.errors as Record<string, string>)[code] ?? t.errors.default;

  const refreshAfterMembershipChange = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["profile"], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const isOwner = team?.viewerRole === "owner";

  const { data: suggestions } = useQuery({
    queryKey: ["team-invite-suggestions", debouncedUsername],
    queryFn: () => searchUsersAction(debouncedUsername, 1, 5, "name"),
    enabled: isOwner && debouncedUsername.length >= 2,
  });

  const inviteMutation = useMutation({
    mutationFn: (target: string) => inviteCollaboratorAction(projectId, target),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(errorMessage(result.message));
        return;
      }
      toast.success(t.invite_sent.replace("{username}", result.data?.user.username ?? ""));
      setUsername("");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error(t.errors.default),
  });

  const respondMutation = useMutation({
    mutationFn: (accept: boolean) => respondToInvitationAction(projectId, accept),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(errorMessage(result.message));
        return;
      }
      toast.success(result.data?.accepted ? t.invite_accepted : t.invite_declined);
      refreshAfterMembershipChange();
    },
    onError: () => toast.error(t.errors.default),
  });

  const removeMutation = useMutation({
    mutationFn: (input: { userId: number; leaving: boolean }) =>
      removeCollaboratorAction(projectId, input.userId),
    onSuccess: (result, input) => {
      if (!result.success) {
        toast.error(errorMessage(result.message));
        return;
      }
      toast.success(input.leaving ? t.left_project : t.member_removed);
      refreshAfterMembershipChange();
    },
    onError: () => toast.error(t.errors.default),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center rounded-2xl border border-border bg-background p-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!team) return null;

  const owner = team.members.find((m) => m.role === "owner");
  const collaboratorCount = team.members.length - 1 + team.pendingInvitations.length;
  const canInviteMore = collaboratorCount < team.maxCollaborators;
  const myId = team.viewerRole === "collaborator" ? team.viewerId : null;

  const handleInvite = (event: FormEvent) => {
    event.preventDefault();
    const target = username.trim();
    if (!target || inviteMutation.isPending) return;
    inviteMutation.mutate(target);
  };

  // A team section with only the owner is noise for visitors; the owner still sees it to invite.
  if (team.members.length === 1 && team.viewerRole === "none") return null;

  const suggestionList =
    suggestions?.success && suggestions.data
      ? suggestions.data.users.filter(
          (u: { id: number }) =>
            !team.members.some((m) => m.user.id === u.id) &&
            !team.pendingInvitations.some((p) => p.user.id === u.id)
        )
      : [];

  return (
    <div
      data-testid="project-team-section"
      className="space-y-5 rounded-2xl border border-border bg-background p-5 shadow-sm md:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">{t.title}</h3>
        </div>
        {isOwner && (
          <span className="text-xs text-muted-foreground">
            {t.limit
              .replace("{count}", String(collaboratorCount))
              .replace("{max}", String(team.maxCollaborators))}
          </span>
        )}
      </div>

      {team.viewerRole === "invited" && owner && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">
            {t.invited_banner.replace("{name}", displayName(owner.user))}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              data-testid="team-invite-accept"
              disabled={respondMutation.isPending}
              onClick={() => respondMutation.mutate(true)}
            >
              {t.accept}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={respondMutation.isPending}
              onClick={() => respondMutation.mutate(false)}
            >
              {t.decline}
            </Button>
          </div>
        </div>
      )}

      <ul className="grid gap-3 md:grid-cols-2">
        {team.members.map((member) => (
          <li
            key={member.user.id}
            data-testid={`team-member-${member.user.username}`}
            className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/40 p-3"
          >
            <Link href={`/${member.user.username}`} className="shrink-0">
              <MemberAvatar user={member.user} />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/${member.user.username}`}
                  className="truncate font-semibold text-foreground hover:text-primary"
                >
                  {displayName(member.user)}
                </Link>
                <Badge variant="secondary" className="text-[10px]">
                  {member.role === "owner" ? t.owner_label : t.collaborator_label}
                </Badge>
              </div>
              <MemberStats member={member} visibility={visibility} t={t} />
            </div>
            {isOwner && member.role === "collaborator" && (
              <button
                type="button"
                className="cursor-pointer rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title={t.remove_member}
                disabled={removeMutation.isPending}
                onClick={() => {
                  if (window.confirm(t.remove_confirm.replace("{name}", displayName(member.user)))) {
                    removeMutation.mutate({ userId: member.user.id, leaving: false });
                  }
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {team.viewerRole === "collaborator" && myId !== null && (
        <Button
          variant="ghost"
          size="sm"
          data-testid="team-leave-button"
          className="text-muted-foreground hover:text-destructive"
          disabled={removeMutation.isPending}
          onClick={() => {
            if (window.confirm(t.leave_confirm)) {
              removeMutation.mutate({ userId: myId, leaving: true });
            }
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t.leave_project}
        </Button>
      )}

      {isOwner && (
        <div className="space-y-4 border-t border-border/50 pt-4">
          {team.pendingInvitations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.pending_title}
              </p>
              <ul className="space-y-2">
                {team.pendingInvitations.map((invitation) => (
                  <li
                    key={invitation.user.id}
                    data-testid={`team-pending-${invitation.user.username}`}
                    className="flex items-center gap-3"
                  >
                    <MemberAvatar user={invitation.user} className="h-7 w-7" />
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      @{invitation.user.username}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={removeMutation.isPending}
                      onClick={() =>
                        removeMutation.mutate({ userId: invitation.user.id, leaving: false })
                      }
                    >
                      {t.cancel_invite}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canInviteMore && (
            <form onSubmit={handleInvite} className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor={`invite-${projectId}`}>
                {t.invite_title}
              </label>
              <div className="relative flex gap-2">
                <Input
                  id={`invite-${projectId}`}
                  data-testid="team-invite-input"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={t.invite_placeholder}
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  data-testid="team-invite-submit"
                  disabled={!username.trim() || inviteMutation.isPending}
                >
                  {inviteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">{t.invite_button}</span>
                </Button>

                {suggestionList.length > 0 && username.trim().length >= 2 && (
                  <ul className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
                    {suggestionList.map(
                      (user: { id: number; name: string | null; username: string | null; image: string | null }) => (
                        <li key={user.id}>
                          <button
                            type="button"
                            className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-muted"
                            onClick={() => inviteMutation.mutate(user.username ?? "")}
                          >
                            <MemberAvatar user={user} className="h-7 w-7" />
                            <span className="min-w-0 truncate text-sm">
                              <span className="font-medium text-foreground">{displayName(user)}</span>{" "}
                              <span className="text-muted-foreground">@{user.username}</span>
                            </span>
                          </button>
                        </li>
                      )
                    )}
                  </ul>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t.invite_help}</p>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

type TeamDict = ReturnType<typeof useTranslation>["dict"]["project"]["team"];

function MemberStats({
  member,
  visibility,
  t,
}: {
  member: TeamMember;
  visibility?: string;
  t: TeamDict;
}) {
  if (!member.stats) {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        {visibility === "private" ? t.stats_private : t.no_stats}
      </p>
    );
  }

  const { commitsCount, linesAdded, linesDeleted, activeDays } = member.stats;

  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span>{t.commits.replace("{count}", formatNumber(commitsCount))}</span>
      <span>
        {t.lines
          .replace("{added}", formatNumber(linesAdded))
          .replace("{deleted}", formatNumber(linesDeleted))}
      </span>
      <span>{t.active_days.replace("{count}", formatNumber(activeDays))}</span>
    </div>
  );
}
