"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  buildKpis,
  currentUser,
  initialActivity,
  initialProjects,
  initialTasks,
  workspaces,
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
import type {
  ActivityItem,
  Milestone,
  MilestoneStatus,
  Project,
  ProjectComment,
  ProjectDocument,
  Submission,
  SubmissionStatus,
  Task,
  TaskStatus,
  Workspace,
} from "@/lib/types";
import type {
  AssignmentStatus,
  ClientApprovalStatus,
  DeveloperAssignment,
  DeveloperProfile,
  EarningRecord,
  Invoice,
  MarketplaceOpportunity,
  MessageThread,
  PortalMessage,
  PortalNotification,
  Quotation,
  QuotationStatus,
  SavedOpportunity,
  WorkSubmissionVersion,
} from "@/lib/portal-types";

interface WorkspaceStoreValue {
  workspace: Workspace;
  workspaces: Workspace[];
  setWorkspaceId: (id: string) => void;
  projects: Project[];
  tasks: Task[];
  milestones: Milestone[];
  documents: ProjectDocument[];
  comments: ProjectComment[];
  submissions: Submission[];
  activity: ActivityItem[];
  kpis: ReturnType<typeof buildKpis>;
  addProject: (project: Project) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  updateTask: (taskId: string, patch: Partial<Task>) => void;
  addTask: (task: Task) => void;
  updateMilestoneStatus: (milestoneId: string, status: MilestoneStatus) => void;
  addComment: (comment: Omit<ProjectComment, "id" | "createdAt">) => void;
  addDocument: (doc: Omit<ProjectDocument, "id" | "uploadedAt">) => void;
  updateSubmissionStatus: (
    submissionId: string,
    status: SubmissionStatus,
    reviewNote?: string
  ) => void;
  addSubmission: (submission: Omit<Submission, "id" | "submittedAt">) => void;
  getProjectTasks: (projectId: string) => Task[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Portal domain
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
  saveOpportunity: (opportunityId: string) => void;
  unsaveOpportunity: (opportunityId: string) => void;
  submitQuotation: (quotation: Omit<Quotation, "id" | "submittedAt" | "status">) => void;
  acceptFixedOpportunity: (opportunityId: string, developerId: string, developerName: string) => void;
  updateAssignment: (id: string, patch: Partial<DeveloperAssignment>) => void;
  addWorkSubmission: (
    submission: Omit<WorkSubmissionVersion, "id" | "submittedAt" | "version">
  ) => void;
  clientReviewWork: (
    workSubmissionId: string,
    decision: Extract<
      ClientApprovalStatus,
      "approved" | "revision_requested" | "rejected"
    >,
    note?: string
  ) => void;
  sendMessage: (
    message: Omit<PortalMessage, "id" | "createdAt" | "read">
  ) => void;
  updateDeveloperProfile: (id: string, patch: Partial<DeveloperProfile>) => void;
  registerDeveloper: (profile: DeveloperProfile) => void;
  markNotificationRead: (id: string) => void;
  updateQuotationStatus: (id: string, status: QuotationStatus) => void;
}

const WorkspaceStoreContext = createContext<WorkspaceStoreValue | null>(null);

const DEMO_TS = "2026-03-11T12:05:00Z";

function pushActivity(
  setActivity: React.Dispatch<React.SetStateAction<ActivityItem[]>>,
  item: Omit<ActivityItem, "id" | "timestamp">
) {
  setActivity((prev) => [
    {
      ...item,
      id: `a${Date.now()}`,
      timestamp: DEMO_TS,
    },
    ...prev,
  ]);
}

export function WorkspaceStoreProvider({ children }: { children: ReactNode }) {
  const [workspaceId, setWorkspaceId] = useState(workspaces[0].id);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [documents, setDocuments] =
    useState<ProjectDocument[]>(initialDocuments);
  const [comments, setComments] = useState<ProjectComment[]>(initialComments);
  const [submissions, setSubmissions] =
    useState<Submission[]>(initialSubmissions);
  const [activity, setActivity] = useState<ActivityItem[]>(initialActivity);
  const [searchQuery, setSearchQuery] = useState("");

  const [opportunities, setOpportunities] =
    useState<MarketplaceOpportunity[]>(initialOpportunities);
  const [quotations, setQuotations] = useState<Quotation[]>(initialQuotations);
  const [assignments, setAssignments] =
    useState<DeveloperAssignment[]>(initialAssignments);
  const [workSubmissions, setWorkSubmissions] = useState<WorkSubmissionVersion[]>(
    initialWorkSubmissions
  );
  const [threads, setThreads] = useState<MessageThread[]>(initialThreads);
  const [messages, setMessages] = useState<PortalMessage[]>(initialMessages);
  const [invoices] = useState<Invoice[]>(initialInvoices);
  const [earnings, setEarnings] = useState<EarningRecord[]>(initialEarnings);
  const [portalNotifications, setPortalNotifications] = useState(
    initialPortalNotifications
  );
  const [developers, setDevelopers] =
    useState<DeveloperProfile[]>(seedDevelopers);
  const [saved, setSaved] = useState<SavedOpportunity[]>([
    { developerId: "dev1", opportunityId: "opp3" },
  ]);

  const workspace =
    workspaces.find((item) => item.id === workspaceId) ?? workspaces[0];

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

  const updateTaskStatus = useCallback((taskId: string, status: TaskStatus) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
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
      return prev.map((t) => (t.id === taskId ? { ...t, status } : t));
    });
  }, []);

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

  const addComment = useCallback(
    (comment: Omit<ProjectComment, "id" | "createdAt">) => {
      setComments((prev) => [
        { ...comment, id: `cmt${Date.now()}`, createdAt: DEMO_TS },
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
        { ...doc, id: `doc${Date.now()}`, uploadedAt: DEMO_TS },
        ...prev,
      ]);
    },
    []
  );

  const updateSubmissionStatus = useCallback(
    (submissionId: string, status: SubmissionStatus, reviewNote?: string) => {
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId
            ? {
                ...s,
                status,
                reviewerName: currentUser.name,
                reviewNote: reviewNote ?? s.reviewNote,
              }
            : s
        )
      );
    },
    []
  );

  const addSubmission = useCallback(
    (submission: Omit<Submission, "id" | "submittedAt">) => {
      setSubmissions((prev) => [
        { ...submission, id: `sub${Date.now()}`, submittedAt: DEMO_TS },
        ...prev,
      ]);
    },
    []
  );

  const getProjectTasks = useCallback(
    (projectId: string) => tasks.filter((t) => t.projectId === projectId),
    [tasks]
  );

  const savedOpportunityIds = useMemo(
    () => saved.map((s) => s.opportunityId),
    [saved]
  );

  const saveOpportunity = useCallback((opportunityId: string) => {
    setSaved((prev) =>
      prev.some((s) => s.opportunityId === opportunityId)
        ? prev
        : [...prev, { developerId: "dev1", opportunityId }]
    );
  }, []);

  const unsaveOpportunity = useCallback((opportunityId: string) => {
    setSaved((prev) => prev.filter((s) => s.opportunityId !== opportunityId));
  }, []);

  const submitQuotation = useCallback(
    (quotation: Omit<Quotation, "id" | "submittedAt" | "status">) => {
      setQuotations((prev) => [
        {
          ...quotation,
          id: `q${Date.now()}`,
          submittedAt: DEMO_TS,
          status: "pending",
        },
        ...prev,
      ]);
    },
    []
  );

  const acceptFixedOpportunity = useCallback(
    (opportunityId: string, developerId: string, developerName: string) => {
      const opp = opportunities.find((o) => o.id === opportunityId);
      if (!opp) return;
      const assignment: DeveloperAssignment = {
        id: `as${Date.now()}`,
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
        status: "not_started",
        progress: 0,
        checklist: opp.deliverables.map((label, index) => ({
          id: `ck${Date.now()}${index}`,
          label,
          done: false,
        })),
        requirements: opp.requirements.join(" · "),
      };
      setAssignments((prev) => [assignment, ...prev]);
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === opportunityId ? { ...o, status: "filled" as const } : o
        )
      );
      pushActivity(setActivity, {
        type: "task_assigned",
        title: "Assignment created",
        description: `${opp.title} assigned to ${developerName} (pending admin confirmation in production)`,
        actorName: developerName,
        projectId: opp.projectId,
        projectName: opp.projectName,
      });
    },
    [opportunities]
  );

  const updateAssignment = useCallback(
    (id: string, patch: Partial<DeveloperAssignment>) => {
      setAssignments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
      );
    },
    []
  );

  const addWorkSubmission = useCallback(
    (
      submission: Omit<WorkSubmissionVersion, "id" | "submittedAt" | "version">
    ) => {
      setWorkSubmissions((prev) => {
        const version =
          prev.filter((s) => s.assignmentId === submission.assignmentId).length +
          1;
        return [
          {
            ...submission,
            id: `ws${Date.now()}`,
            submittedAt: DEMO_TS,
            version,
          },
          ...prev,
        ];
      });
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === submission.assignmentId
            ? { ...a, status: "submitted" as AssignmentStatus, progress: Math.max(a.progress, 80) }
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
        });
      }
    },
    [addSubmission]
  );

  const clientReviewWork = useCallback(
    (
      workSubmissionId: string,
      decision: Extract<
        ClientApprovalStatus,
        "approved" | "revision_requested" | "rejected"
      >,
      note?: string
    ) => {
      setWorkSubmissions((prev) =>
        prev.map((s) => {
          if (s.id !== workSubmissionId) return s;
          const nextStatus: SubmissionStatus =
            decision === "approved"
              ? "approved"
              : decision === "revision_requested"
                ? "rejected"
                : "rejected";
          return {
            ...s,
            clientApprovalStatus: decision,
            status: nextStatus,
            revisionNotes: note ?? s.revisionNotes,
          };
        })
      );

      const work = workSubmissions.find((s) => s.id === workSubmissionId);
      if (!work) return;

      if (decision === "revision_requested") {
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === work.assignmentId
              ? { ...a, status: "revision_requested" as AssignmentStatus }
              : a
          )
        );
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
        if (work.milestoneId) {
          setMilestones((prev) =>
            prev.map((m) =>
              m.id === work.milestoneId
                ? { ...m, status: "completed", progress: 100 }
                : m
            )
          );
        }
        if (work.projectId) {
          setProjects((prev) =>
            prev.map((p) =>
              p.id === work.projectId
                ? { ...p, progress: Math.min(100, p.progress + 5) }
                : p
            )
          );
        }
        setEarnings((prev) => [
          {
            id: `ear${Date.now()}`,
            assignmentId: work.assignmentId,
            assignmentTitle: work.title,
            developerId:
              assignments.find((a) => a.id === work.assignmentId)?.developerId ??
              "dev1",
            amount:
              (assignments.find((a) => a.id === work.assignmentId)?.budget ??
                0) / 2,
            currency: "USD",
            status: "approved",
            earnedAt: "2026-03-11",
          },
          ...prev,
        ]);
        pushActivity(setActivity, {
          type: "approval",
          title: "Client approved deliverable",
          description: work.title,
          actorName: "Client",
          projectId: work.projectId,
        });
      }
    },
    [workSubmissions, assignments]
  );

  const sendMessage = useCallback(
    (message: Omit<PortalMessage, "id" | "createdAt" | "read">) => {
      setMessages((prev) => [
        { ...message, id: `msg${Date.now()}`, createdAt: DEMO_TS, read: true },
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

  const updateDeveloperProfile = useCallback(
    (id: string, patch: Partial<DeveloperProfile>) => {
      setDevelopers((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
      );
    },
    []
  );

  const registerDeveloper = useCallback((profile: DeveloperProfile) => {
    setDevelopers((prev) => [profile, ...prev]);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setPortalNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const updateQuotationStatus = useCallback(
    (id: string, status: QuotationStatus) => {
      setQuotations((prev) =>
        prev.map((q) => (q.id === id ? { ...q, status } : q))
      );
    },
    []
  );

  const value = useMemo(
    () => ({
      workspace,
      workspaces,
      setWorkspaceId,
      projects,
      tasks,
      milestones,
      documents,
      comments,
      submissions,
      activity,
      kpis: buildKpis(
        projects,
        tasks.filter((t) => !t.parentId)
      ),
      addProject,
      updateTaskStatus,
      updateTask,
      addTask,
      updateMilestoneStatus,
      addComment,
      addDocument,
      updateSubmissionStatus,
      addSubmission,
      getProjectTasks,
      searchQuery,
      setSearchQuery,
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
      saveOpportunity,
      unsaveOpportunity,
      submitQuotation,
      acceptFixedOpportunity,
      updateAssignment,
      addWorkSubmission,
      clientReviewWork,
      sendMessage,
      updateDeveloperProfile,
      registerDeveloper,
      markNotificationRead,
      updateQuotationStatus,
    }),
    [
      workspace,
      projects,
      tasks,
      milestones,
      documents,
      comments,
      submissions,
      activity,
      addProject,
      updateTaskStatus,
      updateTask,
      addTask,
      updateMilestoneStatus,
      addComment,
      addDocument,
      updateSubmissionStatus,
      addSubmission,
      getProjectTasks,
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
      saveOpportunity,
      unsaveOpportunity,
      submitQuotation,
      acceptFixedOpportunity,
      updateAssignment,
      addWorkSubmission,
      clientReviewWork,
      sendMessage,
      updateDeveloperProfile,
      registerDeveloper,
      markNotificationRead,
      updateQuotationStatus,
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
