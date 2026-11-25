"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  approveApiProductionPlan,
  duplicateApiMilestone,
  fetchAiStatus,
  generateApiAllProjectTasks,
  generateApiMilestones,
  generateApiMilestoneTasks,
  reorderApiMilestones,
  reorderApiPlanTasks,
} from "@/lib/api/workspace-api";
import { isApiDataSource } from "@/lib/data-source";
import { demoId } from "@/lib/demo-clock";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { Milestone, Project, Task } from "@/lib/types";

type GenProgress = {
  label: string;
  detail?: string;
  tone?: "ok" | "warn" | "err";
} | null;

export function ProductionPlanStudio({ project }: { project: Project }) {
  const {
    milestones,
    tasks,
    workspace,
    setWorkspaceId,
    updateMilestone,
    deleteMilestone,
    addMilestone,
    addTask,
    updateTask,
    deleteTask,
  } = useWorkspaceStore();

  const [busy, setBusy] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<GenProgress>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const planMilestones = useMemo(
    () =>
      milestones
        .filter(
          (m) => m.projectId === project.id && m.planStatus !== "archived"
        )
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [milestones, project.id]
  );

  const selected =
    planMilestones.find((m) => m.id === selectedId) ?? planMilestones[0] ?? null;

  const selectedTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.milestoneId === selected?.id && !t.parentId)
        .sort((a, b) => a.order - b.order),
    [tasks, selected?.id]
  );

  const suggestedCount = planMilestones.filter(
    (m) => m.planStatus === "suggested"
  ).length;
  const planStatus = project.productionPlanStatus ?? "none";
  const milestonesWithoutTasks = planMilestones.filter(
    (m) => !tasks.some((t) => t.milestoneId === m.id && !t.parentId)
  ).length;

  async function refresh() {
    if (workspace?.id) setWorkspaceId(workspace.id);
  }

  async function ensureAi() {
    if (aiAvailable != null) return aiAvailable;
    try {
      const s = await fetchAiStatus();
      const ok =
        s.milestoneGeneration === "available" ||
        s.taskGeneration === "available";
      setAiAvailable(ok);
      return ok;
    } catch {
      setAiAvailable(false);
      return false;
    }
  }

  async function onGenerate(mode: "append" | "replace_unedited") {
    if (!workspace?.id || !isApiDataSource()) {
      toast.error("AI generate requires API mode");
      return;
    }
    if (!(await ensureAi())) {
      toast.error("AI unavailable — configure OPENAI_API_KEY on the API");
      return;
    }
    if (
      mode === "replace_unedited" &&
      !window.confirm(
        "Replace unedited AI milestones? Manually edited milestones are kept."
      )
    ) {
      return;
    }
    setBusy("generate");
    setProgress({ label: "Generating milestones…", tone: "ok" });
    try {
      const result = await generateApiMilestones(workspace.id, project.id, {
        mode,
        persist: true,
      });
      setProgress({
        label: `Milestones ready (${result.milestones?.length ?? 0})`,
        tone: "ok",
      });
      toast.success(
        mode === "append"
          ? `Added ${result.milestones?.length ?? 0} AI milestone(s)`
          : "Replaced unedited AI milestones"
      );
      await refresh();
    } catch (e) {
      setProgress({
        label: e instanceof Error ? e.message : "Generate failed",
        tone: "err",
      });
      toast.error(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setBusy(null);
    }
  }

  async function onReorder(id: string, dir: -1 | 1) {
    if (!workspace?.id || !isApiDataSource()) return;
    const ids = planMilestones.map((m) => m.id);
    const idx = ids.indexOf(id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= ids.length) return;
    const next = [...ids];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setBusy(`reorder-${id}`);
    try {
      await reorderApiMilestones(workspace.id, project.id, next);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reorder failed");
    } finally {
      setBusy(null);
    }
  }

  async function onDuplicate(id: string) {
    if (!workspace?.id || !isApiDataSource()) return;
    setBusy(`dup-${id}`);
    try {
      const copy = await duplicateApiMilestone(workspace.id, id);
      toast.success("Milestone duplicated");
      setSelectedId(copy.id);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Duplicate failed");
    } finally {
      setBusy(null);
    }
  }

  async function runGenerateTasks(
    milestoneId: string,
    mode: "skip_if_present" | "replace_unedited"
  ) {
    if (!workspace?.id || !isApiDataSource()) return;
    if (!(await ensureAi())) {
      toast.error("AI unavailable");
      return;
    }
    if (
      mode === "replace_unedited" &&
      !window.confirm(
        "Replace unedited AI tasks/subtasks for this milestone? Manual and edited tasks stay."
      )
    ) {
      return;
    }

    setBusy(`tasks-${milestoneId}`);
    setProgress({
      label:
        mode === "replace_unedited"
          ? "Regenerating unedited AI tasks…"
          : "Generating tasks with AI…",
      tone: "ok",
    });
    try {
      const result = await generateApiMilestoneTasks(
        workspace.id,
        milestoneId,
        { mode }
      );
      if (result.skipped) {
        setProgress({
          label: result.message ?? "Tasks already exist",
          detail: "Use Regenerate to replace unedited AI tasks.",
          tone: "warn",
        });
        toast.message("Skipped — AI tasks already exist", {
          description: "Confirm regenerate to replace unedited AI tasks.",
        });
        return;
      }
      setProgress({
        label: `Tasks generated (${result.createdCount ?? result.tasks?.length ?? 0})`,
        tone: "ok",
      });
      toast.success(
        `Generated ${result.createdCount ?? result.tasks?.length ?? 0} task row(s)`
      );
      await refresh();
    } catch (e) {
      setProgress({
        label: e instanceof Error ? e.message : "Task generate failed",
        tone: "err",
      });
      toast.error(e instanceof Error ? e.message : "Task generate failed");
    } finally {
      setBusy(null);
    }
  }

  async function onGenerateAllTasks(
    mode: "skip_if_present" | "replace_unedited"
  ) {
    if (!workspace?.id || !isApiDataSource()) return;
    if (!(await ensureAi())) {
      toast.error("AI unavailable");
      return;
    }
    if (!planMilestones.length) {
      toast.error("Add or generate milestones first");
      return;
    }
    if (
      mode === "replace_unedited" &&
      !window.confirm(
        "Generate/replace unedited AI tasks across ALL milestones? This does not approve the plan or publish anything."
      )
    ) {
      return;
    }
    if (
      mode === "skip_if_present" &&
      !window.confirm(
        "Generate AI tasks for every milestone that does not already have AI tasks? This does not approve or publish."
      )
    ) {
      return;
    }

    setBusy("generate-all-tasks");
    setProgress({
      label: `Generating tasks for ${planMilestones.length} milestone(s)…`,
      tone: "ok",
    });
    try {
      const result = await generateApiAllProjectTasks(
        workspace.id,
        project.id,
        { mode }
      );
      const errCount = result.failed;
      setProgress({
        label: `Done — generated ${result.generated}, skipped ${result.skipped}, failed ${result.failed}`,
        detail: "Plan was not approved and nothing was published.",
        tone: errCount ? "warn" : "ok",
      });
      toast.success("Generate All Tasks finished", {
        description: `${result.generated} generated · ${result.skipped} skipped · ${result.failed} failed`,
      });
      await refresh();
    } catch (e) {
      setProgress({
        label: e instanceof Error ? e.message : "Generate all failed",
        tone: "err",
      });
      toast.error(e instanceof Error ? e.message : "Generate all failed");
    } finally {
      setBusy(null);
    }
  }

  async function onApprovePlan() {
    if (!workspace?.id || !isApiDataSource()) return;
    if (milestonesWithoutTasks > 0) {
      const ok = window.confirm(
        `${milestonesWithoutTasks} milestone(s) have no tasks yet. Approve the production plan anyway?`
      );
      if (!ok) return;
    }
    setBusy("approve");
    try {
      const result = await approveApiProductionPlan(workspace.id, project.id);
      toast.success(
        `Production plan approved (v${result.project.productionPlanVersion ?? "?"})`
      );
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve plan failed");
    } finally {
      setBusy(null);
    }
  }

  async function onAddManual() {
    if (!workspace?.id) return;
    setBusy("add");
    try {
      const created = await addMilestone({
        id: `tmp-${Date.now()}`,
        projectId: project.id,
        title: "New milestone",
        description: "",
        dueDate: project.dueDate || "",
        status: "upcoming",
        deliverables: [],
        progress: 0,
        planStatus: "suggested",
        source: "manual",
        acceptanceCriteria: "",
        requiredSkills: [],
        clientPrice: 0,
        developerBudget: 0,
      });
      setSelectedId(created.id);
      toast.success("Milestone added (draft)");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Add failed");
    } finally {
      setBusy(null);
    }
  }

  function saveSelected(patch: Partial<Milestone>) {
    if (!selected) return;
    updateMilestone(selected.id, patch);
    toast.message("Saved", { description: "Persisted to database via API" });
  }

  function onAddTask() {
    if (!selected) return;
    const task: Task = {
      id: demoId("t"),
      title: "New task",
      description: "",
      projectId: project.id,
      projectName: project.name,
      status: "todo",
      priority: "medium",
      startDate: "",
      dueDate: "",
      assigneeId: "",
      assigneeName: "",
      dependsOn: [],
      milestoneId: selected.id,
      order: selectedTasks.length,
      source: "manual",
      acceptanceCriteria: "",
      requiredSkills: [],
      estimatedHours: null,
      deliverables: [],
      requiresClientApproval: false,
    };
    addTask(task);
    setEditingTaskId(task.id);
    toast.success("Task added");
  }

  async function onReorderTask(taskId: string, dir: -1 | 1) {
    if (!workspace?.id || !selected || !isApiDataSource()) return;
    const ids = selectedTasks.map((t) => t.id);
    const idx = ids.indexOf(taskId);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= ids.length) return;
    const next = [...ids];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setBusy(`task-reorder-${taskId}`);
    try {
      await reorderApiPlanTasks(workspace.id, {
        projectId: project.id,
        milestoneId: selected.id,
        orderedIds: next,
      });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Task reorder failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Production Plan Studio"
        description="Scope → milestones → tasks → subtasks. Review the full hierarchy before approving. Generate All Tasks never approves or publishes."
        action={
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="capitalize">
              Plan: {planStatus}
              {project.productionPlanVersion
                ? ` · v${project.productionPlanVersion}`
                : ""}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              disabled={Boolean(busy)}
              onClick={() => void onGenerate("append")}
            >
              {busy === "generate" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Generate milestones
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={Boolean(busy) || planMilestones.length === 0}
              onClick={() => void onGenerateAllTasks("skip_if_present")}
            >
              {busy === "generate-all-tasks" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Generate All Tasks
            </Button>
            <Button
              size="sm"
              disabled={Boolean(busy) || planMilestones.length === 0}
              onClick={() => void onApprovePlan()}
            >
              {busy === "approve" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              Approve production plan
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          {suggestedCount
            ? `${suggestedCount} milestone(s) still suggested — review tasks, then approve.`
            : planStatus === "approved"
              ? "Plan approved. Price & publish from the Milestones tab."
              : "Generate milestones, then Generate Tasks with AI per milestone or for the whole plan."}
          {milestonesWithoutTasks
            ? ` · ${milestonesWithoutTasks} milestone(s) still missing tasks.`
            : ""}
        </p>
        {progress ? (
          <p
            className={`mt-2 rounded-lg border px-3 py-2 text-sm ${
              progress.tone === "err"
                ? "border-destructive/40 text-destructive"
                : progress.tone === "warn"
                  ? "border-amber-300 text-amber-900"
                  : "border-border text-muted-foreground"
            }`}
          >
            <span className="font-medium text-foreground">{progress.label}</span>
            {progress.detail ? (
              <span className="mt-0.5 block text-xs">{progress.detail}</span>
            ) : null}
          </p>
        ) : null}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-[minmax(240px,320px)_1fr]">
        <SectionCard
          title="Milestones"
          description="AI vs manual labeled. Generate tasks from each row."
          action={
            <Button size="sm" variant="outline" onClick={() => void onAddManual()}>
              Add
            </Button>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {planMilestones.map((m) => {
              const taskCount = tasks.filter(
                (t) => t.milestoneId === m.id && !t.parentId
              ).length;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    className={`flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-muted/40 ${
                      selected?.id === m.id ? "bg-muted/60" : ""
                    }`}
                    onClick={() => setSelectedId(m.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="line-clamp-1 text-sm font-medium">
                        {m.title}
                      </span>
                      <div className="flex shrink-0 gap-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize"
                        >
                          {m.source ?? "manual"}
                        </Badge>
                        {m.adminEdited ? (
                          <Badge variant="secondary" className="text-[10px]">
                            edited
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <span className="text-xs capitalize text-muted-foreground">
                      {m.planStatus ?? "suggested"}
                      {m.estimatedDays ? ` · ${m.estimatedDays}d` : ""}
                      {` · ${taskCount} task${taskCount === 1 ? "" : "s"}`}
                    </span>
                  </button>
                  <div className="flex flex-wrap gap-1 px-3 pb-2">
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={Boolean(busy)}
                      onClick={() =>
                        void runGenerateTasks(m.id, "skip_if_present")
                      }
                    >
                      {busy === `tasks-${m.id}` ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="size-3.5" />
                      )}
                      Generate Tasks with AI
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={Boolean(busy)}
                      onClick={() => void onReorder(m.id, -1)}
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={Boolean(busy)}
                      onClick={() => void onReorder(m.id, 1)}
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={Boolean(busy)}
                      onClick={() => void onDuplicate(m.id)}
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={Boolean(busy)}
                      onClick={() => {
                        deleteMilestone(m.id);
                        if (selectedId === m.id) setSelectedId(null);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
            {planMilestones.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                No milestones in this plan yet.
              </li>
            ) : null}
          </ul>
        </SectionCard>

        {selected ? (
          <div className="flex flex-col gap-4">
            <SectionCard
              title="Edit milestone"
              description={
                selected.source === "ai" && !selected.adminEdited
                  ? "AI suggestion — editing protects it from selective regen."
                  : selected.adminEdited
                    ? "Manually edited — selective AI regen preserves this row."
                    : "Manual milestone"
              }
            >
              <div className="grid gap-3">
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">Title</span>
                  <Input
                    key={`${selected.id}-title`}
                    defaultValue={selected.title}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== selected.title) {
                        saveSelected({ title: e.target.value.trim() });
                      }
                    }}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">Description / scope</span>
                  <Textarea
                    key={`${selected.id}-desc`}
                    className="min-h-24"
                    defaultValue={selected.description}
                    onBlur={(e) => {
                      if (e.target.value !== selected.description) {
                        saveSelected({ description: e.target.value });
                      }
                    }}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">Acceptance criteria</span>
                  <Textarea
                    key={`${selected.id}-ac`}
                    className="min-h-20"
                    defaultValue={selected.acceptanceCriteria ?? ""}
                    onBlur={(e) => {
                      if (
                        e.target.value !== (selected.acceptanceCriteria ?? "")
                      ) {
                        saveSelected({ acceptanceCriteria: e.target.value });
                      }
                    }}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">
                    Deliverables (comma-separated)
                  </span>
                  <Input
                    key={`${selected.id}-del`}
                    defaultValue={(selected.deliverables ?? []).join(", ")}
                    onBlur={(e) => {
                      const next = e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      saveSelected({ deliverables: next });
                    }}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">
                    Required skills (comma-separated)
                  </span>
                  <Input
                    key={`${selected.id}-sk`}
                    defaultValue={(selected.requiredSkills ?? []).join(", ")}
                    onBlur={(e) => {
                      const next = e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      saveSelected({ requiredSkills: next });
                    }}
                  />
                </label>
                <label className="grid gap-1 text-sm sm:max-w-[12rem]">
                  <span className="text-muted-foreground">Estimated days</span>
                  <Input
                    key={`${selected.id}-days`}
                    type="number"
                    min={1}
                    defaultValue={selected.estimatedDays ?? ""}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      saveSelected({
                        estimatedDays: Number.isFinite(n) && n > 0 ? n : null,
                      });
                    }}
                  />
                </label>
              </div>
            </SectionCard>

            <SectionCard
              title="Tasks & subtasks"
              description="Generate from this milestone’s scope. Re-run skips duplicates unless you confirm regenerate."
              action={
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      void runGenerateTasks(selected.id, "skip_if_present")
                    }
                  >
                    {busy === `tasks-${selected.id}` ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    Generate Tasks with AI
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      void runGenerateTasks(selected.id, "replace_unedited")
                    }
                  >
                    Regenerate (keep edits)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={Boolean(busy)}
                    onClick={onAddTask}
                  >
                    <Plus className="size-3.5" />
                    Add task
                  </Button>
                </div>
              }
            >
              <EditableTaskList
                tasks={selectedTasks}
                allTasks={tasks}
                editingTaskId={editingTaskId}
                busy={busy}
                onEdit={setEditingTaskId}
                onSave={(id, patch) => {
                  updateTask(id, patch);
                  toast.message("Task saved");
                  setEditingTaskId(null);
                }}
                onDelete={(id) => {
                  if (!window.confirm("Delete this task?")) return;
                  deleteTask(id);
                }}
                onReorder={(id, dir) => void onReorderTask(id, dir)}
                onAddSubtask={(parent) => {
                  const sub: Task = {
                    id: demoId("t"),
                    title: "New subtask",
                    description: "",
                    projectId: project.id,
                    projectName: project.name,
                    status: "todo",
                    priority: "medium",
                    startDate: "",
                    dueDate: "",
                    assigneeId: "",
                    assigneeName: "",
                    parentId: parent.id,
                    dependsOn: [],
                    milestoneId: selected.id,
                    order: 0,
                    source: "manual",
                    requiresClientApproval: false,
                  };
                  addTask(sub);
                  setEditingTaskId(sub.id);
                }}
              />
            </SectionCard>
          </div>
        ) : (
          <SectionCard title="Select a milestone">
            <p className="text-sm text-muted-foreground">
              Choose a milestone on the left to edit details and generate tasks.
            </p>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function EditableTaskList({
  tasks,
  allTasks,
  editingTaskId,
  busy,
  onEdit,
  onSave,
  onDelete,
  onReorder,
  onAddSubtask,
}: {
  tasks: Task[];
  allTasks: Task[];
  editingTaskId: string | null;
  busy: string | null;
  onEdit: (id: string | null) => void;
  onSave: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, dir: -1 | 1) => void;
  onAddSubtask: (parent: Task) => void;
}) {
  if (!tasks.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No tasks linked to this milestone yet. Use Generate Tasks with AI.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {tasks.map((t) => {
        const subs = allTasks
          .filter((s) => s.parentId === t.id)
          .sort((a, b) => a.order - b.order);
        const editing = editingTaskId === t.id;
        return (
          <li
            key={t.id}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            {editing ? (
              <TaskEditForm
                task={t}
                onCancel={() => onEdit(null)}
                onSave={(patch) => onSave(t.id, patch)}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{t.title}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {t.source ?? "manual"}
                  </Badge>
                  {t.adminEdited ? (
                    <Badge variant="secondary" className="text-[10px]">
                      edited
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {t.priority}
                  </Badge>
                  {t.estimatedHours != null ? (
                    <span className="text-xs text-muted-foreground">
                      {t.estimatedHours}h
                    </span>
                  ) : null}
                </div>
                {t.description ? (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {t.description}
                  </p>
                ) : null}
                {(t.requiredSkills?.length || t.acceptanceCriteria) && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t.requiredSkills?.length
                      ? `Skills: ${t.requiredSkills.join(", ")}`
                      : ""}
                    {t.acceptanceCriteria
                      ? `${t.requiredSkills?.length ? " · " : ""}AC: ${t.acceptanceCriteria.slice(0, 120)}`
                      : ""}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  <Button size="xs" variant="ghost" onClick={() => onEdit(t.id)}>
                    Edit
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={Boolean(busy)}
                    onClick={() => onReorder(t.id, -1)}
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={Boolean(busy)}
                    onClick={() => onReorder(t.id, 1)}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => onAddSubtask(t)}
                  >
                    <Plus className="size-3.5" />
                    Subtask
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => onDelete(t.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </>
            )}
            {subs.length ? (
              <ul className="mt-2 space-y-2 border-l border-border pl-3">
                {subs.map((s) =>
                  editingTaskId === s.id ? (
                    <li key={s.id}>
                      <TaskEditForm
                        task={s}
                        onCancel={() => onEdit(null)}
                        onSave={(patch) => onSave(s.id, patch)}
                      />
                    </li>
                  ) : (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <span>
                        {s.title}
                        {s.estimatedHours != null
                          ? ` · ${s.estimatedHours}h`
                          : ""}
                        <Badge
                          variant="outline"
                          className="ml-2 text-[10px] capitalize"
                        >
                          {s.source ?? "manual"}
                        </Badge>
                      </span>
                      <span className="flex gap-1">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => onEdit(s.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => onDelete(s.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </span>
                    </li>
                  )
                )}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function TaskEditForm({
  task,
  onCancel,
  onSave,
}: {
  task: Task;
  onCancel: () => void;
  onSave: (patch: Partial<Task>) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(
    task.acceptanceCriteria ?? ""
  );
  const [skills, setSkills] = useState((task.requiredSkills ?? []).join(", "));
  const [hours, setHours] = useState(
    task.estimatedHours != null ? String(task.estimatedHours) : ""
  );
  const [priority, setPriority] = useState(task.priority);

  return (
    <div className="grid gap-2">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea
        className="min-h-16"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Textarea
        className="min-h-14"
        placeholder="Acceptance criteria"
        value={acceptanceCriteria}
        onChange={(e) => setAcceptanceCriteria(e.target.value)}
      />
      <Input
        placeholder="Skills (comma-separated)"
        value={skills}
        onChange={(e) => setSkills(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          min={0}
          step="0.5"
          placeholder="Hours"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
        <select
          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          value={priority}
          onChange={(e) =>
            setPriority(e.target.value as Task["priority"])
          }
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            const n = Number(hours);
            onSave({
              title: title.trim() || task.title,
              description,
              acceptanceCriteria,
              requiredSkills: skills
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              estimatedHours: Number.isFinite(n) && n > 0 ? n : null,
              priority,
            });
          }}
        >
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
