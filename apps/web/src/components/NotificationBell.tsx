"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiBell, FiCheck, FiTrash2, FiX } from "react-icons/fi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "@/src/i18n/client";
import { getNotificationsAction, markAsReadAction, markAllAsReadAction, clearAllNotificationsAction, deleteNotificationAction } from "@/src/domains/notification/actions";
import { respondToInvitationAction } from "@/src/domains/project/actions/collaborators.actions";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";

type Notification = {
  id: number;
  type: "FOLLOW" | "LIKE" | "COMMENT" | "PROJECT_INVITE" | "PROJECT_INVITE_ACCEPTED";
  read: boolean;
  createdAt: Date;
  projectId: number | null;
  commentId: number | null;
  sourceUser: {
    id: number;
    name: string | null;
    username: string | null;
    image: string | null;
  };
  project: {
    id: number;
    title: string;
  } | null;
};

export function NotificationBell() {
  const { dict, lang } = useTranslation();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications
  const { data: response } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotificationsAction(),
    refetchInterval: 60000, // Poll every 60s
  });

  const notifications: Notification[] = (response?.data as any) || [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mark single notification as read
  const { mutate: markAsRead } = useMutation({
    mutationFn: (id: number) => markAsReadAction(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(["notifications"], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((n: Notification) =>
            n.id === id ? { ...n, read: true } : n
          ),
        };
      });
    },
  });

  // Mark all as read
  const { mutate: markAllAsRead } = useMutation({
    mutationFn: () => markAllAsReadAction(),
    onSuccess: () => {
      queryClient.setQueryData(["notifications"], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((n: Notification) => ({ ...n, read: true })),
        };
      });
    },
  });

  // Clear all notifications
  const { mutate: clearAll } = useMutation({
    mutationFn: () => clearAllNotificationsAction(),
    onSuccess: () => {
      queryClient.setQueryData(["notifications"], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: [],
        };
      });
    },
  });

  // Delete single notification
  const { mutate: deleteSingle } = useMutation({
    mutationFn: (id: number) => deleteNotificationAction(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(["notifications"], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.filter((n: Notification) => n.id !== id),
        };
      });
    },
  });

  // Accept / decline a project invitation straight from the dropdown
  const { mutate: respondToInvite, isPending: isRespondingToInvite } = useMutation({
    mutationFn: (input: { projectId: number; accept: boolean }) =>
      respondToInvitationAction(input.projectId, input.accept),
    onSuccess: (result, input) => {
      const team = dict.project.team;
      if (!result.success) {
        toast.error((team.errors as Record<string, string>)[result.message] ?? team.errors.default);
      } else {
        toast.success(result.data?.accepted ? team.invite_accepted : team.invite_declined);
      }
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["project-team", input.projectId] });
      queryClient.invalidateQueries({ queryKey: ["profile"], refetchType: "all" });
    },
    onError: () => toast.error(dict.project.team.errors.default),
  });

  const handleNotificationClick = (notification: Notification, linkHref: string) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    setIsOpen(false);
    router.push(linkHref);
  };

  const dateLocale = lang === "pt" ? ptBR : enUS;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full hover:bg-muted text-muted-foreground h-9 w-9 cursor-pointer focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 border-none select-none"
        >
          <FiBell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[calc(100vw-2rem)] sm:w-[380px] mt-2 p-0 rounded-xl border-border/50 bg-background/95 backdrop-blur-md shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="font-semibold text-sm">
            {dict.notifications?.title || "Notifications"}
          </span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-xs text-primary hover:bg-transparent hover:text-primary/80 cursor-pointer"
                onClick={() => markAllAsRead()}
                title={dict.notifications?.markAllAsRead || "Mark all as read"}
              >
                <FiCheck className="h-4 w-4" />
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-xs text-destructive hover:bg-transparent hover:text-destructive/80 cursor-pointer"
                onClick={() => clearAll()}
                title={dict.notifications?.clearAll || "Clear notifications"}
              >
                <FiTrash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="max-h-[260px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              {dict.notifications?.empty || "No notifications yet."}
            </div>
          ) : (
            notifications.map((notification) => {
              const { sourceUser, project, type, createdAt } = notification;

              let text = "";
              let linkHref = "";

              if (type === "FOLLOW") {
                text = dict.notifications?.follow?.replace("{{user}}", sourceUser.name || "") || `${sourceUser.name} started following you`;
                linkHref = `/${sourceUser.username}`;
              } else if (type === "LIKE") {
                text = dict.notifications?.like?.replace("{{user}}", sourceUser.name || "")?.replace("{{project}}", project?.title || "") || `${sourceUser.name} liked your project ${project?.title}`;
                linkHref = `/?project=${project?.id}`;
              } else if (type === "COMMENT") {
                text = dict.notifications?.comment?.replace("{{user}}", sourceUser.name || "")?.replace("{{project}}", project?.title || "") || `${sourceUser.name} commented on your project ${project?.title}`;
                linkHref = `/?project=${project?.id}`;
              } else if (type === "PROJECT_INVITE" || type === "PROJECT_INVITE_ACCEPTED") {
                linkHref = `/?project=${project?.id}`;
              }

              const typeLabel =
                type === "FOLLOW"
                  ? (dict.notifications?.types?.follow || "started following you")
                  : type === "LIKE"
                    ? (dict.notifications?.types?.like || "liked your project")
                    : type === "PROJECT_INVITE"
                      ? dict.notifications.types.project_invite
                      : type === "PROJECT_INVITE_ACCEPTED"
                        ? dict.notifications.types.project_invite_accepted
                        : (dict.notifications?.types?.comment || "commented on your project");

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={`group/item cursor-pointer px-4 py-3 rounded-none border-b border-border/20 last:border-0 focus:bg-muted focus:text-inherit transition-colors focus:ring-0 focus-visible:ring-0 outline-none ${
                    !notification.read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification, linkHref)}
                >
                  <div className="flex items-start gap-3 outline-none w-full relative">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={sourceUser.image || undefined} />
                      <AvatarFallback className="text-xs">
                        {sourceUser.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-1 min-w-0 flex-1 pr-16">
                      <p className="text-sm text-foreground leading-tight break-words">
                        <span className="font-medium mr-1">{sourceUser.name}</span>
                        <span className="text-muted-foreground mr-1">
                          {typeLabel}
                        </span>
                        {project && type !== "FOLLOW" && (
                          <span className="font-medium break-words">
                            {project.title}
                          </span>
                        )}
                      </p>
                      {type === "PROJECT_INVITE" && project && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            className="h-7 px-3 text-xs cursor-pointer"
                            disabled={isRespondingToInvite}
                            onClick={(e) => {
                              e.stopPropagation();
                              respondToInvite({ projectId: project.id, accept: true });
                            }}
                          >
                            {dict.notifications.accept}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-3 text-xs cursor-pointer"
                            disabled={isRespondingToInvite}
                            onClick={(e) => {
                              e.stopPropagation();
                              respondToInvite({ projectId: project.id, accept: false });
                            }}
                          >
                            {dict.notifications.decline}
                          </Button>
                        </div>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(createdAt), {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </span>
                    </div>
                    {/* Action buttons */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity flex items-center gap-1">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer rounded-full focus:ring-0 focus:outline-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          title={dict.notifications?.markAsRead || "Mark as read"}
                        >
                          <FiCheck size={14} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-full focus:ring-0 focus:outline-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSingle(notification.id);
                        }}
                        title={dict.notifications?.delete || "Delete"}
                      >
                        <FiX size={14} />
                      </Button>
                    </div>
                    {!notification.read && (
                      <span className="flex h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5 z-0" />
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
