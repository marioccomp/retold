"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useTranslation } from "@/src/i18n/client"
import { createComment, deleteComment, getProjectComments } from "@/src/domains/project/actions/comment.actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { MessageCircle, Trash2, Reply, Send } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR, enUS } from "date-fns/locale"
import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"

interface CommentSectionProps {
    projectId: number
}

export function CommentSection({ projectId }: CommentSectionProps) {
    const { dict, lang } = useTranslation()
    const t = dict.project.comments
    const { data: session } = useSession()
    const queryClient = useQueryClient()
    const [comments, setComments] = useState<any[]>([])

    const [newComment, setNewComment] = useState("")
    const MAX_CHARS = 500
    const [submittingId, setSubmittingId] = useState<number | null>(null) // null for idle, 0 for main, id for reply
    const [replyTo, setReplyTo] = useState<number | null>(null)
    const [replyToContent, setReplyToContent] = useState("")

    const totalComments = comments.reduce((acc, comment) => {
        return acc + 1 + (comment.replies?.length || 0)
    }, 0)

    const dateLocale = lang === "pt" ? ptBR : enUS

    useEffect(() => {
        const fetchComments = async () => {
            const data = await getProjectComments(projectId)
            setComments(data)
        }
        fetchComments()
    }, [projectId])

    const handleSubmit = async (parentId?: number) => {
        const content = parentId ? replyToContent : newComment
        if (!content.trim()) return

        setSubmittingId(parentId ?? 0)
        const result = await createComment(projectId, content, parentId)
        setSubmittingId(null)

        if (result.success) {
            toast.success(t.success_create)
            setNewComment("")
            setReplyTo(null)
            setReplyToContent("")
            // Refresh comments
            const data = await getProjectComments(projectId)
            setComments(data)
            
            // Invalidate project caches to update comment counts everywhere
            queryClient.invalidateQueries({ queryKey: ["feed-projects"] })
            queryClient.invalidateQueries({ queryKey: ["highlighted-project"] })
            queryClient.invalidateQueries({ queryKey: ["profile"] })
        } else {

            toast.error(result.message || t.error_create)
        }
    }

    const handleDelete = async (commentId: number) => {
        const result = await deleteComment(commentId, projectId)
        if (result.success) {
            toast.success(t.success_delete)
            const data = await getProjectComments(projectId)
            setComments(data)

            // Invalidate project caches to update comment counts everywhere
            queryClient.invalidateQueries({ queryKey: ["feed-projects"] })
            queryClient.invalidateQueries({ queryKey: ["highlighted-project"] })
            queryClient.invalidateQueries({ queryKey: ["profile"] })
        } else {

            toast.error(t.error_delete)
        }
    }

    return (
        <div className="space-y-6 mt-8 border-t border-border/50 pt-8">
            <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
                <span className="text-sm font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {totalComments}
                </span>
            </div>

            {session ? (
                <div className="flex gap-3">
                    <div className="shrink-0">
                        <Avatar className="w-10 h-10 border border-border/50 shadow-sm">
                            <AvatarImage src={session.user?.image || ""} />
                            <AvatarFallback>{session.user?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="flex-1 space-y-3 min-w-0">
                        <div className="relative">
                            <Textarea
                                placeholder={t.placeholder}
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value.slice(0, MAX_CHARS))}
                                className="min-h-[100px] w-full resize-none focus-visible:ring-primary shadow-sm bg-background/50 pr-4 pb-8"
                            />
                            <div className={`absolute bottom-2 right-3 text-[10px] font-bold transition-colors ${newComment.length >= MAX_CHARS ? 'text-destructive' : 'text-muted-foreground/50'}`}>
                                {newComment.length}/{MAX_CHARS}
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button
                                disabled={submittingId !== null || !newComment.trim()}
                                onClick={() => handleSubmit()}
                                className="gap-2 px-6 rounded-xl shadow-lg shadow-primary/10 cursor-pointer"
                            >
                                {submittingId === 0 ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        {t.submitting}
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        {t.submit}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-muted/30 rounded-2xl p-6 text-center border-2 border-dashed border-border/50 group hover:border-primary/20 transition-colors">
                    <p className="text-muted-foreground font-medium">{dict.auth.errors.unauthorized}</p>
                </div>
            )}

            <div className="space-y-6">
                {comments.length === 0 ? (
                    <div className="py-12 text-center opacity-60">
                        <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm font-medium">{t.empty}</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <CommentItem
                                comment={comment}
                                onDelete={() => handleDelete(comment.id)}
                                onReply={() => {
                                    setReplyTo(comment.id)
                                    setReplyToContent("")
                                }}
                                isReplying={replyTo === comment.id}
                                onCancelReply={() => setReplyTo(null)}
                                replyToContent={replyToContent}
                                setReplyToContent={setReplyToContent}
                                onReplySubmit={() => handleSubmit(comment.id)}
                                sessionUserId={Number(session?.user?.id)}
                                dateLocale={dateLocale}
                                t={t}
                                isSubmitting={submittingId === comment.id}
                                MAX_CHARS={MAX_CHARS}
                            />
                            {comment.replies && comment.replies.length > 0 && (
                                <div className="ml-5 mt-4 space-y-4 border-l-2 border-muted pl-3">
                                    {comment.replies.map((reply: any) => (
                                        <CommentItem
                                            key={reply.id}
                                            comment={reply}
                                            onDelete={() => handleDelete(reply.id)}
                                            sessionUserId={Number(session?.user?.id)}
                                            dateLocale={dateLocale}
                                            t={t}
                                            isReply
                                            isSubmitting={submittingId === reply.id}
                                            MAX_CHARS={MAX_CHARS}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

function CommentItem({
    comment,
    onDelete,
    onReply,
    isReplying,
    onCancelReply,
    replyToContent,
    setReplyToContent,
    onReplySubmit,
    sessionUserId,
    dateLocale,
    t,
    isReply,
    isSubmitting,
    MAX_CHARS
}: any) {
    const [isUserHovered, setIsUserHovered] = useState(false)

    return (
        <div className="flex gap-2 group">
            <Link 
                href={`/${comment.user.username}`} 
                className="shrink-0"
                onMouseEnter={() => setIsUserHovered(true)}
                onMouseLeave={() => setIsUserHovered(false)}
            >
                <Avatar className={`${isReply ? 'w-8 h-8' : 'w-10 h-10'} border border-border/50 shadow-sm transition-all active:scale-95 cursor-pointer hover:border-primary/50`}>
                    <AvatarImage src={comment.user.image} />
                    <AvatarFallback>{comment.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
            </Link>
            <div className="flex-1 space-y-0 min-w-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link 
                            href={`/${comment.user.username}`}
                            onMouseEnter={() => setIsUserHovered(true)}
                            onMouseLeave={() => setIsUserHovered(false)}
                        >
                            <span className={`font-bold text-sm transition-colors cursor-pointer ${isUserHovered ? 'text-primary' : 'text-foreground'}`}>
                                {comment.user.name}
                            </span>
                        </Link>
                        <span className="text-xs font-semibold text-muted-foreground/60">
                            • {formatDistanceToNow(new Date(comment.createdAt), {
                                addSuffix: true,
                                locale: dateLocale
                            })}
                        </span>
                    </div>
                    {sessionUserId === comment.userId && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 lg:opacity-0 group-hover:opacity-100 transition-all rounded-full cursor-pointer"
                            onClick={onDelete}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
                <div className="text-sm leading-relaxed text-foreground/90 break-all whitespace-pre-wrap overflow-hidden max-w-full pr-4">
                    {comment.content}
                </div>
                
                {!isReply && onReply && (
                    <div className="flex items-center gap-4 pl-2">
                        <button
                            onClick={onReply}
                            className="text-xs font-bold text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <Reply className="w-3 h-3" />
                            {t.reply}
                        </button>
                    </div>
                )}

                {isReplying && (
                    <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="relative">
                            <Textarea
                                placeholder={t.placeholder}
                                value={replyToContent}
                                onChange={(e) => setReplyToContent(e.target.value.slice(0, MAX_CHARS))}
                                className="min-h-[80px] w-full resize-none focus-visible:ring-primary bg-background/50 rounded-xl pr-4 pb-8"
                                autoFocus
                            />
                            <div className={`absolute bottom-2 right-3 text-[10px] font-bold transition-colors ${replyToContent.length >= MAX_CHARS ? 'text-destructive' : 'text-muted-foreground/50'}`}>
                                {replyToContent.length}/{MAX_CHARS}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={onCancelReply}
                                className="rounded-xl font-semibold cursor-pointer"
                            >
                                {t.cancel}
                            </Button>
                            <Button
                                size="sm"
                                disabled={isSubmitting || !replyToContent.trim()}
                                onClick={onReplySubmit}
                                className="rounded-xl px-4 font-bold shadow-md shadow-primary/10 gap-2 cursor-pointer"
                            >
                                {isSubmitting && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {t.submit}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
