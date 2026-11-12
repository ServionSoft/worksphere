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
  } = useWorkspaceStore();

  const assignment = assignments.find(
    (a) => a.id === assignmentId && a.developerId === user.developerId
  );
  const versions = workSubmissions
    .filter((w) => w.assignmentId === assignmentId)
    .sort((a, b) => b.version - a.version);
  const thread = threads.find((t) => t.assignmentId === assignmentId);
  const threadMessages = messages.filter((m) => m.threadId === thread?.id);

  const [title, setTitle] = useState("Work submission");
  const [description, setDescription] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [deployUrl, setDeployUrl] = useState("");
  const [msg, setMsg] = useState("");

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

  function submitWork() {
    if (!can("submit_work")) {
      toast.error("You cannot submit work in this role");
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
      clientApprovalStatus: assignment!.projectId ? "pending" : "not_required",
      milestoneId: assignment!.projectId === "p1" ? "m1" : undefined,
    });
    toast.success("Submission created", {
      description: "Immutable version saved. Previous versions are preserved.",
    });
    setDescription("");
  }

  return (
    <div className="flex flex-col gap-5">
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
          {assignment.projectName ?? "Independent"} ·{" "}
          {formatCurrency(assignment.budget, assignment.currency)} ·{" "}
          {formatDate(assignment.startDate)} – {formatDate(assignment.deadline)}
        </p>
        <div className="mt-4">
          <Progress value={assignment.progress} />
        </div>
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
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description / testing evidence"
              />
              <Input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="Repository URL"
              />
              <Input
                value={deployUrl}
                onChange={(e) => setDeployUrl(e.target.value)}
                placeholder="Deployment URL"
              />
              <Button
                className="w-fit"
                onClick={submitWork}
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
            <Button
              className="mt-3"
              size="sm"
              variant="outline"
              onClick={() =>
                toast.message("Extension request sent", {
                  description: "Admin must authorize deadline changes.",
                })
              }
            >
              Request deadline extension
            </Button>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
