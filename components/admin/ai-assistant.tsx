"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardList,
  Clock3,
  DollarSign,
  FileBarChart,
  LayoutList,
  MessageSquare,
  Send,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { demoId } from "@/lib/demo-clock";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { LucideIcon } from "lucide-react";

type AiModeId =
  | "project_manager"
  | "production_planner"
  | "task_allocator"
  | "deadline_monitor"
  | "qa"
  | "approval"
  | "client"
  | "cost_analyst"
  | "reporting"
  | "risk_manager";

interface AiMode {
  id: AiModeId;
  label: string;
  description: string;
  icon: LucideIcon;
  suggestions: string[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  modeId: AiModeId;
}

const AI_MODES: AiMode[] = [
  {
    id: "project_manager",
    label: "Project Manager",
    description: "Summaries, blockers, next actions",
    icon: ClipboardList,
    suggestions: [
      "Summarize project health",
      "List top blockers",
      "Draft weekly status",
    ],
  },
  {
    id: "production_planner",
    label: "Production Planner",
    description: "Capacity and sprint sequencing",
    icon: LayoutList,
    suggestions: [
      "Propose next sprint focus",
      "Balance team capacity",
      "Sequence milestones",
    ],
  },
  {
    id: "task_allocator",
    label: "Task Allocator",
    description: "Assignment recommendations",
    icon: Users,
    suggestions: [
      "Suggest assignees for open tasks",
      "Create a follow-up task",
      "Flag overloaded people",
    ],
  },
  {
    id: "deadline_monitor",
    label: "Deadline Monitor",
    description: "Due dates and slippage risk",
    icon: Clock3,
    suggestions: [
      "Show overdue items",
      "Predict slip risk",
      "Suggest buffer days",
    ],
  },
  {
    id: "qa",
    label: "QA",
    description: "Test coverage and quality risks",
    icon: CheckCircle2,
    suggestions: [
      "Draft QA checklist",
      "Highlight regression risk",
      "Prioritize test cases",
    ],
  },
  {
    id: "approval",
    label: "Approval",
    description: "Review queues and gatekeeping",
    icon: MessageSquare,
    suggestions: [
      "List pending approvals",
      "Draft review note",
      "Recommend approve vs revise",
    ],
  },
  {
    id: "client",
    label: "Client",
    description: "Client-ready updates",
    icon: Sparkles,
    suggestions: [
      "Write client update",
      "Explain delay politely",
      "Highlight delivered value",
    ],
  },
  {
    id: "cost_analyst",
    label: "Cost Analyst",
    description: "Budget burn and margin",
    icon: DollarSign,
    suggestions: [
      "Budget utilization summary",
      "Flag overspend risk",
      "Compare planned vs spent",
    ],
  },
  {
    id: "reporting",
    label: "Reporting",
    description: "Portfolio metrics narrative",
    icon: FileBarChart,
    suggestions: [
      "Executive summary",
      "KPI narrative",
      "Export talking points",
    ],
  },
  {
    id: "risk_manager",
    label: "Risk Manager",
    description: "Risk register and mitigation",
    icon: ShieldAlert,
    suggestions: [
      "Top 3 risks",
      "Mitigation plan",
      "Escalate critical items",
    ],
  },
];

function mockReply(
  mode: AiMode,
  prompt: string,
  projectName?: string
): string {
  const scope = projectName ? `for **${projectName}**` : "across the workspace";
  const lower = prompt.toLowerCase();

  const replies: Record<AiModeId, string> = {
    project_manager: `Simulated PM brief ${scope}: delivery is mostly on track. Open blockers center on review latency and one dependency chain. Next actions — close overdue reviews, confirm milestone owners, and keep the weekly status under 5 bullets.`,
    production_planner: `Simulated production plan ${scope}: sequence critical-path work first, park nice-to-haves behind QA capacity, and leave a 15% buffer for revision cycles. Suggested sprint theme: stabilize approvals then push marketplace fill rate.`,
    task_allocator: `Simulated allocation ${scope}: route frontend polish to available mid/senior capacity, keep blockers with the current owner, and avoid stacking more than 2 high-priority items on any single assignee.`,
    deadline_monitor: `Simulated deadline scan ${scope}: items past due should be triaged today; anything due within 3 days needs a check-in. Buffer recommendation: +2 days on client-facing milestones with pending approvals.`,
    qa: `Simulated QA notes ${scope}: prioritize regression on auth, approvals, and marketplace flows. Draft checklist — happy path, empty states, permission edges, and mobile layout. No live tests were run.`,
    approval: `Simulated approval assist ${scope}: pending items should include a short review note and clear approve/revise outcome. Critical changes are never auto-applied in this demo.`,
    client: `Simulated client update ${scope}: progress continues with visible deliverables this week. Risks are framed as managed (review queue + schedule buffer). Tone stays concise and non-technical.`,
    cost_analyst: `Simulated cost view ${scope}: watch budget utilization on active projects; flag any above ~80% spent with incomplete milestones. Margin narrative should call out overspend risk without mutating financials.`,
    reporting: `Simulated report narrative ${scope}: portfolio health is mixed — active delivery strong, overdue tasks and a few at-risk projects need attention. Use Reports for charts; this chat stays narrative-only.`,
    risk_manager: `Simulated risk register ${scope}: (1) schedule slip on review-gated work, (2) capacity concentration on a few assignees, (3) budget burn on high-spend projects. Mitigate with earlier reviews and rebalancing.`,
  };

  let base = replies[mode.id];
  if (lower.includes("blocker") || lower.includes("risk")) {
    base +=
      " Highlighted focus: reduce open blockers before adding new critical work.";
  }
  if (lower.includes("budget") || lower.includes("cost")) {
    base +=
      " Cost note: this is a simulated reading of local demo numbers only.";
  }
  return base;
}

export function AiAssistant() {
  const { projects, tasks, addTask } = useWorkspaceStore();
  const [modeId, setModeId] = useState<AiModeId>("project_manager");
  const [projectId, setProjectId] = useState<string>("all");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingTaskTitle, setPendingTaskTitle] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const mode = AI_MODES.find((m) => m.id === modeId) ?? AI_MODES[0];
  const project = projects.find((p) => p.id === projectId);
  const activeProjects = useMemo(
    () => projects.filter((p) => !p.archived),
    [projects]
  );

