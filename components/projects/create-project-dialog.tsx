"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createApiProject } from "@/lib/api/workspace-api";
import { isApiDataSource } from "@/lib/data-source";
import { demoId } from "@/lib/demo-clock";
import { localDateInputValue } from "@/lib/format";
import { uploadProjectDocumentFile } from "@/lib/supabase/document-storage";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { Priority, Project, ProjectStatus } from "@/lib/types";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ContractType =
  | "fixed_price"
  | "time_and_materials"
  | "retainer"
  | "hybrid";

const STEPS = ["Basics", "Scope", "Documents"] as const;

export function CreateProjectDialog({
  open,
  onOpenChange,
}: CreateProjectDialogProps) {
  const router = useRouter();
  const { addProject, addDocument, clients, team, workspace, setWorkspaceId } =
    useWorkspaceStore();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objectives, setObjectives] = useState("");
  const [scopeText, setScopeText] = useState("");
  const [contractType, setContractType] =
    useState<ContractType>("fixed_price");
  const [clientId, setClientId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [budget, setBudget] = useState("50000");
  const [currency, setCurrency] = useState("USD");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [startDate, setStartDate] = useState(() => localDateInputValue());
  const [dueDate, setDueDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [scopeDocIndex, setScopeDocIndex] = useState(0);

  const resolvedClientId = clientId || clients[0]?.id || "";
  const resolvedManagerId = managerId || team[0]?.id || "";

  const existingDocs = useMemo(
    () => [] as { id: string; name: string }[],
    []
  );

  function reset() {
    setStep(0);
    setBusy(false);
    setName("");
    setDescription("");
    setObjectives("");
    setScopeText("");
    setContractType("fixed_price");
    setClientId("");
    setManagerId("");
    setPriority("medium");
    setStatus("planning");
    setStartDate(localDateInputValue());
    setDueDate("");
    setBudget("50000");
    setCurrency("USD");
    setFiles([]);
    setScopeDocIndex(0);
  }

  function handleOpenChange(next: boolean) {
    if (next) reset();
    onOpenChange(next);
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Project name is required");
      setStep(0);
      return;
    }
    if (!startDate) {
      toast.error("Start date is required");
      setStep(0);
      return;
    }
    if (scopeText.trim().length < 40) {
      toast.error("Paste a fuller client scope (at least ~40 characters)");
      setStep(1);
      return;
    }
    const client = clients.find((c) => c.id === resolvedClientId) ?? clients[0];
    const manager = team.find((m) => m.id === resolvedManagerId) ?? team[0];
    if (!client || !manager) {
      toast.error("Add a client and team member first");
      return;
    }

    const draft: Project = {
      id: demoId("p"),
      workspaceId: workspace.id,
      name: name.trim(),
      description: description.trim() || "Newly created project",
      objectives: objectives.trim(),
      scopeText: scopeText.trim(),
      contractType,
      productionPlanStatus: "none",
      clientId: client.id,
      clientName: client.name,
      managerId: manager.id,
      managerName: manager.name,
      status,
      progress: 0,
      priority,
      startDate,
      dueDate,
      teamSize: 1,
      budget: Number(budget) || 50000,
      spent: 0,
      currency: currency.trim().toUpperCase() || "USD",
    };

    setBusy(true);
    try {
      let projectId = draft.id;
      if (isApiDataSource() && workspace.id) {
        const remote = await createApiProject(workspace.id, draft);
        projectId = remote.id;

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const uploaded = await uploadProjectDocumentFile({
            workspaceId: workspace.id,
            projectId,
            file,
          });
          addDocument({
            projectId,
            name: file.name,
            type: "file",
            sizeLabel: uploaded.sizeLabel,
            uploadedBy: manager.name,
            version: "1",
            url: uploaded.storageUrl,
            storagePath: uploaded.storagePath,
          });
          void i;
          void scopeDocIndex;
        }
        setWorkspaceId(workspace.id);
      } else {
        addProject(draft);
      }

      toast.success("Project created", {
        description: "Open Production Plan to generate milestones with AI.",
      });
      handleOpenChange(false);
      router.push(`/projects/${projectId}?tab=production-plan`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create project failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Step {step + 1} of {STEPS.length}: {STEPS[step]}. Keep intake light —
            technical planning happens in Production Plan.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-2 flex gap-1">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              className={`h-1.5 flex-1 rounded-full ${
                i <= step ? "bg-foreground" : "bg-muted"
              }`}
              onClick={() => setStep(i)}
              aria-label={label}
            />
          ))}
        </div>

        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto py-1">
          {step === 0 ? (
            <>
              <Field label="Project name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Customer Portal Refresh"
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this project delivering?"
                  className="min-h-16"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Client">
                  <Select
                    value={resolvedClientId}
                    onValueChange={(v) => v && setClientId(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value) =>
                          clients.find((c) => c.id === value)?.name ??
                          "Select client"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Contract type">
                  <Select
                    value={contractType}
                    onValueChange={(v) =>
                      v && setContractType(v as ContractType)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="fixed_price">Fixed price</SelectItem>
                        <SelectItem value="time_and_materials">
                          Time & materials
                        </SelectItem>
                        <SelectItem value="retainer">Retainer</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Client budget">
                  <Input
                    type="number"
                    min={0}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </Field>
                <Field label="Currency">
                  <Input
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    maxLength={3}
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Start date">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </Field>
                <Field label="Deadline">
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Priority">
                  <Select
                    value={priority}
                    onValueChange={(v) => v && setPriority(v as Priority)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Status">
                  <Select
                    value={status}
                    onValueChange={(v) => v && setStatus(v as ProjectStatus)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Project manager">
                <Select
                  value={resolvedManagerId}
                  onValueChange={(v) => v && setManagerId(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value) =>
                        team.find((m) => m.id === value)?.name ?? "Select PM"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {team.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Field label="Objectives">
                <Textarea
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  placeholder="Client success criteria"
                  className="min-h-16"
                />
              </Field>
              <Field label="Original client scope">
                <Textarea
                  value={scopeText}
                  onChange={(e) => setScopeText(e.target.value)}
                  placeholder="Paste the full client requirements here. This becomes the baseline for AI planning."
                  className="min-h-40"
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                Scope is saved on the project. Phase B will version it immutably
                after plan approval.
              </p>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Field label="Upload scope / reference documents">
                <Input
                  type="file"
                  multiple
                  onChange={(e) =>
                    setFiles(Array.from(e.target.files ?? []))
                  }
                />
              </Field>
              {files.length ? (
                <div className="rounded-lg border border-border p-3 text-sm">
                  <p className="mb-2 text-xs text-muted-foreground">
                    Select which file is the primary scope document (optional).
                  </p>
                  {files.map((f, i) => (
                    <label
                      key={`${f.name}-${i}`}
                      className="mb-1 flex items-center gap-2"
                    >
                      <input
                        type="radio"
                        name="scope-doc"
                        checked={scopeDocIndex === i}
                        onChange={() => setScopeDocIndex(i)}
                      />
                      <span className="truncate">{f.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Optional — you can also attach later on Documents.{" "}
                  {existingDocs.length
                    ? "Existing workspace documents can be linked from Scope."
                    : null}
                </p>
              )}
            </>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {step > 0 ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </Button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <Button disabled={busy} onClick={() => setStep((s) => s + 1)}>
              Continue
            </Button>
          ) : (
            <Button disabled={busy} onClick={() => void handleCreate()}>
              {busy ? "Creating…" : "Create & open Production Plan"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-foreground">{label}</span>
      {children}
    </div>
  );
}
