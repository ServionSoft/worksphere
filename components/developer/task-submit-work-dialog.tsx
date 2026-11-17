"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRequiredAuth } from "@/lib/auth-store";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { Task } from "@/lib/types";
import { toast } from "sonner";

export function TaskSubmitWorkDialog({
  task,
  open,
  onOpenChange,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, can } = useRequiredAuth();
  const { workSubmissions, addWorkSubmission } = useWorkspaceStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [testingNotes, setTestingNotes] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [deployUrl, setDeployUrl] = useState("");
  const [filesText, setFilesText] = useState("");

  const versions = useMemo(() => {
    if (!task) return [];
    return workSubmissions
      .filter((w) => w.taskId === task.id)
      .sort((a, b) => b.version - a.version);
  }, [workSubmissions, task]);

  const latest = versions[0];

  useEffect(() => {
    if (!open || !task) return;
    const nextVersion = (latest?.version ?? 0) + 1;
    setTitle(
      latest?.status === "rejected" ||
        latest?.clientApprovalStatus === "revision_requested"
        ? `${task.title} (v${nextVersion})`
        : task.title
    );
    setDescription("");
    setTestingNotes(latest?.revisionNotes ? `Addressing: ${latest.revisionNotes}` : "");
    setRepoUrl("");
    setDeployUrl("");
    setFilesText("");
  }, [open, task, latest]);

  function submit() {
    if (!task) return;
    if (!can("submit_work")) {
      toast.error("You cannot submit work in this role");
      return;
    }
    if (!description.trim()) {
      toast.error("Add a description of completed work");
      return;
    }
    const files = filesText
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    addWorkSubmission({
      taskId: task.id,
      projectId: task.projectId,
      milestoneId: task.milestoneId ?? undefined,
      title: title.trim() || task.title,
      description: description.trim(),
      testingNotes: testingNotes.trim() || undefined,
      repoUrl: repoUrl.trim() || undefined,
      deployUrl: deployUrl.trim() || undefined,
      files,
      screenshots: [],
      submittedBy: user.name,
      status: "submitted",
      requiresClientApproval: task.requiresClientApproval !== false,
    });
    toast.success("Submission created", {
      description: "Sent for internal review. Prior versions stay immutable.",
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Submit work</DialogTitle>
          <DialogDescription>
            {task
              ? `${task.title} · creates submission v${(latest?.version ?? 0) + 1}`
              : "Submit completed work for internal review"}
          </DialogDescription>
        </DialogHeader>

        {latest?.revisionNotes ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <p className="font-medium">Revision feedback</p>
            <p className="mt-1">{latest.revisionNotes}</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 py-1">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Submission title"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description of completed work (required)"
            className="min-h-24"
          />
          <Textarea
            value={testingNotes}
            onChange={(e) => setTestingNotes(e.target.value)}
            placeholder="Testing / completion notes"
            className="min-h-16"
          />
          <Input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="Repository URL (optional)"
          />
          <Input
            value={deployUrl}
            onChange={(e) => setDeployUrl(e.target.value)}
            placeholder="Deployment URL (optional)"
          />
          <Textarea
            value={filesText}
            onChange={(e) => setFilesText(e.target.value)}
            placeholder="File attachments as names/URLs (optional, one per line)"
            className="min-h-16"
          />
          <p className="text-[11px] text-muted-foreground">
            File names/URLs are stored as metadata. Binary upload storage is not
            wired yet.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Submit for review</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TaskSubmissionHistory({ taskId }: { taskId: string }) {
  const { workSubmissions } = useWorkspaceStore();
  const versions = workSubmissions
    .filter((w) => w.taskId === taskId)
    .sort((a, b) => b.version - a.version);

  if (versions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No submissions yet.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {versions.map((v) => (
        <li
          key={v.id}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          <p className="font-medium">
            v{v.version} · {v.title}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {v.status.replaceAll("_", " ")}
            {v.clientApprovalStatus === "revision_requested" ||
            v.revisionNotes
              ? ` · ${v.revisionNotes ?? "revision requested"}`
              : ""}
          </p>
          {v.repoUrl ? (
            <a
              href={v.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-[11px] text-primary hover:underline"
            >
              Repository
            </a>
          ) : null}
          {v.deployUrl ? (
            <a
              href={v.deployUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-[11px] text-primary hover:underline"
            >
              Deployment
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
