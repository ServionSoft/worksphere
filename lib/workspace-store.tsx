"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEMO_TS, demoId } from "@/lib/demo-clock";
import {
  buildKpis,
  clients as seedClients,
  currentUser,
  initialActivity,
  initialProjects,
  initialTasks,
  teamMembers as seedTeam,
  workspaces as seedWorkspaces,
} from "@/lib/mock-data";
import {
  initialComments,
  initialDocuments,
  initialMilestones,
  initialSubmissions,
} from "@/lib/mock-project-details";
import {
  initialAssignments,
  initialEarnings,
  initialInvoices,
  initialMessages,
  initialOpportunities,
  initialPortalNotifications,
  initialQuotations,
  initialThreads,
  initialWorkSubmissions,
  developerProfiles as seedDevelopers,
} from "@/lib/mock-portals";
import {
  loadWorkspaceSnapshot,
  saveWorkspaceSnapshot,
} from "@/lib/store-persist";
import type {
  ActivityItem,
  Client,
  Milestone,
  MilestoneStatus,
  Project,
  ProjectComment,
  ProjectDocument,
  ProjectStatus,
  Submission,
  SubmissionStatus,
  Task,
  TaskStatus,
  TeamMember,
  Workspace,
} from "@/lib/types";
import type {
  AssignmentStatus,
  ClientApprovalStatus,
  DeveloperAssignment,
  DeveloperProfile,
  DeveloperStatus,
  EarningRecord,
  Invoice,
  InvoiceStatus,
  MarketplaceOpportunity,
  MessageThread,
  OpportunityStatus,
  PortalMessage,
  PortalNotification,
  Quotation,
  QuotationStatus,
  SavedOpportunity,
  WorkSubmissionVersion,
} from "@/lib/portal-types";

function pushActivity(
  setActivity: React.Dispatch<React.SetStateAction<ActivityItem[]>>,
  item: Omit<ActivityItem, "id" | "timestamp">
) {
  setActivity((prev) => [
    { ...item, id: demoId("a"), timestamp: DEMO_TS },
    ...prev,
  ]);
}

function pushNotification(
  setNotifications: React.Dispatch<React.SetStateAction<PortalNotification[]>>,
  item: Omit<PortalNotification, "id" | "createdAt" | "read">
) {
  setNotifications((prev) => [
    {
      ...item,
      workspaceId: item.workspaceId || "ws1",
      id: demoId("n"),
      createdAt: DEMO_TS,
      read: false,
    },
    ...prev,
  ]);
}

/** Demo rule: project progress is the average of its milestone progress values. */
function projectProgressFromMilestones(
  projectId: string,
  milestoneList: Milestone[]
) {
  const projectMs = milestoneList.filter((m) => m.projectId === projectId);
  if (projectMs.length === 0) return null;
  const sum = projectMs.reduce((acc, m) => acc + m.progress, 0);
  return Math.round(sum / projectMs.length);
}

const TASK_STATUS_PROGRESS: Record<TaskStatus, number> = {
  todo: 0,
  blocked: 0,
  in_progress: 40,
  review: 75,
  done: 100,
};

/** Milestone progress from parent tasks linked to that milestone. */
function milestoneProgressFromTasks(milestoneId: string, taskList: Task[]) {
  const linked = taskList.filter(
    (t) => t.milestoneId === milestoneId && !t.parentId
  );
  if (linked.length === 0) return null;
  const sum = linked.reduce(
    (acc, t) => acc + (TASK_STATUS_PROGRESS[t.status] ?? 0),
    0
  );
  return Math.round(sum / linked.length);
}

function applyMilestoneProgressFromTasks(
  milestoneList: Milestone[],
  taskList: Task[],
  milestoneId: string
): Milestone[] {
  const progress = milestoneProgressFromTasks(milestoneId, taskList);
  if (progress === null) return milestoneList;
  return milestoneList.map((m) => {
    if (m.id !== milestoneId) return m;
    if (m.status === "completed" || m.status === "missed") {
      return { ...m, progress };
    }
    const nextStatus: MilestoneStatus =
      progress <= 0
        ? m.status === "upcoming"
          ? "upcoming"
          : m.status
        : "in_progress";
    return { ...m, progress, status: nextStatus };
  });
}

interface WorkspaceStoreValue {
  hydrated: boolean;
  workspace: Workspace;
  workspaces: Workspace[];
  setWorkspaceId: (id: string) => void;
  createWorkspace: (input: {
    name: string;
    companyName?: string;
    plan?: string;
    color?: string;
    seats?: number;
  }) => Workspace;
  clients: Client[];
  team: TeamMember[];
  projects: Project[];
  tasks: Task[];
  milestones: Milestone[];
  documents: ProjectDocument[];
  comments: ProjectComment[];
  submissions: Submission[];
  activity: ActivityItem[];
  kpis: ReturnType<typeof buildKpis>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  addProject: (project: Project) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  archiveProject: (id: string) => void;
  deleteProject: (id: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  updateTask: (taskId: string, patch: Partial<Task>) => void;
  addTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  addMilestone: (milestone: Milestone) => void;
  updateMilestone: (id: string, patch: Partial<Milestone>) => void;
  updateMilestoneStatus: (milestoneId: string, status: MilestoneStatus) => void;
  deleteMilestone: (id: string) => void;
  addComment: (comment: Omit<ProjectComment, "id" | "createdAt">) => void;
  addDocument: (doc: Omit<ProjectDocument, "id" | "uploadedAt">) => void;
  deleteDocument: (id: string) => void;
  updateSubmissionStatus: (
    submissionId: string,
    status: SubmissionStatus,
    reviewNote?: string
  ) => void;
  addSubmission: (submission: Omit<Submission, "id" | "submittedAt">) => void;
  authorizeClientReview: (workSubmissionId: string, note?: string) => void;
  authorizeSubmissionForClient: (submissionId: string, note?: string) => void;
  getProjectTasks: (projectId: string) => Task[];

  addClient: (client: Client) => void;
  updateClient: (id: string, patch: Partial<Client>) => void;
  addTeamMember: (member: TeamMember) => void;
  updateTeamMember: (id: string, patch: Partial<TeamMember>) => void;

  opportunities: MarketplaceOpportunity[];
  quotations: Quotation[];
  assignments: DeveloperAssignment[];
  workSubmissions: WorkSubmissionVersion[];
  threads: MessageThread[];
  messages: PortalMessage[];
  invoices: Invoice[];
  earnings: EarningRecord[];
  portalNotifications: PortalNotification[];
  developers: DeveloperProfile[];
  savedOpportunityIds: string[];

  addOpportunity: (
    opp: Omit<MarketplaceOpportunity, "id" | "publishedAt" | "status">
  ) => void;
  updateOpportunity: (id: string, patch: Partial<MarketplaceOpportunity>) => void;
  setOpportunityStatus: (id: string, status: OpportunityStatus) => void;
  deleteOpportunity: (id: string) => void;
  saveOpportunity: (opportunityId: string, developerId?: string) => void;
  unsaveOpportunity: (opportunityId: string) => void;
  submitQuotation: (
    quotation: Omit<Quotation, "id" | "submittedAt" | "status">
  ) => void;
  updateQuotationStatus: (id: string, status: QuotationStatus) => void;
  acceptQuotation: (quotationId: string) => void;
  acceptFixedOpportunity: (
    opportunityId: string,
    developerId: string,
    developerName: string
  ) => void;
  confirmAssignment: (assignmentId: string) => void;
  rejectAssignment: (assignmentId: string) => void;
  updateAssignment: (id: string, patch: Partial<DeveloperAssignment>) => void;
  requestExtension: (
    assignmentId: string,
    requestedDeadline: string,
    reason: string
  ) => void;
  resolveExtension: (
    assignmentId: string,
    decision: "approved" | "rejected"
  ) => void;
  addWorkSubmission: (
    submission: Omit<
      WorkSubmissionVersion,
      | "id"
      | "submittedAt"
      | "version"
      | "authorizedForClient"
      | "clientApprovalStatus"
    > & {
      clientApprovalStatus?: WorkSubmissionVersion["clientApprovalStatus"];
      authorizedForClient?: boolean;
    }
  ) => void;
  reviewWorkSubmission: (
    workSubmissionId: string,
    status: Extract<SubmissionStatus, "approved" | "rejected" | "in_review">,
    reviewNote?: string,
    authorizeClient?: boolean
  ) => void;
  clientReviewWork: (
    workSubmissionId: string,
    decision: Extract<
      ClientApprovalStatus,
      "approved" | "revision_requested" | "rejected"
    >,
    note?: string,
    reviewerName?: string
  ) => void;
  sendMessage: (
    message: Omit<PortalMessage, "id" | "createdAt" | "read">
  ) => void;
  createThread: (
    thread: Omit<MessageThread, "id" | "lastMessageAt" | "unreadCount">
  ) => string;
  updateDeveloperProfile: (id: string, patch: Partial<DeveloperProfile>) => void;
  registerDeveloper: (profile: DeveloperProfile) => void;
  setDeveloperStatus: (id: string, status: DeveloperStatus) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (portal: PortalNotification["portal"], userId: string) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, patch: Partial<Invoice>) => void;
  markEarningPaid: (id: string) => void;
  resetDemoData: () => void;
}

