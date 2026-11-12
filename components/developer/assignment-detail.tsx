"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionCard } from "@/components/shared/section-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRequiredAuth } from "@/lib/auth-store";
import { formatCurrency, formatDate, formatShortDate } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { AssignmentStatus } from "@/lib/portal-types";
import { toast } from "sonner";

export function AssignmentDetailPage({ assignmentId }: { assignmentId: string }) {
  const { user, can } = useRequiredAuth();
  const {
    assignments,
    updateAssignment,
    addWorkSubmission,
    workSubmissions,
    messages,
    threads,
    sendMessage,
    milestones,
    tasks,
    requestExtension,
  } = useWorkspaceStore();

  const assignment = assignments.find(
    (a) => a.id === assignmentId && a.developerId === user.developerId
  );
  const versions = workSubmissions
    .filter((w) => w.assignmentId === assignmentId)
    .sort((a, b) => b.version - a.version);
  const thread = threads.find((t) => t.assignmentId === assignmentId);
  const threadMessages = messages.filter((m) => m.threadId === thread?.id);
  const linkedMilestone =
    assignment?.projectId === "p1"
      ? milestones.find((m) => m.id === "m1")
      : milestones.find(
          (m) =>
            m.projectId === assignment?.projectId && m.status !== "completed"
        );
  const myProjectTasks = tasks.filter(
    (t) =>
      t.projectId === assignment?.projectId &&
      !t.parentId &&
      t.assigneeId === user.developerId
  );

  const [title, setTitle] = useState("Work submission");
  const [description, setDescription] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [deployUrl, setDeployUrl] = useState("");
  const [msg, setMsg] = useState("");
  const [extensionOpen, setExtensionOpen] = useState(false);
  const [extensionDate, setExtensionDate] = useState("");
  const [extensionReason, setExtensionReason] = useState("");

  if (!assignment) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-20 text-center">
        <p className="font-semibold">Assignment unavailable</p>
        <Button className="mt-4" render={<Link href="/developer/my-tasks" />} nativeButton={false}>
          Back
        </Button>
      </div>
    );
  }

  const awaitingConfirmation = assignment.status === "pending_confirmation";
  const workAllowed = !awaitingConfirmation;

  function submitWork() {
    if (!can("submit_work")) {
      toast.error("You cannot submit work in this role");
      return;
    }
    if (!workAllowed) {
      toast.error("Waiting for admin confirmation");
      return;
    }
    if (!description.trim()) {
      toast.error("Add a submission description");
      return;
    }
    addWorkSubmission({
      assignmentId: assignment!.id,
      projectId: assignment!.projectId,
      title: title.trim() || "Work submission",
      description: description.trim(),
      repoUrl: repoUrl || undefined,
      deployUrl: deployUrl || undefined,
      files: ["deliverable-notes.md"],
      screenshots: [],
      submittedBy: user.name,
      status: "submitted",
      requiresClientApproval: Boolean(assignment!.projectId),
      milestoneId: linkedMilestone?.id,
    });
    toast.success("Submission created", {
      description: "Immutable version saved. Previous versions are preserved.",
    });
    setDescription("");
  }

  return (
    <div className="flex flex-col gap-5">
      {awaitingConfirmation ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Waiting for admin confirmation</p>
          <p className="mt-1 text-amber-800">
            Status updates and work submissions stay disabled until an administrator
            confirms this assignment.
          </p>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card px-5 py-5">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-2"
          render={<Link href="/developer/my-tasks" />}
          nativeButton={false}
        >
          <ArrowLeft data-icon="inline-start" />
          My Assignments
        </Button>
        <h1 className="text-xl font-semibold">{assignment.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {assignment.projectId ? (
            <Link
              href={`/developer/projects/${assignment.projectId}`}
              className="font-medium text-primary hover:underline"
            >
              {assignment.projectName ?? "Project"}
            </Link>
          ) : (
            "Independent"
          )}{" "}
          · {formatCurrency(assignment.budget, assignment.currency)} ·{" "}
          {formatDate(assignment.startDate)} – {formatDate(assignment.deadline)}
          {linkedMilestone
            ? ` · Milestone: ${linkedMilestone.title}`
            : null}
        </p>
        <div className="mt-4">
          <Progress value={assignment.progress} />
        </div>
        {assignment.projectId ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              render={<Link href={`/developer/projects/${assignment.projectId}`} />}
              nativeButton={false}
            >
              Open project timeline
            </Button>
            {myProjectTasks.length > 0 ? (
              <Button
                size="sm"
                variant="ghost"
                render={
                  <Link
                    href={`/developer/projects/${assignment.projectId}`}
                  />
                }
                nativeButton={false}
              >
                {myProjectTasks.length} project task
                {myProjectTasks.length === 1 ? "" : "s"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <Tabs defaultValue="overview">
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <SectionCard title="Status">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  "not_started",
                  "in_progress",
                  "submitted",
                  "revision_requested",
                ] as AssignmentStatus[]
              ).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={assignment.status === status ? "secondary" : "outline"}
                  disabled={!workAllowed}
                  onClick={() => {
                    updateAssignment(assignment.id, { status });
                    toast.success("Status updated");
                  }}
                >
                  {status.replace("_", " ")}
                </Button>
              ))}
            </div>
            <div className="mt-4">
              <label className="text-xs font-medium">Progress</label>
              <Input
                type="number"
                min={0}
                max={100}
                className="mt-1 max-w-32"
                value={assignment.progress}
                disabled={!workAllowed}
                onChange={(e) =>
                  updateAssignment(assignment.id, {
                    progress: Number(e.target.value),
                  })
                }
              />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="requirements" className="mt-4">
          <SectionCard title="Requirements">
            <p className="text-sm text-muted-foreground">{assignment.requirements}</p>
          </SectionCard>
        </TabsContent>

        <TabsContent value="checklist" className="mt-4">
          <SectionCard title="Tasks & checklist">
            <ul className="flex flex-col gap-2">
              {assignment.checklist.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={item.done}
                    disabled={!workAllowed}
                    onCheckedChange={(checked) => {
                      updateAssignment(assignment.id, {
                        checklist: assignment.checklist.map((c) =>
                          c.id === item.id ? { ...c, done: checked } : c
                        ),
                      });
                    }}
                  />
                  <span className="text-sm">{item.label}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <SectionCard title="Messages with PM">
            <div className="flex flex-col gap-3">
              {threadMessages.map((m) => (
                <div key={m.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <p className="text-xs font-medium">
                    {m.authorName} · {formatShortDate(m.createdAt)}
                  </p>
                  <p className="mt-1 text-muted-foreground">{m.body}</p>
                </div>
              ))}
              <Textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Ask the project manager..."
              />
              <Button
                size="sm"
                className="w-fit"
                disabled={!thread || !msg.trim()}
                onClick={() => {
                  if (!thread) return;
                  sendMessage({
                    threadId: thread.id,
                    assignmentId: assignment.id,
                    projectId: assignment.projectId,
                    authorId: user.id,
                    authorName: user.name,
                    body: msg.trim(),
                    visibility: "developer",
                  });
                  setMsg("");
                  toast.success("Message sent");
                }}
              >
                Send
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="submissions" className="mt-4">
          <SectionCard title="Create submission">
            <div className="flex flex-col gap-3">
              {!workAllowed ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Submit is disabled until admin confirms this assignment.
                </p>
              ) : null}
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                disabled={!workAllowed}
              />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description / testing evidence"
                disabled={!workAllowed}
              />
              <Input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="Repository URL"
                disabled={!workAllowed}
              />
              <Input
                value={deployUrl}
                onChange={(e) => setDeployUrl(e.target.value)}
                placeholder="Deployment URL"
                disabled={!workAllowed}
              />
              <Button
                className="w-fit"
                onClick={submitWork}
                disabled={!workAllowed}
              >
                Submit version
              </Button>
              <p className="text-xs text-muted-foreground">
                Uploads keep local metadata only. Submissions create a new immutable version.
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Version history" className="mt-4" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {versions.map((v) => (
                <li key={v.id} className="px-5 py-3">
                  <p className="text-sm font-medium">
                    v{v.version} · {v.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {v.status}
                    {v.clientApprovalStatus === "revision_requested"
                      ? ` · revision: ${v.revisionNotes ?? ""}`
                      : ""}
                  </p>
                </li>
              ))}
              {versions.length === 0 ? (
                <li className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No submissions yet.
                </li>
              ) : null}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <SectionCard title="Activity">
            <p className="text-sm text-muted-foreground">
              Status changes and submissions appear in the shared workspace activity feed.
            </p>
            {assignment.extensionRequest ? (
              <p className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Extension request ({assignment.extensionRequest.status}):{" "}
                {formatDate(assignment.extensionRequest.requestedDeadline)} —{" "}
                {assignment.extensionRequest.reason}
              </p>
            ) : null}
            <Button
              className="mt-3"
              size="sm"
              variant="outline"
              disabled={!workAllowed}
              onClick={() => {
                setExtensionDate(assignment.deadline);
                setExtensionReason("");
                setExtensionOpen(true);
              }}
            >
              Request deadline extension
            </Button>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <Dialog open={extensionOpen} onOpenChange={setExtensionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request deadline extension</DialogTitle>
            <DialogDescription>
              Propose a new deadline and reason. An administrator must authorize the change.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium">Requested deadline</label>
              <Input
                className="mt-1"
                type="date"
                value={extensionDate}
                onChange={(e) => setExtensionDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium">Reason</label>
              <Textarea
                className="mt-1"
                value={extensionReason}
                onChange={(e) => setExtensionReason(e.target.value)}
                placeholder="Why do you need more time?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtensionOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!extensionDate || !extensionReason.trim()) {
                  toast.error("Provide a date and reason");
                  return;
                }
                requestExtension(
                  assignment.id,
                  extensionDate,
                  extensionReason.trim()
                );
                setExtensionOpen(false);
                toast.success("Extension request sent", {
                  description: "Admin must authorize deadline changes.",
                });
              }}
            >
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
