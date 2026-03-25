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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";

type Notification = {
  id: number;
  type: "FOLLOW" | "LIKE" | "COMMENT";
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
          className="relative rounded-full hover:bg-muted text-muted-foreground h-9 w-9 cursor-pointer"
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
        className="w-80 mt-2 p-0 rounded-xl border-border/50 bg-background/95 backdrop-blur-md shadow-xl overflow-hidden"
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
              }

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={`group/item cursor-pointer px-4 py-3 rounded-none border-b border-border/20 last:border-0 focus:bg-muted transition-colors ${
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
                    <div className="flex flex-col gap-1 min-w-0 flex-1 pr-8">
                      <p className="text-sm text-foreground leading-tight">
                        <span className="font-medium mr-1">{sourceUser.name}</span>
                        <span className="text-muted-foreground mr-1">
                          {type === "FOLLOW" 
                            ? (dict.notifications?.types?.follow || "started following you") 
                            : type === "LIKE" 
                              ? (dict.notifications?.types?.like || "liked your project") 
                              : (dict.notifications?.types?.comment || "commented on your project")}
                        </span>
                        {project && type !== "FOLLOW" && (
                          <span className="font-medium truncate break-words">
                            {project.title}
                          </span>
                        )}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(createdAt), {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </span>
                    </div>
                    {/* Delete single notification button */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSingle(notification.id);
                        }}
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
