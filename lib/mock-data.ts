import type {
  ActivityItem,
  ChartSlice,
  Client,
  Deadline,
  KpiSummary,
  Project,
  Task,
  User,
  WorkloadPoint,
  Workspace,
} from "@/lib/types";
import { detailTasks } from "@/lib/mock-project-details";

export const currentUser: User = {
  id: "u1",
  name: "Ayesha Khan",
  email: "ayesha@worksphere.io",
  role: "Workspace Admin",
};

export const workspaces: Workspace[] = [
  { id: "ws1", name: "Apex Digital", plan: "Enterprise", color: "#4F46E5" },
  { id: "ws2", name: "Northwind Labs", plan: "Pro", color: "#0EA5E9" },
  { id: "ws3", name: "Harbor Studio", plan: "Pro", color: "#059669" },
];

export const clients: Client[] = [
  { id: "c1", name: "Nova Retail", industry: "E-commerce" },
  { id: "c2", name: "BrightPath Health", industry: "Healthcare" },
  { id: "c3", name: "Orbit Fintech", industry: "Finance" },
  { id: "c4", name: "Lumen Media", industry: "Media" },
  { id: "c5", name: "Cedar Logistics", industry: "Logistics" },
];

export const teamMembers: User[] = [
  currentUser,
  {
    id: "u2",
    name: "Daniel Ortiz",
    email: "daniel@worksphere.io",
    role: "Project Manager",
  },
  {
    id: "u3",
    name: "Sara Ahmed",
    email: "sara@worksphere.io",
    role: "Engineering Lead",
  },
  {
    id: "u4",
    name: "James Chen",
    email: "james@worksphere.io",
    role: "Designer",
  },
  {
    id: "u5",
    name: "Priya Nair",
    email: "priya@worksphere.io",
    role: "QA Lead",
  },
  {
    id: "u6",
    name: "Marcus Webb",
    email: "marcus@worksphere.io",
    role: "Developer",
  },
];

export const initialProjects: Project[] = [
  {
    id: "p1",
    name: "Retail OS Redesign",
    description: "Modernize the Nova Retail admin and storefront experience.",
    clientId: "c1",
    clientName: "Nova Retail",
    managerId: "u2",
    managerName: "Daniel Ortiz",
    status: "active",
    progress: 68,
    priority: "high",
    startDate: "2026-01-12",
    dueDate: "2026-04-30",
    teamSize: 8,
    budget: 120000,
    spent: 81600,
    currency: "USD",
  },
  {
    id: "p2",
    name: "Patient Portal v2",
    description: "HIPAA-ready portal with appointment and records flows.",
    clientId: "c2",
    clientName: "BrightPath Health",
    managerId: "u1",
    managerName: "Ayesha Khan",
    status: "active",
    progress: 42,
    priority: "critical",
    startDate: "2026-02-01",
    dueDate: "2026-05-15",
    teamSize: 11,
    budget: 185000,
    spent: 77700,
    currency: "USD",
  },
  {
    id: "p3",
    name: "Payments Dashboard",
    description: "Real-time settlement and reconciliation workspace.",
    clientId: "c3",
    clientName: "Orbit Fintech",
    managerId: "u3",
    managerName: "Sara Ahmed",
    status: "at_risk",
    progress: 55,
    priority: "high",
    startDate: "2025-11-20",
    dueDate: "2026-03-28",
    teamSize: 6,
    budget: 95000,
    spent: 61750,
    currency: "USD",
  },
  {
    id: "p4",
    name: "Content Studio",
    description: "Editorial workflow and asset approval pipeline.",
    clientId: "c4",
    clientName: "Lumen Media",
    managerId: "u4",
    managerName: "James Chen",
    status: "planning",
    progress: 18,
    priority: "medium",
    startDate: "2026-03-01",
    dueDate: "2026-06-20",
    teamSize: 5,
    budget: 62000,
    spent: 11160,
    currency: "USD",
  },
  {
    id: "p5",
    name: "Fleet Tracking API",
    description: "Telemetry ingestion and route optimization services.",
    clientId: "c5",
    clientName: "Cedar Logistics",
    managerId: "u2",
    managerName: "Daniel Ortiz",
    status: "completed",
    progress: 100,
    priority: "medium",
    startDate: "2025-09-10",
    dueDate: "2026-01-31",
    teamSize: 7,
    budget: 78000,
    spent: 78000,
    currency: "USD",
  },
  {
    id: "p6",
    name: "Marketplace Onboarding",
    description: "Developer listing, vetting, and contract workflows.",
    clientId: "c1",
    clientName: "Nova Retail",
    managerId: "u1",
    managerName: "Ayesha Khan",
    status: "on_hold",
    progress: 30,
    priority: "low",
    startDate: "2025-12-01",
    dueDate: "2026-04-10",
    teamSize: 4,
    budget: 45000,
    spent: 13500,
    currency: "USD",
  },
  {
    id: "p7",
    name: "Claims Automation",
    description: "Rules engine for intake triage and claim routing.",
    clientId: "c2",
    clientName: "BrightPath Health",
    managerId: "u5",
    managerName: "Priya Nair",
    status: "active",
    progress: 74,
    priority: "high",
    startDate: "2025-10-15",
    dueDate: "2026-03-20",
    teamSize: 9,
    budget: 140000,
    spent: 103600,
    currency: "USD",
  },
  {
    id: "p8",
    name: "Risk Scoring Engine",
    description: "ML-assisted credit risk scoring for SME portfolios.",
    clientId: "c3",
    clientName: "Orbit Fintech",
    managerId: "u3",
    managerName: "Sara Ahmed",
    status: "active",
    progress: 36,
    priority: "medium",
    startDate: "2026-02-15",
    dueDate: "2026-07-01",
    teamSize: 10,
    budget: 210000,
    spent: 75600,
    currency: "USD",
  },
];

