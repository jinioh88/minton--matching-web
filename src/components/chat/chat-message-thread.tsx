"use client";

import { Button } from "@/components/ui/button";
import {
  deleteChatMessage,
  getChatApiErrorMessage,
  getChatMessages,
  patchChatMessage,
  sendChatMessage,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import type {
  ChatMessagePageResponse,
  ChatMessageResponse,
  MatchChatNoticeResponse,
} from "@/types/chat";
import type { InfiniteData } from "@tanstack/react-query";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const MESSAGE_PAGE_SIZE = 30;
const MAX_CONTENT_LENGTH = 1000;
const EDIT_WINDOW_MS = 15 * 60 * 1000;
const LOAD_MORE_TOP_PX = 72;
/** Sprint 5 Phase 5: 상대방 신규 메시지 폴링 간격 (ms). 서버 부하 고려해 20초 권장. */
const POLL_INTERVAL_MS = 20_000;

function chatMessagesQueryKey(roomId: number) {
  return ["chat", "messages", roomId, MESSAGE_PAGE_SIZE] as const;
}

function chatPollQueryKey(roomId: number) {
  return ["chat", "messages", "poll", roomId] as const;
}

function isNearBottom(el: HTMLElement, thresholdPx = 140): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight < thresholdPx;
}

type MessagesInfinite = InfiniteData<ChatMessagePageResponse>;

function mergeMessages(
  pages: { messages: ChatMessageResponse[] }[]
): ChatMessageResponse[] {
  const map = new Map<number, ChatMessageResponse>();
  for (const p of pages) {
    for (const m of p.messages) {
      map.set(m.messageId, m);
    }
  }
  return [...map.values()].sort((a, b) => a.messageId - b.messageId);
}