const WorkspaceStoreContext = createContext<WorkspaceStoreValue | null>(null);

function seedState() {
  return {
    workspaceId: seedWorkspaces[0].id,
    workspaces: seedWorkspaces.map((w) => ({ ...w })),
    projects: initialProjects,
    tasks: initialTasks,
    milestones: initialMilestones,
    documents: initialDocuments,
    comments: initialComments,
    submissions: initialSubmissions,
    activity: initialActivity,
    opportunities: initialOpportunities,
    quotations: initialQuotations,
    assignments: initialAssignments,
    workSubmissions: initialWorkSubmissions,
    threads: initialThreads,
    messages: initialMessages,
    invoices: initialInvoices,
    earnings: initialEarnings,
    portalNotifications: initialPortalNotifications,
    developers: seedDevelopers,
    saved: [{ developerId: "dev1", opportunityId: "opp3" }] as SavedOpportunity[],
    clients: seedClients,
    team: seedTeam.map((m) => ({
      ...m,
      workspaceId: "ws1",
      active: true,
      permissionRole:
        m.id === "u1"
          ? ("tenant_admin" as const)
          : m.id === "u2"
            ? ("project_manager" as const)
            : ("internal_member" as const),
    })),
    searchQuery: "",
  };
}

export function WorkspaceStoreProvider({ children }: { children: ReactNode }) {
  const seed = useMemo(() => seedState(), []);
  const [hydrated, setHydrated] = useState(false);
  const [workspaceId, setWorkspaceIdState] = useState(seed.workspaceId);
  const [workspaceDirectory, setWorkspaceDirectory] = useState<Workspace[]>(
    seed.workspaces
  );
  const workspaceIdRef = useRef(workspaceId);
  useEffect(() => {
    workspaceIdRef.current = workspaceId;
  }, [workspaceId]);
  const [projects, setProjects] = useState<Project[]>(seed.projects);
  const [tasks, setTasks] = useState<Task[]>(seed.tasks);
  const [milestones, setMilestones] = useState<Milestone[]>(seed.milestones);
  const [documents, setDocuments] = useState<ProjectDocument[]>(seed.documents);
  const [comments, setComments] = useState<ProjectComment[]>(seed.comments);
  const [submissions, setSubmissions] = useState<Submission[]>(seed.submissions);
  const [activity, setActivity] = useState<ActivityItem[]>(seed.activity);
  const [searchQuery, setSearchQuery] = useState("");
  const [opportunities, setOpportunities] = useState(seed.opportunities);
  const [quotations, setQuotations] = useState(seed.quotations);
  const [assignments, setAssignments] = useState(seed.assignments);
  const [workSubmissions, setWorkSubmissions] = useState(seed.workSubmissions);
  const [threads, setThreads] = useState(seed.threads);
  const [messages, setMessages] = useState(seed.messages);
  const [invoices, setInvoices] = useState<Invoice[]>(seed.invoices);
  const [earnings, setEarnings] = useState(seed.earnings);
  const [portalNotifications, setPortalNotifications] = useState(
    seed.portalNotifications
  );
  const [developers, setDevelopers] = useState(seed.developers);
  const [saved, setSaved] = useState(seed.saved);
  const [clients, setClients] = useState<Client[]>(seed.clients);
  const [team, setTeam] = useState<TeamMember[]>(seed.team);
  const skipPersist = useRef(true);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- demo localStorage rehydrate */
    const snap = loadWorkspaceSnapshot();
    if (snap) {
      setWorkspaceIdState(snap.workspaceId || seed.workspaceId);
      if (Array.isArray(snap.workspaces) && snap.workspaces.length > 0) {
        setWorkspaceDirectory(snap.workspaces as Workspace[]);
      }
      if (Array.isArray(snap.projects)) setProjects(snap.projects as Project[]);
      if (Array.isArray(snap.tasks)) setTasks(snap.tasks as Task[]);
      if (Array.isArray(snap.milestones))
        setMilestones(snap.milestones as Milestone[]);
      if (Array.isArray(snap.documents))
        setDocuments(snap.documents as ProjectDocument[]);
      if (Array.isArray(snap.comments))
        setComments(snap.comments as ProjectComment[]);
      if (Array.isArray(snap.submissions))
        setSubmissions(snap.submissions as Submission[]);
      if (Array.isArray(snap.activity))
        setActivity(snap.activity as ActivityItem[]);
      if (Array.isArray(snap.opportunities))
        setOpportunities(snap.opportunities as MarketplaceOpportunity[]);
      if (Array.isArray(snap.quotations))
        setQuotations(snap.quotations as Quotation[]);
      if (Array.isArray(snap.assignments))
        setAssignments(snap.assignments as DeveloperAssignment[]);
      if (Array.isArray(snap.workSubmissions))
        setWorkSubmissions(snap.workSubmissions as WorkSubmissionVersion[]);
      if (Array.isArray(snap.threads))
        setThreads(snap.threads as MessageThread[]);
      if (Array.isArray(snap.messages))
        setMessages(snap.messages as PortalMessage[]);
      if (Array.isArray(snap.invoices)) setInvoices(snap.invoices as Invoice[]);
      if (Array.isArray(snap.earnings))
        setEarnings(snap.earnings as EarningRecord[]);
      if (Array.isArray(snap.portalNotifications))
        setPortalNotifications(
          (snap.portalNotifications as PortalNotification[]).map((n) => ({
            ...n,
            workspaceId: n.workspaceId || "ws1",
          }))
        );
      if (Array.isArray(snap.developers))
        setDevelopers(snap.developers as DeveloperProfile[]);
      if (Array.isArray(snap.saved)) setSaved(snap.saved as SavedOpportunity[]);
      if (Array.isArray(snap.clients)) setClients(snap.clients as Client[]);
      if (Array.isArray(snap.team)) setTeam(snap.team as TeamMember[]);
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    queueMicrotask(() => {
      skipPersist.current = false;
    });
  }, [seed]);

  useEffect(() => {
    if (!hydrated || skipPersist.current) return;
    saveWorkspaceSnapshot({
      workspaceId,
      workspaces: workspaceDirectory,
      projects,
      tasks,
      milestones,
      documents,
      comments,
      submissions,
      activity,
      opportunities,
      quotations,
      assignments,
      workSubmissions,
      threads,
      messages,
      invoices,
      earnings,
      portalNotifications,
      developers,
      saved,
      clients,
      team,
      searchQuery,
    });
  }, [
    hydrated,
    workspaceId,
    workspaceDirectory,
    projects,
    tasks,
    milestones,
    documents,
    comments,
    submissions,
    activity,
    opportunities,
    quotations,
    assignments,
    workSubmissions,
    threads,
    messages,
    invoices,
    earnings,
    portalNotifications,
    developers,
    saved,
    clients,
    team,
    searchQuery,
  ]);

  const workspace =
    workspaceDirectory.find((item) => item.id === workspaceId) ??
    workspaceDirectory[0] ??
    seedWorkspaces[0];

  const notify = useCallback(
    (
      item: Omit<PortalNotification, "id" | "createdAt" | "read" | "workspaceId"> & {
        workspaceId?: string;
      }
    ) => {
      pushNotification(setPortalNotifications, {
        ...item,
        workspaceId: item.workspaceId ?? workspaceIdRef.current,
      });
    },
    []
  );

  const scopedProjects = useMemo(
    () =>
      projects.filter(
        (p) => (p.workspaceId || "ws1") === workspaceId && !p.archived
      ),
    [projects, workspaceId]
  );

  const scopedProjectIds = useMemo(
    () => new Set(scopedProjects.map((p) => p.id)),
    [scopedProjects]
  );

  const scopedTasks = useMemo(
    () => tasks.filter((t) => scopedProjectIds.has(t.projectId)),
    [tasks, scopedProjectIds]
  );

  /** Unique pending reviews — prefer WorkSubmissionVersion; add orphan Submissions only. */
  const pendingApprovalsCount = useMemo(() => {
    const scopedWork = workSubmissions.filter(
      (w) => !w.projectId || scopedProjectIds.has(w.projectId)
    );
    const scopedSubs = submissions.filter((s) =>
      scopedProjectIds.has(s.projectId)
    );
    const workPending = scopedWork.filter(
      (w) =>
        w.status === "submitted" ||
        w.status === "in_review" ||
        (w.authorizedForClient && w.clientApprovalStatus === "pending")
    ).length;
    const orphanSubmissionPending = scopedSubs.filter(
      (s) =>
        !s.workSubmissionId &&
        (s.status === "submitted" || s.status === "in_review")
    ).length;
    return workPending + orphanSubmissionPending;
  }, [workSubmissions, submissions, scopedProjectIds]);

  const resolveDeveloperUserId = useCallback(
    (developerId: string) => {
      const profile = developers.find((d) => d.id === developerId);
      return profile?.userId ?? developerId;
    },
    [developers]
  );

  const resolveClientUserId = useCallback(
    (clientId: string | undefined) => {
      if (!clientId) return "cu1";
      // Demo credentials map c1 → cu1; other clients use clientId as fallback key
      if (clientId === "c1") return "cu1";
      return `client-${clientId}`;
    },
    []
  );

  const setWorkspaceId = useCallback((id: string) => {
    setWorkspaceIdState(id);
  }, []);

  const createWorkspace = useCallback(
    (input: {
      name: string;
      companyName?: string;
      plan?: string;
      color?: string;
      seats?: number;
    }) => {
      const created: Workspace = {
        id: demoId("ws"),
        name: input.name.trim(),
        companyName: (input.companyName ?? input.name).trim(),
        plan: input.plan?.trim() || "Pro",
        color: input.color?.trim() || "#0EA5E9",
        seats: input.seats && input.seats > 0 ? input.seats : 10,
        status: "active",
      };
      setWorkspaceDirectory((prev) => [...prev, created]);
      setWorkspaceIdState(created.id);
      notify({
        portal: "admin",
        userId: currentUser.id,
        workspaceId: created.id,
        title: "Workspace created",
        body: created.name,
        href: "/settings",
      });
      return created;
    },
    [notify]
  );

  const addProject = useCallback((project: Project) => {
    setProjects((prev) => [project, ...prev]);
    pushActivity(setActivity, {
      type: "project_update",
      title: "Project created",
      description: project.name,
      actorName: currentUser.name,
      projectId: project.id,
      projectName: project.name,
    });
  }, []);

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const archiveProject = useCallback((id: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, archived: true, status: "on_hold" as ProjectStatus } : p))
    );
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setTasks((prev) => prev.filter((t) => t.projectId !== id));
    setMilestones((prev) => prev.filter((m) => m.projectId !== id));
  }, []);

  const updateTaskStatus = useCallback(
    (taskId: string, status: TaskStatus) => {
      let touched: Task | undefined;
      setTasks((prev) => {
        const task = prev.find((t) => t.id === taskId);
        touched = task;
        if (task) {
          pushActivity(setActivity, {
            type: "status_change",
            title: "Task status updated",
            description: `${task.title} → ${status}`,
            actorName: currentUser.name,
            projectId: task.projectId,
            projectName: task.projectName,
          });
        }
        const next = prev.map((t) => (t.id === taskId ? { ...t, status } : t));
        if (task?.milestoneId) {
          setMilestones((ms) => {
            const synced = applyMilestoneProgressFromTasks(
              ms,
              next,
              task.milestoneId!
            );
            const nextProjectProgress = projectProgressFromMilestones(
              task.projectId,
              synced
            );
            if (nextProjectProgress !== null) {
              setProjects((ps) =>
                ps.map((p) =>
                  p.id === task.projectId
                    ? { ...p, progress: nextProjectProgress }
                    : p
                )
              );
            }
            return synced;
          });
        }
        return next;
      });

      if (touched && status === "review") {
        notify({
          portal: "admin",
          userId: "u1",
          title: "Task ready for approval",
          body: `${touched.title} — ${touched.projectName}`,
          href: `/projects/${touched.projectId}`,
          workspaceId:
            projects.find((p) => p.id === touched!.projectId)?.workspaceId ||
            workspaceIdRef.current,
        });
      }
    },
    [notify, projects]
  );

  const updateTask = useCallback((taskId: string, patch: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t))
    );
  }, []);

  const addTask = useCallback((task: Task) => {
    setTasks((prev) => [task, ...prev]);
    pushActivity(setActivity, {
      type: "task_assigned",
      title: "Task created",
      description: `${task.title} assigned to ${task.assigneeName}`,
      actorName: currentUser.name,
      projectId: task.projectId,
      projectName: task.projectName,
    });
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const removed = new Set(
        prev
          .filter((t) => t.id === taskId || t.parentId === taskId)
          .map((t) => t.id)
      );
      return prev
        .filter((t) => !removed.has(t.id))
        .map((t) => ({
          ...t,
          dependsOn: (t.dependsOn ?? []).filter((id) => !removed.has(id)),
        }));
    });
  }, []);

  const addMilestone = useCallback((milestone: Milestone) => {
    setMilestones((prev) => [milestone, ...prev]);
  }, []);

  const updateMilestone = useCallback(
    (id: string, patch: Partial<Milestone>) => {
      setMilestones((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
      );
    },
    []
  );

  const updateMilestoneStatus = useCallback(
    (milestoneId: string, status: MilestoneStatus) => {
      setMilestones((prev) =>
        prev.map((m) => {
          if (m.id !== milestoneId) return m;
          pushActivity(setActivity, {
            type: "project_update",
            title: "Milestone updated",
            description: `${m.title} → ${status}`,
            actorName: currentUser.name,
            projectId: m.projectId,
          });
          return {
            ...m,
            status,
            progress: status === "completed" ? 100 : m.progress,
          };
        })
      );
    },
    []
  );

  const deleteMilestone = useCallback((id: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const addComment = useCallback(
    (comment: Omit<ProjectComment, "id" | "createdAt">) => {
      setComments((prev) => [
        { ...comment, id: demoId("cmt"), createdAt: DEMO_TS },
        ...prev,
      ]);
      const project = projects.find((p) => p.id === comment.projectId);
      pushActivity(setActivity, {
        type: "comment",
        title: "New comment",
        description: comment.body.slice(0, 80),
        actorName: comment.authorName,
        projectId: comment.projectId,
        projectName: project?.name,
      });
    },
    [projects]
  );

  const addDocument = useCallback(
    (doc: Omit<ProjectDocument, "id" | "uploadedAt">) => {
      setDocuments((prev) => [
        { ...doc, id: demoId("doc"), uploadedAt: DEMO_TS },
        ...prev,
      ]);
    },
    []
  );

  const deleteDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const updateSubmissionStatus = useCallback(
    (submissionId: string, status: SubmissionStatus, reviewNote?: string) => {
      // Internal review only — never auto-authorizes client review.
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId
            ? {
                ...s,
                status,
                reviewerName: currentUser.name,
                reviewNote: reviewNote ?? s.reviewNote,
                reviewedAt: DEMO_TS,
              }
            : s
        )
      );
      const linked = submissions.find((s) => s.id === submissionId);
      if (linked?.workSubmissionId) {
        setWorkSubmissions((prev) =>
          prev.map((w) =>
            w.id === linked.workSubmissionId
              ? {
                  ...w,
                  status,
                  internalReviewerName: currentUser.name,
                  internalReviewedAt: DEMO_TS,
                  internalReviewNote: reviewNote ?? w.internalReviewNote,
                }
              : w
          )
        );
      }
    },
    [submissions]
  );

  const addSubmission = useCallback(
    (submission: Omit<Submission, "id" | "submittedAt">) => {
      setSubmissions((prev) => [
        { ...submission, id: demoId("sub"), submittedAt: DEMO_TS },
        ...prev,
      ]);
    },
    []
  );

  const authorizeClientReview = useCallback(
    (workSubmissionId: string, note?: string) => {
      const work = workSubmissions.find((w) => w.id === workSubmissionId);
      if (!work) return;
      if (work.status !== "approved") return;

      setWorkSubmissions((prev) =>
        prev.map((w) =>
          w.id === workSubmissionId
            ? {
                ...w,
                authorizedForClient: true,
                clientApprovalStatus: w.requiresClientApproval
                  ? ("pending" as ClientApprovalStatus)
                  : w.clientApprovalStatus,
                internalReviewNote: note ?? w.internalReviewNote,
              }
            : w
        )
      );
      setSubmissions((prev) =>
        prev.map((s) =>
          s.workSubmissionId === workSubmissionId
            ? {
                ...s,
                authorizedForClient: true,
                reviewNote: note ?? s.reviewNote,
                reviewedAt: DEMO_TS,
              }
            : s
        )
      );
      if (work.projectId) {
        const project = projects.find((p) => p.id === work.projectId);
        notify({
          portal: "client",
          userId: resolveClientUserId(project?.clientId),
          title: "Deliverable ready for review",
          body: work.title,
          href: "/client/approvals",
        });
      }
    },
    [workSubmissions, projects, resolveClientUserId, notify]
  );

  const authorizeSubmissionForClient = useCallback(
    (submissionId: string, note?: string) => {
      const submission = submissions.find((s) => s.id === submissionId);
      if (!submission || submission.status !== "approved") return;

      if (submission.workSubmissionId) {
        authorizeClientReview(submission.workSubmissionId, note);
        return;
      }

      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId
            ? {
                ...s,
                authorizedForClient: true,
                reviewNote: note ?? s.reviewNote,
                reviewedAt: DEMO_TS,
                reviewerName: currentUser.name,
              }
            : s
        )
      );

      const project = projects.find((p) => p.id === submission.projectId);
      notify({
        portal: "client",
        userId: resolveClientUserId(project?.clientId),
        title: "Deliverable ready for review",
        body: submission.title,
        href: "/client/approvals",
      });
    },
    [
      submissions,
      authorizeClientReview,
      projects,
      resolveClientUserId,
      notify,
    ]
  );

  const getProjectTasks = useCallback(
    (projectId: string) => tasks.filter((t) => t.projectId === projectId),
    [tasks]
  );

  const addClient = useCallback((client: Client) => {
    setClients((prev) => [client, ...prev]);
  }, []);

  const updateClient = useCallback((id: string, patch: Partial<Client>) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const addTeamMember = useCallback((member: TeamMember) => {
    setTeam((prev) => [member, ...prev]);
  }, []);

  const updateTeamMember = useCallback(
    (id: string, patch: Partial<TeamMember>) => {
      setTeam((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    },
    []
  );

  const savedOpportunityIds = useMemo(
    () => saved.map((s) => s.opportunityId),
    [saved]
  );

  const addOpportunity = useCallback(
    (opp: Omit<MarketplaceOpportunity, "id" | "publishedAt" | "status">) => {
      const id = demoId("opp");
      setOpportunities((prev) => [
        {
          ...opp,
          id,
          publishedAt: DEMO_TS,
          status: "open",
        },
        ...prev,
      ]);
      notify({
        portal: "developer",
        userId: "du1",
        workspaceId: opp.workspaceId || workspaceIdRef.current,
        title: "New marketplace opportunity",
        body: opp.title,
        href: `/developer/marketplace/${id}`,
      });
    },
    [notify]
  );

  const updateOpportunity = useCallback(
    (id: string, patch: Partial<MarketplaceOpportunity>) => {
      setOpportunities((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
      );
    },
    []
  );

  const setOpportunityStatus = useCallback(
    (id: string, status: OpportunityStatus) => {
      setOpportunities((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status } : o))
      );
    },
    []
  );

  const deleteOpportunity = useCallback((id: string) => {
    setOpportunities((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const saveOpportunity = useCallback(
    (opportunityId: string, developerId = "dev1") => {
      setSaved((prev) =>
        prev.some((s) => s.opportunityId === opportunityId)
          ? prev
          : [...prev, { developerId, opportunityId }]
      );
    },
    []
  );

  const unsaveOpportunity = useCallback((opportunityId: string) => {
    setSaved((prev) => prev.filter((s) => s.opportunityId !== opportunityId));
  }, []);

  const submitQuotation = useCallback(
    (quotation: Omit<Quotation, "id" | "submittedAt" | "status">) => {
      setQuotations((prev) => [
        {
          ...quotation,
          id: demoId("q"),
          submittedAt: DEMO_TS,
          status: "pending",
        },
        ...prev,
      ]);
      notify({
        portal: "admin",
        userId: currentUser.id,
        title: "New quotation received",
        body: `${quotation.developerName} quoted $${quotation.price}`,
        href: "/marketplace",
      });
    },
    [notify]
  );

  const updateQuotationStatus = useCallback(
    (id: string, status: QuotationStatus) => {
      setQuotations((prev) =>
        prev.map((q) => (q.id === id ? { ...q, status } : q))
      );
    },
    []
  );

  const acceptQuotation = useCallback(
    (quotationId: string) => {
      const quote = quotations.find((q) => q.id === quotationId);
      if (!quote) return;
      const opp = opportunities.find((o) => o.id === quote.opportunityId);
      if (!opp) return;
      setQuotations((prev) =>
        prev.map((q) =>
          q.opportunityId === quote.opportunityId
            ? {
                ...q,
                status:
                  q.id === quotationId
                    ? ("accepted" as QuotationStatus)
                    : ("rejected" as QuotationStatus),
              }
            : q
        )
      );
      const assignment: DeveloperAssignment = {
        id: demoId("as"),
        opportunityId: opp.id,
        developerId: quote.developerId,
        developerName: quote.developerName,
        title: opp.title,
        projectId: opp.projectId,
        projectName: opp.projectName,
        budget: quote.price,
        currency: opp.currency,
        startDate: "2026-03-11",
        deadline: opp.deadline,
        status: "pending_confirmation",
        progress: 0,
        checklist: opp.deliverables.map((label, index) => ({
          id: demoId(`ck${index}`),
          label,
          done: false,
        })),
        requirements: opp.requirements.join(" · "),
        priceLocked: true,
        deadlineLocked: true,
        quotationId,
      };
      setAssignments((prev) => [assignment, ...prev]);
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === opp.id ? { ...o, status: "filled" as const } : o
        )
      );
      notify({
        portal: "developer",
        userId: resolveDeveloperUserId(quote.developerId),
        title: "Quotation accepted — confirm assignment",
        body: opp.title,
        href: "/developer/my-tasks",
      });
    },
    [quotations, opportunities, resolveDeveloperUserId, notify]
  );

  const acceptFixedOpportunity = useCallback(
    (opportunityId: string, developerId: string, developerName: string) => {
      const opp = opportunities.find((o) => o.id === opportunityId);
      if (!opp) return;
      const assignment: DeveloperAssignment = {
        id: demoId("as"),
        opportunityId,
        developerId,
        developerName,
        title: opp.title,
        projectId: opp.projectId,
        projectName: opp.projectName,
        budget: opp.budgetMax,
        currency: opp.currency,
        startDate: "2026-03-11",
        deadline: opp.deadline,
        status: "pending_confirmation",
        progress: 0,
        checklist: opp.deliverables.map((label, index) => ({
          id: demoId(`ck${index}`),
          label,
          done: false,
        })),
        requirements: opp.requirements.join(" · "),
        priceLocked: true,
        deadlineLocked: true,
      };
      setAssignments((prev) => [assignment, ...prev]);
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === opportunityId ? { ...o, status: "filled" as const } : o
        )
      );
      pushActivity(setActivity, {
        type: "task_assigned",
        title: "Assignment pending confirmation",
        description: `${opp.title} → ${developerName}`,
        actorName: developerName,
        projectId: opp.projectId,
        projectName: opp.projectName,
      });
      notify({
        portal: "admin",
        userId: currentUser.id,
        title: "Assignment awaiting confirmation",
        body: `${developerName} accepted ${opp.title}`,
        href: "/marketplace",
      });
    },
    [opportunities, notify]
  );

  const confirmAssignment = useCallback((assignmentId: string) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignmentId
          ? {
              ...a,
              status: "not_started" as AssignmentStatus,
              priceLocked: true,
              deadlineLocked: true,
            }
          : a
      )
    );
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (assignment) {
      notify({
        portal: "developer",
        userId: resolveDeveloperUserId(assignment.developerId),
        title: "Assignment confirmed",
        body: assignment.title,
        href: `/developer/tasks/${assignmentId}`,
      });
    }
  }, [assignments, resolveDeveloperUserId, notify]);

  const rejectAssignment = useCallback((assignmentId: string) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    if (assignment) {
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === assignment.opportunityId
            ? { ...o, status: "open" as const }
            : o
        )
      );
    }
  }, [assignments]);

  const updateAssignment = useCallback(
    (id: string, patch: Partial<DeveloperAssignment>) => {
      setAssignments((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          const next = { ...a, ...patch };
          if (a.priceLocked && patch.budget !== undefined) {
            next.budget = a.budget;
          }
          if (a.deadlineLocked && patch.deadline !== undefined) {
            next.deadline = a.deadline;
          }
          return next;
        })
      );
    },
    []
  );

  const requestExtension = useCallback(
    (assignmentId: string, requestedDeadline: string, reason: string) => {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId
            ? {
                ...a,
                extensionRequest: {
                  requestedDeadline,
                  reason,
                  status: "pending",
                },
              }
            : a
        )
      );
      notify({
        portal: "admin",
        userId: currentUser.id,
        title: "Deadline extension requested",
        body: reason,
        href: "/marketplace",
      });
    },
    [notify]
  );

  const resolveExtension = useCallback(
    (assignmentId: string, decision: "approved" | "rejected") => {
      setAssignments((prev) =>
        prev.map((a) => {
          if (a.id !== assignmentId || !a.extensionRequest) return a;
          if (decision === "approved") {
            return {
              ...a,
              deadline: a.extensionRequest.requestedDeadline,
              deadlineLocked: true,
              extensionRequest: {
                ...a.extensionRequest,
                status: "approved",
              },
            };
          }
          return {
            ...a,
            extensionRequest: {
              ...a.extensionRequest,
              status: "rejected",
            },
          };
        })
      );
    },
    []
  );

  const addWorkSubmission = useCallback(
    (
      submission: Omit<
        WorkSubmissionVersion,
        | "id"
        | "submittedAt"
        | "version"
        | "authorizedForClient"
        | "clientApprovalStatus"
      > & {
        clientApprovalStatus?: WorkSubmissionVersion["clientApprovalStatus"];
        authorizedForClient?: boolean;
      }
    ) => {
      const createdId = demoId("ws");
      setWorkSubmissions((prev) => {
        const version =
          prev.filter((s) => s.assignmentId === submission.assignmentId)
            .length + 1;
        return [
          {
            ...submission,
            id: createdId,
            submittedAt: DEMO_TS,
            version,
            authorizedForClient: false,
            clientApprovalStatus: "not_required",
            status: "submitted",
          },
          ...prev,
        ];
      });
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === submission.assignmentId
            ? {
                ...a,
                status: "submitted" as AssignmentStatus,
                progress: Math.max(a.progress, 80),
              }
            : a
        )
      );
      if (submission.projectId) {
        addSubmission({
          projectId: submission.projectId,
          title: submission.title,
          description: submission.description,
          submittedBy: submission.submittedBy,
          status: "submitted",
          documentIds: [],
          relatedTaskId: null,
          workSubmissionId: createdId,
          assignmentId: submission.assignmentId,
          authorizedForClient: false,
        });
      }
      notify({
        portal: "admin",
        userId: currentUser.id,
        title: "New developer submission",
        body: submission.title,
        href: "/approvals",
      });
      pushActivity(setActivity, {
        type: "submission",
        title: "Work submitted",
        description: submission.title,
        actorName: submission.submittedBy,
        projectId: submission.projectId,
      });
    },
    [addSubmission, notify]
  );

  const reviewWorkSubmission = useCallback(
    (
      workSubmissionId: string,
      status: Extract<SubmissionStatus, "approved" | "rejected" | "in_review">,
      reviewNote?: string,
      authorizeClient = false
    ) => {
      setWorkSubmissions((prev) =>
        prev.map((w) =>
          w.id === workSubmissionId
            ? {
                ...w,
                status,
                internalReviewerName: currentUser.name,
                internalReviewedAt: DEMO_TS,
                internalReviewNote: reviewNote ?? w.internalReviewNote,
                // Internal review never auto-authorizes client visibility
                authorizedForClient: authorizeClient
                  ? true
                  : w.authorizedForClient,
                clientApprovalStatus:
                  authorizeClient && w.requiresClientApproval
                    ? "pending"
                    : w.clientApprovalStatus,
              }
            : w
        )
      );
      setSubmissions((prev) =>
        prev.map((s) =>
          s.workSubmissionId === workSubmissionId
            ? {
                ...s,
                status,
                reviewerName: currentUser.name,
                reviewNote: reviewNote ?? s.reviewNote,
                reviewedAt: DEMO_TS,
                authorizedForClient: authorizeClient
                  ? true
                  : s.authorizedForClient,
              }
            : s
        )
      );
      const work = workSubmissions.find((w) => w.id === workSubmissionId);
      if (work) {
        if (status === "rejected") {
          setAssignments((prev) =>
            prev.map((a) =>
              a.id === work.assignmentId
                ? { ...a, status: "revision_requested" as AssignmentStatus }
                : a
            )
          );
        }
        const assignment = assignments.find((a) => a.id === work.assignmentId);
        notify({
          portal: "developer",
          userId: resolveDeveloperUserId(assignment?.developerId ?? "dev1"),
          title:
            status === "rejected"
              ? "Revision requested"
              : authorizeClient
                ? "Approved — sent to client"
                : `Submission ${status}`,
          body: work.title,
          href: `/developer/tasks/${work.assignmentId}`,
        });
      }
      // Prefer explicit authorizeClientReview after status is approved
      if (authorizeClient && status === "approved") {
        authorizeClientReview(workSubmissionId, reviewNote);
      }
    },
    [
      workSubmissions,
      authorizeClientReview,
      assignments,
      resolveDeveloperUserId,
      notify,
    ]
  );

  const clientReviewWork = useCallback(
    (
      workSubmissionId: string,
      decision: Extract<
        ClientApprovalStatus,
        "approved" | "revision_requested" | "rejected"
      >,
      note?: string,
      reviewerName = "Client"
    ) => {
      const work = workSubmissions.find((s) => s.id === workSubmissionId);
      if (!work || !work.authorizedForClient) return;

      const assignment = assignments.find((a) => a.id === work.assignmentId);
      const developerUserId = resolveDeveloperUserId(
        assignment?.developerId ?? "dev1"
      );
      const nextStatus: SubmissionStatus =
        decision === "approved" ? "approved" : "rejected";

      setWorkSubmissions((prev) =>
        prev.map((s) => {
          if (s.id !== workSubmissionId) return s;
          return {
            ...s,
            clientApprovalStatus: decision,
            status: nextStatus,
            revisionNotes: note ?? s.revisionNotes,
            clientReviewerName: reviewerName,
            clientReviewedAt: DEMO_TS,
            // Client rejection/revision revokes client authorization until re-authorized
            authorizedForClient:
              decision === "approved" ? true : false,
          };
        })
      );

      // Keep linked admin Submission rows in sync
      setSubmissions((prev) =>
        prev.map((s) =>
          s.workSubmissionId === workSubmissionId
            ? {
                ...s,
                status: nextStatus,
                reviewNote: note ?? s.reviewNote,
                reviewedAt: DEMO_TS,
                authorizedForClient: decision === "approved",
              }
            : s
        )
      );

      if (decision === "revision_requested" || decision === "rejected") {
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === work.assignmentId
              ? { ...a, status: "revision_requested" as AssignmentStatus }
              : a
          )
        );
        notify({
          portal: "developer",
          userId: developerUserId,
          title:
            decision === "rejected"
              ? "Client rejected deliverable"
              : "Client requested revisions",
          body: work.title,
          href: `/developer/tasks/${work.assignmentId}`,
        });
        notify({
          portal: "admin",
          userId: currentUser.id,
          title: "Client review outcome",
          body: `${work.title} — ${decision.replace("_", " ")}`,
          href: "/approvals",
        });
      }

      if (decision === "approved") {
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === work.assignmentId
              ? {
                  ...a,
                  status: "approved" as AssignmentStatus,
                  progress: 100,
                }
              : a
          )
        );
        // Demo rule: linked milestone → 100%; project progress = average of
        // that project's milestone.progress values (no arbitrary +N bump).
        if (work.milestoneId) {
          setMilestones((prev) => {
            const nextMilestones = prev.map((m) =>
              m.id === work.milestoneId
                ? {
                    ...m,
                    status: "completed" as MilestoneStatus,
                    progress: 100,
                  }
                : m
            );
            if (work.projectId) {
              const progress = projectProgressFromMilestones(
                work.projectId,
                nextMilestones
              );
              if (progress != null) {
                const allDone = nextMilestones
                  .filter((m) => m.projectId === work.projectId)
                  .every((m) => m.status === "completed");
                setProjects((ps) =>
                  ps.map((p) =>
                    p.id === work.projectId
                      ? {
                          ...p,
                          progress,
                          status: allDone
                            ? ("completed" as ProjectStatus)
                            : p.status,
                        }
                      : p
                  )
                );
              }
            }
            return nextMilestones;
          });
        }

        // Demo rule: one approved earning for the full assignment budget.
        setEarnings((prev) => {
          const exists = prev.some(
            (e) =>
              e.assignmentId === work.assignmentId && e.status !== "paid"
          );
          if (exists) return prev;
          return [
            {
              id: demoId("ear"),
              assignmentId: work.assignmentId,
              assignmentTitle: assignment?.title ?? work.title,
              developerId: assignment?.developerId ?? "dev1",
              amount: assignment?.budget ?? 0,
              currency: assignment?.currency ?? "USD",
              status: "approved" as const,
              earnedAt: "2026-03-11",
            },
            ...prev,
          ];
        });

        if (assignment?.developerId) {
          setDevelopers((prev) =>
            prev.map((d) =>
              d.id === assignment.developerId
                ? {
                    ...d,
                    completedAssignments: d.completedAssignments + 1,
                    totalEarnings: d.totalEarnings + (assignment.budget ?? 0),
                  }
                : d
            )
          );
        }

        pushActivity(setActivity, {
          type: "approval",
          title: "Client approved deliverable",
          description: work.title,
          actorName: reviewerName,
          projectId: work.projectId,
        });
        notify({
          portal: "developer",
          userId: developerUserId,
          workspaceId:
            projects.find((p) => p.id === work.projectId)?.workspaceId ||
            workspaceIdRef.current,
          title: "Client approved your submission",
          body: work.title,
          href: `/developer/tasks/${work.assignmentId}`,
        });
      }
    },
    [workSubmissions, assignments, resolveDeveloperUserId, notify, projects]
  );

  const sendMessage = useCallback(
    (message: Omit<PortalMessage, "id" | "createdAt" | "read">) => {
      setMessages((prev) => [
        {
          ...message,
          id: demoId("msg"),
          createdAt: DEMO_TS,
          read: true,
        },
        ...prev,
      ]);
      setThreads((prev) =>
        prev.map((t) =>
          t.id === message.threadId
            ? { ...t, lastMessageAt: DEMO_TS, unreadCount: 0 }
            : t
        )
      );
    },
    []
  );

  const createThread = useCallback(
    (thread: Omit<MessageThread, "id" | "lastMessageAt" | "unreadCount">) => {
      const id = demoId("th");
      setThreads((prev) => [
        {
          ...thread,
          id,
          lastMessageAt: DEMO_TS,
          unreadCount: 0,
        },
        ...prev,
      ]);
      return id;
    },
    []
  );

  const updateDeveloperProfile = useCallback(
    (id: string, patch: Partial<DeveloperProfile>) => {
      setDevelopers((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
      );
    },
    []
  );

  const registerDeveloper = useCallback(
    (profile: DeveloperProfile) => {
      setDevelopers((prev) => [profile, ...prev]);
      notify({
        portal: "admin",
        userId: currentUser.id,
        title: "Developer registration pending",
        body: profile.name,
        href: "/team",
      });
    },
    [notify]
  );

  const setDeveloperStatus = useCallback(
    (id: string, status: DeveloperStatus) => {
      const profile = developers.find((d) => d.id === id);
      setDevelopers((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status } : d))
      );
      notify({
        portal: "developer",
        userId: profile?.userId ?? id,
        title:
          status === "verified"
            ? "Verification approved"
            : `Developer status: ${status}`,
        body: "Your developer profile was updated.",
        href: "/developer/profile",
      });
    },
    [developers, notify]
  );

  const markNotificationRead = useCallback((id: string) => {
    setPortalNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllNotificationsRead = useCallback(
    (portal: PortalNotification["portal"], userId: string) => {
      const scopedWorkspace = workspaceIdRef.current;
      setPortalNotifications((prev) =>
        prev.map((n) =>
          n.portal === portal &&
          n.userId === userId &&
          (n.workspaceId || "ws1") === scopedWorkspace
            ? { ...n, read: true }
            : n
        )
      );
    },
    []
  );

  const addInvoice = useCallback((invoice: Invoice) => {
    setInvoices((prev) => [invoice, ...prev]);
  }, []);

  const updateInvoice = useCallback((id: string, patch: Partial<Invoice>) => {
    setInvoices((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const next = { ...i, ...patch };
        if (patch.status === ("paid" as InvoiceStatus) && !next.paidAt) {
          next.paidAt = "2026-03-11";
        }
        return next;
      })
    );
  }, []);

  const markEarningPaid = useCallback((id: string) => {
    setEarnings((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: "paid", paidAt: "2026-03-11" } : e
      )
    );
  }, []);

  const resetDemoData = useCallback(() => {
    const next = seedState();
    skipPersist.current = true;
    setWorkspaceIdState(next.workspaceId);
    setWorkspaceDirectory(next.workspaces);
    setProjects(next.projects);
    setTasks(next.tasks);
    setMilestones(next.milestones);
    setDocuments(next.documents);
    setComments(next.comments);
    setSubmissions(next.submissions);
    setActivity(next.activity);
    setOpportunities(next.opportunities);
    setQuotations(next.quotations);
    setAssignments(next.assignments);
    setWorkSubmissions(next.workSubmissions);
    setThreads(next.threads);
    setMessages(next.messages);
    setInvoices(next.invoices);
    setEarnings(next.earnings);
    setPortalNotifications(next.portalNotifications);
    setDevelopers(next.developers);
    setSaved(next.saved);
    setClients(next.clients);
    setTeam(next.team);
    setSearchQuery("");
    queueMicrotask(() => {
      skipPersist.current = false;
      saveWorkspaceSnapshot({
        workspaceId: next.workspaceId,
        workspaces: next.workspaces,
        projects: next.projects,
        tasks: next.tasks,
        milestones: next.milestones,
        documents: next.documents,
        comments: next.comments,
        submissions: next.submissions,
        activity: next.activity,
        opportunities: next.opportunities,
        quotations: next.quotations,
        assignments: next.assignments,
        workSubmissions: next.workSubmissions,
        threads: next.threads,
        messages: next.messages,
        invoices: next.invoices,
        earnings: next.earnings,
        portalNotifications: next.portalNotifications,
        developers: next.developers,
        saved: next.saved,
        clients: next.clients,
        team: next.team,
      });
    });
  }, []);

  const value = useMemo<WorkspaceStoreValue>(
    () => ({
      hydrated,
      workspace,
      workspaces: workspaceDirectory,
      setWorkspaceId,
      createWorkspace,
      clients: clients.filter((c) => !c.workspaceId || c.workspaceId === workspaceId),
      team: team.filter((m) => !m.workspaceId || m.workspaceId === workspaceId),
      projects: scopedProjects,
      tasks: scopedTasks,
      milestones: milestones.filter((m) => scopedProjectIds.has(m.projectId)),
      documents: documents.filter((d) => scopedProjectIds.has(d.projectId)),
      comments: comments.filter((c) => scopedProjectIds.has(c.projectId)),
      submissions: submissions.filter((s) => scopedProjectIds.has(s.projectId)),
      activity: activity.filter(
        (a) => !a.projectId || scopedProjectIds.has(a.projectId)
      ),
      kpis: buildKpis(
        scopedProjects,
        scopedTasks.filter((t) => !t.parentId),
        pendingApprovalsCount,
        team.filter((m) => !m.workspaceId || m.workspaceId === workspaceId)
          .length
      ),
      searchQuery,
      setSearchQuery,
      addProject,
      updateProject,
      archiveProject,
      deleteProject,
      updateTaskStatus,
      updateTask,
      addTask,
      deleteTask,
      addMilestone,
      updateMilestone,
      updateMilestoneStatus,
      deleteMilestone,
      addComment,
      addDocument,
      deleteDocument,
      updateSubmissionStatus,
      addSubmission,
      authorizeClientReview,
      authorizeSubmissionForClient,
      getProjectTasks,
      addClient,
      updateClient,
      addTeamMember,
      updateTeamMember,
      opportunities: opportunities.filter(
        (o) => !o.workspaceId || o.workspaceId === workspaceId
      ),
      quotations: quotations.filter((q) => {
        const opp = opportunities.find((o) => o.id === q.opportunityId);
        if (!opp) return true;
        return !opp.workspaceId || opp.workspaceId === workspaceId;
      }),
      assignments: assignments.filter(
        (a) => !a.projectId || scopedProjectIds.has(a.projectId)
      ),
      workSubmissions: workSubmissions.filter(
        (w) => !w.projectId || scopedProjectIds.has(w.projectId)
      ),
      threads: threads.filter(
        (t) => !t.projectId || scopedProjectIds.has(t.projectId)
      ),
      messages: (() => {
        const scopedThreadIds = new Set(
          threads
            .filter((t) => !t.projectId || scopedProjectIds.has(t.projectId))
            .map((t) => t.id)
        );
        return messages.filter((m) => scopedThreadIds.has(m.threadId));
      })(),
      invoices: invoices.filter((i) => scopedProjectIds.has(i.projectId)),
      earnings: earnings.filter((e) => {
        const a = assignments.find((x) => x.id === e.assignmentId);
        return !a?.projectId || scopedProjectIds.has(a.projectId);
      }),
      portalNotifications: portalNotifications.filter(
        (n) => (n.workspaceId || "ws1") === workspaceId
      ),
      developers: developers.filter(
        (d) => !d.workspaceId || d.workspaceId === workspaceId
      ),
      savedOpportunityIds,
      addOpportunity,
      updateOpportunity,
      setOpportunityStatus,
      deleteOpportunity,
      saveOpportunity,
      unsaveOpportunity,
      submitQuotation,
      updateQuotationStatus,
      acceptQuotation,
      acceptFixedOpportunity,
      confirmAssignment,
      rejectAssignment,
      updateAssignment,
      requestExtension,
      resolveExtension,
      addWorkSubmission,
      reviewWorkSubmission,
      clientReviewWork,
      sendMessage,
      createThread,
      updateDeveloperProfile,
      registerDeveloper,
      setDeveloperStatus,
      markNotificationRead,
      markAllNotificationsRead,
      addInvoice,
      updateInvoice,
      markEarningPaid,
      resetDemoData,
    }),
    [
      hydrated,
      workspace,
      workspaceDirectory,
      workspaceId,
      createWorkspace,
      clients,
      team,
      scopedProjects,
      scopedTasks,
      milestones,
      documents,
      comments,
      submissions,
      activity,
      scopedProjectIds,
      pendingApprovalsCount,
      searchQuery,
      opportunities,
      quotations,
      assignments,
      workSubmissions,
      threads,
      messages,
      invoices,
      earnings,
      portalNotifications,
      developers,
      savedOpportunityIds,
      setWorkspaceId,
      addProject,
      updateProject,
      archiveProject,
      deleteProject,
      updateTaskStatus,
      updateTask,
      addTask,
      deleteTask,
      addMilestone,
      updateMilestone,
      updateMilestoneStatus,
      deleteMilestone,
      addComment,
      addDocument,
      deleteDocument,
      updateSubmissionStatus,
      addSubmission,
      authorizeClientReview,
      authorizeSubmissionForClient,
      getProjectTasks,
      addClient,
      updateClient,
      addTeamMember,
      updateTeamMember,
      addOpportunity,
      updateOpportunity,
      setOpportunityStatus,
      deleteOpportunity,
      saveOpportunity,
      unsaveOpportunity,
      submitQuotation,
      updateQuotationStatus,
      acceptQuotation,
      acceptFixedOpportunity,
      confirmAssignment,
      rejectAssignment,
      updateAssignment,
      requestExtension,
      resolveExtension,
      addWorkSubmission,
      reviewWorkSubmission,
      clientReviewWork,
      sendMessage,
      createThread,
      updateDeveloperProfile,
      registerDeveloper,
      setDeveloperStatus,
      markNotificationRead,
      markAllNotificationsRead,
      addInvoice,
      updateInvoice,
      markEarningPaid,
      resetDemoData,
    ]
  );

  return (
    <WorkspaceStoreContext.Provider value={value}>
      {children}
    </WorkspaceStoreContext.Provider>
  );
}

export function useWorkspaceStore() {
  const ctx = useContext(WorkspaceStoreContext);
  if (!ctx) {
    throw new Error("useWorkspaceStore must be used within WorkspaceStoreProvider");
  }
  return ctx;
}
