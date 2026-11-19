"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { listApiMessagingRecipients } from "@/lib/api/workspace-api";
import { useRequiredAuth } from "@/lib/auth-store";
import { isApiDataSource } from "@/lib/data-source";
import { formatShortDate } from "@/lib/format";
import type {
  MessageThread,
  MessagingRecipient,
  PortalKind,
} from "@/lib/portal-types";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { toast } from "sonner";

const POLL_MS = 6000;

type MessagingPortal = Extract<PortalKind, "admin" | "client" | "developer">;

const DESCRIPTIONS: Record<MessagingPortal, string> = {
  admin: "Client, developer, and internal conversations for this workspace.",
  client: "Conversations with your project team. Internal chats stay private.",
  developer: "Assignment and project conversations with your PM team.",
};

function threadPreview(thread: MessageThread) {
  if (thread.lastMessagePreview?.trim()) return thread.lastMessagePreview;
  return thread.projectName || "No messages yet";
}

function recipientLabel(r: MessagingRecipient) {
  const kind =
    r.kind === "admin"
      ? r.role?.replace(/_/g, " ") ?? "admin"
      : r.kind;
  return `${r.name} · ${kind}`;
}

export function MessagingInbox({ portal }: { portal: MessagingPortal }) {
  const { user } = useRequiredAuth();
  const {
    workspaceId,
    threads,
    messages,
    projects,
    sendMessage,
    createThread,
    markThreadRead,
    refreshThreads,
    loadThreadMessages,
  } = useWorkspaceStore();

  const visibleThreads = useMemo(() => {
    if (portal === "admin") return threads;
    if (portal === "client") {
      return threads.filter((t) => t.visibility === "client");
    }
    return threads.filter((t) => t.visibility === "developer");
  }, [portal, threads]);

  const [activeId, setActiveId] = useState("");
  const [body, setBody] = useState("");
  const [composerBusy, setComposerBusy] = useState(false);

  const [newOpen, setNewOpen] = useState(false);
  const [recipients, setRecipients] = useState<MessagingRecipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [subject, setSubject] = useState("");
  const [firstBody, setFirstBody] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!activeId && visibleThreads[0]?.id) {
      setActiveId(visibleThreads[0].id);
    } else if (
      activeId &&
      visibleThreads.length > 0 &&
      !visibleThreads.some((t) => t.id === activeId)
    ) {
      setActiveId(visibleThreads[0].id);
    }
  }, [activeId, visibleThreads]);

  const active = visibleThreads.find((t) => t.id === activeId);

  const threadMessages = useMemo(
    () =>
      messages
        .filter((m) => m.threadId === activeId)
        .slice()
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),
    [messages, activeId]
  );

  const selectThread = useCallback(
    (threadId: string) => {
      setActiveId(threadId);
      markThreadRead(threadId);
      void loadThreadMessages(threadId);
    },
    [loadThreadMessages, markThreadRead]
  );

  useEffect(() => {
    if (!activeId) return;
    markThreadRead(activeId);
    void loadThreadMessages(activeId);
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps -- run on thread change only

  useEffect(() => {
    if (!isApiDataSource() || !workspaceId) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled || document.visibilityState === "hidden") return;
      await refreshThreads();
      if (activeId && !cancelled) await loadThreadMessages(activeId);
    };

    const id = window.setInterval(() => {
      void tick();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [workspaceId, activeId, refreshThreads, loadThreadMessages]);

  useEffect(() => {
    if (!newOpen || !workspaceId) return;
    let cancelled = false;
    setRecipientsLoading(true);
    void (async () => {
      try {
        if (isApiDataSource()) {
          const rows = await listApiMessagingRecipients(workspaceId);
          if (!cancelled) setRecipients(rows);
        } else {
          if (!cancelled) setRecipients([]);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Failed to load recipients"
          );
        }
      } finally {
        if (!cancelled) setRecipientsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [newOpen, workspaceId]);

  const projectOptions = useMemo(() => {
    if (portal === "admin") return projects;
    if (portal === "client") {
      return projects.filter((p) => p.clientId === user.clientId);
    }
    return projects;
  }, [portal, projects, user.clientId]);

  const selectedRecipient = recipients.find((r) => r.id === recipientId);

  const inferredVisibility = useMemo(() => {
    if (portal === "client") return "client" as const;
    if (portal === "developer") return "developer" as const;
    if (selectedRecipient?.kind === "client") return "client" as const;
    if (selectedRecipient?.kind === "developer") return "developer" as const;
    return "internal" as const;
  }, [portal, selectedRecipient?.kind]);

  async function handleCreateConversation() {
    if (!recipientId || !firstBody.trim()) {
      toast.error("Choose a recipient and write the first message");
      return;
    }
    setCreating(true);
    try {
      const id = await createThread({
        subject: subject.trim() || undefined,
        visibility: inferredVisibility,
        projectId: projectId || null,
        recipientProfileId: recipientId,
        body: firstBody.trim(),
      });
      setNewOpen(false);
      setRecipientId("");
      setProjectId("");
      setSubject("");
      setFirstBody("");
      setActiveId(id);
      toast.success("Conversation started");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not start conversation"
      );
    } finally {
      setCreating(false);
    }
  }

  function handleSend() {
    if (!active || !body.trim() || composerBusy) return;
    setComposerBusy(true);
    try {
      sendMessage({
        threadId: active.id,
        projectId: active.projectId,
        assignmentId: active.assignmentId,
        authorId: user.id,
        authorName: user.name,
        body: body.trim(),
        visibility: active.visibility,
      });
      setBody("");
      toast.success("Message sent");
    } finally {
      setComposerBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Messages"
        description={DESCRIPTIONS[portal]}
        actions={
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="size-4" />
            New conversation
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <SectionCard title="Conversations" bodyClassName="p-0">
          {visibleThreads.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No conversations yet. Start one to message your team.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visibleThreads.map((thread) => (
                <li key={thread.id}>
                  <button
                    type="button"
                    className={`w-full px-4 py-3 text-left hover:bg-muted/50 ${
                      activeId === thread.id ? "bg-muted/60" : ""
                    }`}
                    onClick={() => selectThread(thread.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug">
                        {thread.subject}
                      </p>
                      {thread.unreadCount > 0 ? (
                        <span className="shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                          {thread.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {threadPreview(thread)}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {thread.projectName
                        ? `${thread.projectName} · `
                        : ""}
                      {formatShortDate(thread.lastMessageAt)}
                      {portal === "admin" ? ` · ${thread.visibility}` : ""}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={active?.subject ?? "Select a conversation"}>
          <div className="flex min-h-80 flex-col gap-3">
            {!active ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Select a conversation or start a new one.
              </p>
            ) : (
              <>
                <div className="flex max-h-96 flex-col gap-2 overflow-y-auto rounded-lg border border-border p-3">
                  {threadMessages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No messages in this thread yet.
                    </p>
                  ) : (
                    threadMessages.map((m) => {
                      const mine = m.authorId === user.id;
                      return (
                        <div
                          key={m.id}
                          className={`max-w-[85%] rounded-lg border border-border px-3 py-2 ${
                            mine ? "ml-auto bg-muted/40" : "bg-background"
                          }`}
                        >
                          <p className="text-xs font-medium">
                            {m.authorName}{" "}
                            <span className="font-normal text-muted-foreground">
                              · {formatShortDate(m.createdAt)}
                            </span>
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                            {m.body}
                          </p>
                          {m.attachmentName ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Attachment: {m.attachmentName}
                            </p>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write a message..."
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={!body.trim() || composerBusy}
                    onClick={handleSend}
                  >
                    Send
                  </Button>
                </div>
              </>
            )}
          </div>
        </SectionCard>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>New conversation</DialogTitle>
            <DialogDescription>
              Pick a recipient and send the first message. Matching existing
              chats are reused.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Recipient</label>
              <select
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={recipientId}
                disabled={recipientsLoading}
                onChange={(e) => setRecipientId(e.target.value)}
              >
                <option value="">
                  {recipientsLoading ? "Loading…" : "Select recipient"}
                </option>
                {recipients.map((r) => (
                  <option key={r.id} value={r.id}>
                    {recipientLabel(r)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Project (optional)</label>
              <select
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">No project</option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Subject (optional)</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Conversation subject"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">First message</label>
              <Textarea
                value={firstBody}
                onChange={(e) => setFirstBody(e.target.value)}
                placeholder="Write the opening message..."
                rows={4}
              />
            </div>
            {portal === "admin" ? (
              <p className="text-xs text-muted-foreground">
                Visibility will be set to{" "}
                <span className="font-medium">{inferredVisibility}</span> based
                on the recipient.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              disabled={creating || !recipientId || !firstBody.trim()}
              onClick={() => void handleCreateConversation()}
            >
              {creating ? "Starting…" : "Start conversation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