function canEditByTime(m: ChatMessageResponse): boolean {
  const t = new Date(m.createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= EDIT_WINDOW_MS;
}

type ChatMessageThreadProps = {
  roomId: number;
  matchNotice: MatchChatNoticeResponse;
  className?: string;
};

export function ChatMessageThread({
  roomId,
  matchNotice,
  className,
}: ChatMessageThreadProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const composeTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const initialScrollDone = useRef(false);
  const focusComposeAfterSendRef = useRef(false);

  useEffect(() => {
    initialScrollDone.current = false;
  }, [roomId]);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [menuFor, setMenuFor] = useState<number | null>(null);

  const chatLocked =
    matchNotice.status === "FINISHED" ||
    matchNotice.status === "CANCELLED";

  const {
    data,
    isPending,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: chatMessagesQueryKey(roomId),
    queryFn: ({ pageParam }) =>
      getChatMessages(roomId, {
        cursor: pageParam,
        size: MESSAGE_PAGE_SIZE,
      }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.nextCursor != null ? lastPage.nextCursor : undefined,
  });

  const messages = useMemo(
    () => (data?.pages ? mergeMessages(data.pages) : []),
    [data?.pages]
  );

  const scrollToEnd = useCallback((behavior: ScrollBehavior = "smooth") => {
    endRef.current?.scrollIntoView({ block: "end", behavior });
  }, []);

  const focusComposeInput = useCallback(() => {
    requestAnimationFrame(() => {
      composeTextareaRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const maxMsgId = useMemo(
    () =>
      messages.length === 0
        ? 0
        : Math.max(...messages.map((m) => m.messageId)),
    [messages]
  );
  const maxMsgIdForPollRef = useRef(0);
  maxMsgIdForPollRef.current = maxMsgId;

  const canPollNewMessages =
    !chatLocked &&
    !isPending &&
    !isError &&
    maxMsgId > 0;

  const { data: pollSnapshot } = useQuery({
    queryKey: chatPollQueryKey(roomId),
    queryFn: async () => {
      const after = maxMsgIdForPollRef.current;
      if (after <= 0) {
        return { messages: [] as ChatMessageResponse[], nextCursor: null };
      }
      return getChatMessages(roomId, {
        afterId: after,
        size: MESSAGE_PAGE_SIZE,
      });
    },
    enabled: canPollNewMessages,
    refetchInterval: () =>
      typeof document !== "undefined" && document.hidden
        ? false
        : POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) {
        queryClient.invalidateQueries({
          queryKey: chatPollQueryKey(roomId),
        });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [roomId, queryClient]);

  useEffect(() => {
    if (!pollSnapshot?.messages?.length) return;
    const incoming = pollSnapshot.messages;
    const key = chatMessagesQueryKey(roomId);
    const prev = queryClient.getQueryData<MessagesInfinite>(key);
    if (!prev?.pages.length) return;

    const existing = new Set(
      prev.pages.flatMap((p) => p.messages.map((m) => m.messageId))
    );
    const toAdd = incoming.filter((m) => !existing.has(m.messageId));
    if (!toAdd.length) return;

    const el = scrollRef.current;
    const stickToBottom = el ? isNearBottom(el) : true;

    queryClient.setQueryData<MessagesInfinite>(key, (old) => {
      if (!old?.pages.length) return old;
      const pages = old.pages.map((p, i) =>
        i === 0
          ? {
              ...p,
              messages: [...p.messages, ...toAdd].sort(
                (a, b) => a.messageId - b.messageId
              ),
            }
          : p
      );
      return { ...old, pages };
    });

    queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });

    if (stickToBottom) {
      requestAnimationFrame(() => scrollToEnd("smooth"));
    }
  }, [pollSnapshot, roomId, queryClient, scrollToEnd]);

  const loadingOlderRef = useRef(false);

  /** 채팅방 진입 후·수정 취소 후 등 — 바로 입력 가능하도록 */
  useEffect(() => {
    if (isPending || isError || chatLocked || editingId != null) return;
    focusComposeInput();
  }, [
    isPending,
    isError,
    chatLocked,
    editingId,
    roomId,
    focusComposeInput,
  ]);

  /** 메시지 수정 모드일 때 수정란 포커스 */
  useEffect(() => {
    if (editingId == null) return;
    requestAnimationFrame(() => {
      editTextareaRef.current?.focus({ preventScroll: true });
    });
  }, [editingId]);

  useEffect(() => {
    if (isPending || isFetchingNextPage || messages.length === 0) return;
    if (!initialScrollDone.current) {
      initialScrollDone.current = true;
      requestAnimationFrame(() => scrollToEnd("auto"));
    }
  }, [isPending, isFetchingNextPage, messages.length, scrollToEnd]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasNextPage || isFetchingNextPage || loadingOlderRef.current)
      return;
    if (el.scrollTop <= LOAD_MORE_TOP_PX) {
      loadingOlderRef.current = true;
      const prevHeight = el.scrollHeight;
      fetchNextPage()
        .then(() => {
          requestAnimationFrame(() => {
            const node = scrollRef.current;
            if (node) {
              node.scrollTop = node.scrollHeight - prevHeight;
            }
          });
        })
        .finally(() => {
          loadingOlderRef.current = false;
        });
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const invalidateChatRoomMeta = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["chat", "room", roomId] });
    queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
  }, [queryClient, roomId]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      sendChatMessage(roomId, { content }),
    onSuccess: (newMsg) => {
      focusComposeAfterSendRef.current = true;
      setDraft("");
      const key = chatMessagesQueryKey(roomId);
      const prev = queryClient.getQueryData<MessagesInfinite>(key);
      if (!prev?.pages?.length) {
        queryClient.invalidateQueries({ queryKey: ["chat", "messages", roomId] });
      } else {
        queryClient.setQueryData<MessagesInfinite>(key, (old) => {
          if (!old?.pages.length) return old;
          const already = old.pages.some((p) =>
            p.messages.some((m) => m.messageId === newMsg.messageId)
          );
          if (already) return old;
          const pages = old.pages.map((p, i) =>
            i === 0
              ? {
                  ...p,
                  messages: [...p.messages, newMsg].sort(
                    (a, b) => a.messageId - b.messageId
                  ),
                }
              : p
          );
          return { ...old, pages };
        });
      }
      invalidateChatRoomMeta();
      requestAnimationFrame(() => scrollToEnd("smooth"));
    },
    onError: (err) => {
      toast.error(getChatApiErrorMessage(err));
    },
  });

  /** 전송 완료 후 입력창이 다시 활성화된 뒤 포커스 (disabled 해제 이후) */
  useEffect(() => {
    if (sendMutation.isPending) return;
    if (!focusComposeAfterSendRef.current) return;
    focusComposeAfterSendRef.current = false;
    if (chatLocked || editingId != null) return;
    focusComposeInput();
  }, [
    sendMutation.isPending,
    chatLocked,
    editingId,
    focusComposeInput,
  ]);

  const patchMutation = useMutation({
    mutationFn: ({
      messageId,
      content,
    }: {
      messageId: number;
      content: string;
    }) => patchChatMessage(roomId, messageId, { content }),
    onSuccess: (updated) => {
      setEditingId(null);
      setEditDraft("");
      setMenuFor(null);
      const key = chatMessagesQueryKey(roomId);
      queryClient.setQueryData<MessagesInfinite>(key, (old) => {
        if (!old?.pages.length) return old;
        const pages = old.pages.map((p) => ({
          ...p,
          messages: p.messages.map((m) =>
            m.messageId === updated.messageId ? updated : m
          ),
        }));
        return { ...old, pages };
      });
      invalidateChatRoomMeta();
    },
    onError: (err) => {
      toast.error(getChatApiErrorMessage(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId: number) =>
      deleteChatMessage(roomId, messageId),
    onSuccess: (_void, messageId) => {
      setMenuFor(null);
      const key = chatMessagesQueryKey(roomId);
      queryClient.setQueryData<MessagesInfinite>(key, (old) => {
        if (!old?.pages.length) return old;
        const pages = old.pages.map((p) => ({
          ...p,
          messages: p.messages.filter((m) => m.messageId !== messageId),
        }));
        return { ...old, pages };
      });
      invalidateChatRoomMeta();
    },
    onError: (err) => {
      toast.error(getChatApiErrorMessage(err));
    },
  });

  const trimmed = draft.trim();
  const canSend =
    !chatLocked &&
    trimmed.length > 0 &&
    trimmed.length <= MAX_CONTENT_LENGTH &&
    !sendMutation.isPending;

  const startEdit = (m: ChatMessageResponse) => {
    if (chatLocked || m.messageType !== "TEXT") return;
    setEditingId(m.messageId);
    setEditDraft(m.content ?? "");
    setMenuFor(null);
  };

  const submitSend = () => {
    if (!canSend) return;
    sendMutation.mutate(trimmed);
  };

  const submitEdit = () => {
    if (editingId == null) return;
    const t = editDraft.trim();
    if (!t || t.length > MAX_CONTENT_LENGTH) {
      toast.error(`메시지는 1~${MAX_CONTENT_LENGTH}자여야 합니다.`);
      return;
    }
    patchMutation.mutate({ messageId: editingId, content: t });
  };

  const onKeyDownCompose: React.KeyboardEventHandler<HTMLTextAreaElement> = (
    e
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editingId != null) {
        if (!patchMutation.isPending) submitEdit();
      } else {
        submitSend();
      }
    }
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-2 pb-2"
      >
        {isPending ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="py-10 text-center">
            <p className="text-sm text-destructive">
              {getChatApiErrorMessage(error)}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => refetch()}
            >
              다시 시도
            </Button>
          </div>
        ) : (
          <>
            {hasNextPage ? (
              <div className="mb-2 flex justify-center">
                {isFetchingNextPage ? (
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    이전 메시지 불러오는 중…
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    위로 스크롤하면 이전 대화를 불러옵니다
                  </span>
                )}
              </div>
            ) : null}

            {messages.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                아직 메시지가 없습니다. 첫 메시지를 남겨 보세요.
              </p>
            ) : (
              <ul className="flex flex-col gap-2 pb-2">
                {messages.map((m) => (
                  <MessageBubble
                    key={m.messageId}
                    message={m}
                    isOwn={user?.id === m.senderId}
                    chatLocked={chatLocked}
                    menuOpen={menuFor === m.messageId}
                    onMenuToggle={() =>
                      setMenuFor((id) =>
                        id === m.messageId ? null : m.messageId
                      )
                    }
                    onEdit={() => startEdit(m)}
                    onDelete={() => {
                      if (!window.confirm("이 메시지를 삭제할까요?")) return;
                      deleteMutation.mutate(m.messageId);
                    }}
                    deletePending={
                      deleteMutation.isPending &&
                      deleteMutation.variables === m.messageId
                    }
                  />
                ))}
              </ul>
            )}
            <div ref={endRef} className="h-px shrink-0" aria-hidden />
          </>
        )}
      </div>

      <div
        className="shrink-0 border-t bg-background px-3 py-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto max-w-lg">
          {chatLocked ? (
            <p className="py-2 text-center text-sm text-muted-foreground">
              {matchNotice.status === "CANCELLED"
                ? "취소된 모임이라 메시지를 보낼 수 없습니다."
                : "종료된 모임이라 메시지를 보낼 수 없습니다."}
            </p>
          ) : editingId != null ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">메시지 수정 (15분 이내만 가능)</p>
              <textarea
                ref={editTextareaRef}
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                onKeyDown={onKeyDownCompose}
                maxLength={MAX_CONTENT_LENGTH}
                rows={3}
                className={cn(
                  "w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
                disabled={patchMutation.isPending}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingId(null);
                    setEditDraft("");
                  }}
                  disabled={patchMutation.isPending}
                >
                  취소
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={submitEdit}
                  disabled={
                    patchMutation.isPending ||
                    !editDraft.trim() ||
                    editDraft.trim().length > MAX_CONTENT_LENGTH
                  }
                >
                  {patchMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "저장"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <textarea
                ref={composeTextareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDownCompose}
                placeholder="메시지 입력 (Enter로 전송, Shift+Enter 줄바꿈)"
                maxLength={MAX_CONTENT_LENGTH}
                rows={2}
                className={cn(
                  "min-h-[2.5rem] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
                disabled={sendMutation.isPending}
              />
              <Button
                type="button"
                size="icon"
                className="h-[2.75rem] w-[2.75rem] shrink-0 self-end"
                disabled={!canSend}
                onClick={submitSend}
                aria-label="전송"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
          {!chatLocked && editingId == null ? (
            <p className="mt-1 text-right text-[10px] text-muted-foreground">
              {trimmed.length}/{MAX_CONTENT_LENGTH}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type BubbleProps = {
  message: ChatMessageResponse;
  isOwn: boolean;
  chatLocked: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deletePending: boolean;
};

function MessageBubble({
  message: m,
  isOwn,
  chatLocked,
  menuOpen,
  onMenuToggle,
  onEdit,
  onDelete,
  deletePending,
}: BubbleProps) {
  if (m.messageType === "SYSTEM") {
    return (
      <li className="flex justify-center py-1">
        <span className="max-w-[90%] rounded-md bg-muted/60 px-3 py-1 text-center text-xs text-muted-foreground">
          {m.content ?? "시스템 메시지"}
        </span>
      </li>
    );
  }

  const showMenu =
    isOwn &&
    !chatLocked &&
    (m.messageType === "TEXT" || m.messageType === "IMAGE");
  const canEdit = m.messageType === "TEXT" && canEditByTime(m);

  const bubbleBody =
    m.messageType === "IMAGE" ? (
      m.content?.startsWith("http") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={m.content}
          alt=""
          className="max-h-48 max-w-full rounded-md object-contain"
        />
      ) : (
        <span
          className={cn(
            isOwn ? "text-primary-foreground/90" : "text-muted-foreground"
          )}
        >
          [이미지]
        </span>
      )
    ) : (
      <>
        {m.content ?? ""}
        {m.editedAt ? (
          <span
            className={cn(
              "mt-1 block text-[10px] opacity-70",
              isOwn ? "text-primary-foreground/80" : "text-muted-foreground"
            )}
          >
            수정됨
          </span>
        ) : null}
      </>
    );

  return (
    <li
      className={cn(
        "flex",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "relative max-w-[85%]",
          isOwn ? "items-end" : "items-start"
        )}
      >
        {!isOwn && (
          <p className="mb-0.5 px-1 text-[11px] text-muted-foreground">
            {m.senderNickname ?? "회원"}
          </p>
        )}
        <div className="flex items-end gap-1">
          <div
            className={cn(
              "rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
              isOwn
                ? "rounded-br-md bg-primary text-primary-foreground"
                : "rounded-bl-md bg-muted text-foreground"
            )}
          >
            {bubbleBody}
          </div>
          {showMenu ? (
            <div className="relative shrink-0">
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-expanded={menuOpen}
                aria-label="메시지 메뉴"
                onClick={(e) => {
                  e.stopPropagation();
                  onMenuToggle();
                }}
              >
                ⋮
              </button>
              {menuOpen ? (
                <div
                  className="absolute bottom-full right-0 z-50 mb-1 min-w-[7rem] rounded-md border bg-popover py-1 text-sm text-popover-foreground shadow-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  {m.messageType === "TEXT" ? (
                    <button
                      type="button"
                      className={cn(
                        "block w-full px-3 py-1.5 text-left hover:bg-muted",
                        !canEdit && "cursor-not-allowed opacity-40"
                      )}
                      disabled={!canEdit}
                      onClick={() => {
                        if (canEdit) onEdit();
                      }}
                    >
                      수정
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-destructive hover:bg-muted"
                    disabled={deletePending}
                    onClick={onDelete}
                  >
                    삭제
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