export const initialTasks: Task[] = detailTasks;

export const deadlines: Deadline[] = [
  {
    id: "d1",
    title: "Design system freeze",
    projectName: "Retail OS Redesign",
    date: "2026-03-14",
    type: "milestone",
  },
  {
    id: "d2",
    title: "Security review",
    projectName: "Patient Portal v2",
    date: "2026-03-17",
    type: "review",
  },
  {
    id: "d3",
    title: "Beta launch",
    projectName: "Payments Dashboard",
    date: "2026-03-22",
    type: "deadline",
  },
  {
    id: "d4",
    title: "UAT sign-off",
    projectName: "Claims Automation",
    date: "2026-03-25",
    type: "milestone",
  },
  {
    id: "d5",
    title: "Client demo",
    projectName: "Content Studio",
    date: "2026-03-28",
    type: "deadline",
  },
];

export const initialActivity: ActivityItem[] = [
  {
    id: "a1",
    type: "approval",
    title: "Approval requested",
    description: "Sprint 12 deliverables awaiting sign-off",
    actorName: "Daniel Ortiz",
    timestamp: "2026-03-11T09:20:00Z",
    projectId: "p1",
    projectName: "Retail OS Redesign",
  },
  {
    id: "a2",
    type: "task_assigned",
    title: "Task assigned to you",
    description: "Review SSO integration PR",
    actorName: "Sara Ahmed",
    timestamp: "2026-03-11T08:05:00Z",
    projectId: "p2",
    projectName: "Patient Portal v2",
  },
  {
    id: "a3",
    type: "submission",
    title: "Design submission",
    description: "Checkout flow mockups uploaded",
    actorName: "James Chen",
    timestamp: "2026-03-10T17:40:00Z",
    projectId: "p1",
    projectName: "Retail OS Redesign",
  },
  {
    id: "a4",
    type: "status_change",
    title: "Project marked at risk",
    description: "Payments Dashboard moved to At Risk",
    actorName: "Ayesha Khan",
    timestamp: "2026-03-10T14:15:00Z",
    projectId: "p3",
    projectName: "Payments Dashboard",
  },
  {
    id: "a5",
    type: "comment",
    title: "New comment",
    description: "Priya left feedback on claims routing rules",
    actorName: "Priya Nair",
    timestamp: "2026-03-10T11:50:00Z",
    projectId: "p7",
    projectName: "Claims Automation",
  },
  {
    id: "a6",
    type: "project_update",
    title: "Milestone completed",
    description: "Fleet alerts API shipped to production",
    actorName: "Marcus Webb",
    timestamp: "2026-03-09T16:00:00Z",
    projectId: "p5",
    projectName: "Fleet Tracking API",
  },
];

/** @deprecated use initialActivity — kept for existing imports */
export const recentActivity = initialActivity;

export const notifications = [
  {
    id: "n1",
    title: "3 approvals waiting",
    body: "Retail OS and Patient Portal need your review",
    time: "12m ago",
    unread: true,
  },
  {
    id: "n2",
    title: "Deadline tomorrow",
    body: "SSO integration review is due Mar 12",
    time: "1h ago",
    unread: true,
  },
  {
    id: "n3",
    title: "New marketplace applicant",
    body: "Elena Vargas applied for Frontend Contractor",
    time: "3h ago",
    unread: false,
  },
  {
    id: "n4",
    title: "Weekly report ready",
    body: "Apex Digital workspace summary is available",
    time: "Yesterday",
    unread: false,
  },
];

export function buildKpis(projects: Project[], tasks: Task[]): KpiSummary {
  return {
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === "active").length,
    completedProjects: projects.filter((p) => p.status === "completed").length,
    overdueTasks: tasks.filter(
      (t) => t.status !== "done" && new Date(t.dueDate) < new Date("2026-03-11")
    ).length,
    pendingApprovals: 5,
    teamMembers: teamMembers.length,
  };
}

export function projectsByStatus(projects: Project[]): ChartSlice[] {
  const labels: Record<string, string> = {
    planning: "Planning",
    active: "Active",
    on_hold: "On Hold",
    completed: "Completed",
    at_risk: "At Risk",
  };
  const colors: Record<string, string> = {
    planning: "#0ea5e9",
    active: "#4f46e5",
    on_hold: "#f59e0b",
    completed: "#10b981",
    at_risk: "#ef4444",
  };
  const counts = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([key, value]) => ({
    name: labels[key] ?? key,
    value,
    fill: colors[key],
  }));
}

export function taskCompletion(tasks: Task[]): ChartSlice[] {
  const done = tasks.filter((t) => t.status === "done").length;
  const inFlight = tasks.filter((t) =>
    ["in_progress", "review"].includes(t.status)
  ).length;
  const remaining = tasks.length - done - inFlight;
  return [
    { name: "Done", value: done, fill: "#10b981" },
    { name: "In progress", value: inFlight, fill: "#4f46e5" },
    { name: "Remaining", value: remaining, fill: "#f59e0b" },
  ];
}

export const workloadDistribution: WorkloadPoint[] = [
  { name: "Ayesha", tasks: 7 },
  { name: "Daniel", tasks: 12 },
  { name: "Sara", tasks: 9 },
  { name: "James", tasks: 6 },
  { name: "Priya", tasks: 8 },
  { name: "Marcus", tasks: 10 },
];
