"use client";

import { useState } from "react";
import {
  BadgeCheck,
  FolderKanban,
  MessageSquare,
  RefreshCw,
  Send,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/shared/section-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatRelativeTime, initials } from "@/lib/format";
import { currentUser } from "@/lib/mock-data";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { ActivityType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const iconMap: Record<
  ActivityType,
  { icon: typeof BadgeCheck; tone: string }
> = {
  approval: { icon: BadgeCheck, tone: "bg-amber-50 text-amber-700" },
  task_assigned: { icon: UserPlus, tone: "bg-indigo-50 text-indigo-600" },
  submission: { icon: Send, tone: "bg-sky-50 text-sky-700" },
  status_change: { icon: RefreshCw, tone: "bg-red-50 text-red-600" },
  comment: { icon: MessageSquare, tone: "bg-violet-50 text-violet-600" },
  project_update: {
    icon: FolderKanban,
    tone: "bg-emerald-50 text-emerald-700",
  },
};

interface ProjectActivityProps {
  projectId: string;
}

export function ProjectActivity({ projectId }: ProjectActivityProps) {
  const { activity, comments, addComment } = useWorkspaceStore();
  const [body, setBody] = useState("");

  const feed = activity.filter((a) => a.projectId === projectId);
  const projectComments = comments.filter((c) => c.projectId === projectId);

  function postComment() {
    if (!body.trim()) {
      toast.error("Write a comment first");
      return;
    }
    addComment({
      projectId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      body: body.trim(),
    });
    setBody("");
    toast.success("Comment posted");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard
        title="Discussion"
        description="Project comments and collaboration"
      >
        <div className="flex flex-col gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share an update or ask a question..."
            className="min-h-20"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={postComment}>
              Post comment
            </Button>
          </div>
        </div>

        <ul className="mt-4 flex flex-col gap-3">
          {projectComments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-lg border border-border px-3 py-3"
            >
              <div className="flex items-start gap-2.5">
                <Avatar className="size-7">
                  <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                    {initials(comment.authorName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{comment.authorName}</p>
                    <span className="text-[11px] text-muted-foreground">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {comment.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
          {projectComments.length === 0 ? (
            <li className="py-6 text-center text-sm text-muted-foreground">
              No comments yet.
            </li>
          ) : null}
        </ul>
      </SectionCard>

      <SectionCard
        title="Activity feed"
        description="Recent project events"
        bodyClassName="p-0"
      >
        <ul className="divide-y divide-border">
          {feed.map((item) => {
            const meta = iconMap[item.type];
            const Icon = meta.icon;
            return (
              <li key={item.id} className="flex gap-3 px-5 py-3.5">
                <span
                  className={cn(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                    meta.tone
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{item.title}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {item.actorName}
                  </p>
                </div>
              </li>
            );
          })}
          {feed.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">
              No activity for this project yet.
            </li>
          ) : null}
        </ul>
      </SectionCard>
    </div>
  );
}