  function pushExchange(prompt: string) {
    const userMsg: ChatMessage = {
      id: demoId("msg"),
      role: "user",
      text: prompt,
      modeId,
    };
    const assistantMsg: ChatMessage = {
      id: demoId("msg"),
      role: "assistant",
      text: mockReply(mode, prompt, project?.name),
      modeId,
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }

  function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const prompt = input.trim();
    if (!prompt) return;
    pushExchange(prompt);
  }

  function handleSuggestion(label: string) {
    if (label.toLowerCase().includes("create a follow-up task")) {
      setPendingTaskTitle(
        project
          ? `AI follow-up · ${project.name}`
          : "AI follow-up · workspace"
      );
      setConfirmOpen(true);
      return;
    }
    if (
      label.toLowerCase().includes("escalate") ||
      label.toLowerCase().includes("approve")
    ) {
      toast.message("Action not applied", {
        description:
          "Critical changes are never auto-applied. Review manually in Approvals or Projects.",
      });
      pushExchange(label);
      return;
    }
    toast.message("Suggested action (demo)", {
      description: `${label} — preview only; no live AI call.`,
    });
    pushExchange(label);
  }

  function confirmAddTask() {
    const target =
      project ?? activeProjects[0] ?? null;
    if (!target) {
      toast.error("No project available for the demo task.");
      setConfirmOpen(false);
      return;
    }
    const order =
      Math.max(
        0,
        ...tasks.filter((t) => t.projectId === target.id).map((t) => t.order)
      ) + 1;
    addTask({
      id: demoId("t"),
      title: pendingTaskTitle || "AI-suggested follow-up",
      description:
        "Created from AI Assistant suggested action (simulated). Review before treating as committed work.",
      projectId: target.id,
      projectName: target.name,
      status: "todo",
      priority: "medium",
      startDate: "2026-03-11",
      dueDate: "2026-03-18",
      assigneeId: target.managerId,
      assigneeName: target.managerName,
      dependsOn: [],
      order,
    });
    toast.success("Demo task added", {
      description: `“${pendingTaskTitle}” on ${target.name}.`,
    });
    setConfirmOpen(false);
    pushExchange(`Create a follow-up task: ${pendingTaskTitle}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="AI Assistant"
        description="Mode-based planning helpers with deterministic mock replies."
        actions={
          <Badge variant="outline" className="gap-1.5 font-normal">
            <AlertTriangle className="size-3" />
            Simulated AI — no live API
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <SectionCard
          title="Modes"
          description="Pick a specialist lens"
          bodyClassName="p-2"
        >
          <nav className="flex flex-col gap-0.5">
            {AI_MODES.map((item) => {
              const Icon = item.icon;
              const active = item.id === modeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setModeId(item.id)}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                    active
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      active ? "text-primary" : ""
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </SectionCard>

        <div className="flex min-h-[560px] flex-col gap-4">
          <SectionCard
            title={mode.label}
            description={mode.description}
            action={
              <Select
                value={projectId}
                onValueChange={(v) => setProjectId(v ?? "all")}
              >
                <SelectTrigger className="min-w-44">
                  <SelectValue>
                    {projectId === "all"
                      ? "All projects"
                      : project?.name ?? "Project"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All projects</SelectItem>
                    {activeProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            }
            className="flex min-h-0 flex-1 flex-col"
            bodyClassName="flex flex-1 flex-col gap-3"
          >
            <div
              ref={listRef}
              className="flex max-h-[360px] min-h-[280px] flex-1 flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3"
            >
              {messages.length === 0 ? (
                <div className="m-auto flex max-w-sm flex-col items-center gap-2 py-10 text-center">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Bot className="size-5" />
                  </span>
                  <p className="text-sm font-medium">Start a simulated chat</p>
                  <p className="text-xs text-muted-foreground">
                    Replies are deterministic mock text based on the selected
                    mode and optional project. Nothing is sent to an external
                    model.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "max-w-[90%] rounded-xl px-3 py-2 text-sm leading-6",
                      msg.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "mr-auto border border-border bg-card text-foreground"
                    )}
                  >
                    {msg.text}
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {mode.suggestions.map((s) => (
                <Button
                  key={s}
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => handleSuggestion(s)}
                >
                  {s}
                </Button>
              ))}
            </div>

            <form onSubmit={handleSend} className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask the ${mode.label}…`}
                className="min-h-[44px] flex-1 resize-none"
                rows={2}
              />
              <Button type="submit" size="icon" disabled={!input.trim()}>
                <Send className="size-4" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </SectionCard>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add suggested task?</DialogTitle>
            <DialogDescription>
              Safe demo action only. Confirms before calling{" "}
              <code className="text-xs">addTask</code>. Critical workflow
              changes are never auto-applied.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={pendingTaskTitle}
            onChange={(e) => setPendingTaskTitle(e.target.value)}
            placeholder="Task title"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAddTask}>Confirm add task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
