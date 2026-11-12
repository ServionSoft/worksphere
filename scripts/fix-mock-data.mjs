import fs from "fs";

const path = "lib/mock-data.ts";
let s = fs.readFileSync(path, "utf8");
s = s.replace(/`n/g, "\n");

s = s.replace(
  /export const clients: Client\[\] = \[[\s\S]*?\];/,
  `export const clients: Client[] = [
  { id: "c1", name: "Nova Retail", industry: "E-commerce", workspaceId: "ws1", contactName: "Helen Park", email: "client@worksphere.demo", phone: "+1 212 555 0101", status: "active" },
  { id: "c2", name: "BrightPath Health", industry: "Healthcare", workspaceId: "ws1", contactName: "Dr. Amy Cole", email: "amy@brightpath.demo", phone: "+1 617 555 0144", status: "active" },
  { id: "c3", name: "Orbit Fintech", industry: "Finance", workspaceId: "ws1", contactName: "Raj Patel", email: "raj@orbit.demo", phone: "+1 415 555 0190", status: "active" },
  { id: "c4", name: "Lumen Media", industry: "Media", workspaceId: "ws1", contactName: "Sofia Reyes", email: "sofia@lumen.demo", phone: "+1 323 555 0112", status: "prospect" },
  { id: "c5", name: "Cedar Logistics", industry: "Logistics", workspaceId: "ws2", contactName: "Tom Baker", email: "tom@cedar.demo", phone: "+1 312 555 0166", status: "active" },
];`
);

s = s.replace(
  /export function buildKpis\(projects: Project\[\], tasks: Task\[\]\): KpiSummary \{[\s\S]*?\n\}/,
  `export function buildKpis(
  projects: Project[],
  tasks: Task[],
  pendingApprovals = 0,
  teamCount = teamMembers.length
): KpiSummary {
  return {
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === "active").length,
    completedProjects: projects.filter((p) => p.status === "completed").length,
    overdueTasks: tasks.filter(
      (t) => t.status !== "done" && new Date(t.dueDate) < new Date("2026-03-11")
    ).length,
    pendingApprovals,
    teamMembers: teamCount,
  };
}`
);

fs.writeFileSync(path, s);
console.log("fixed", (s.match(/workspaceId/g) || []).length);
