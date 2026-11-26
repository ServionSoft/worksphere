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
import { runApi } from "@/lib/api/run-api";
import {
  acceptApiFixedOpportunity,
  acceptApiQuotation,
  archiveApiProject,
  authorizeApiSubmission,
  authorizeApiTask,
  clientReviewApiTask,
  clientReviewApiWork,
  confirmApiAssignment,
  createApiClient,
  inviteApiClient,
  createApiComment,
  createApiDocument,
  createApiInvoice,
  createApiMilestone,
  createApiOpportunity,
  createApiProject,
  createApiTask,
  createApiThread,
  createApiWorkSubmission,
  createApiWorkspace,
  deleteApiDocument,
  deleteApiMilestone,
  deleteApiOpportunity,
  deleteApiProject,
  deleteApiTask,
  getApiDeveloper,
  listApiThreadMessages,
  listApiThreads,
  listApiWorkspaces,
  loadWorkspaceBootstrap,
  listApiNotifications,
  markApiAllNotificationsRead,
  markApiEarningPaid,
  markApiNotificationRead,
  markApiThreadRead,
  patchApiAssignment,
  patchApiClient,
  patchApiDeveloper,
  patchApiInvoice,
  patchApiMilestone,
  patchApiMilestoneStatus,
  patchApiOpportunity,
  patchApiProject,
  patchApiQuotation,
  patchApiTask,
  patchApiTaskStatus,
  registerApiDeveloper,
  rejectApiAssignment,
  requestApiExtension,
  requestApiTaskExtension,
  resolveApiExtension,
  resolveApiTaskExtension,
  reviewApiWorkSubmission,
  saveApiOpportunity,
  sendApiMessage,
  setApiDeveloperStatus,
  setApiOpportunityStatus,
  submitApiQuotation,
  unsaveApiOpportunity,
  type WorkspaceBootstrap,
} from "@/lib/api/workspace-api";
import { setApiWorkspaceId } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-store";
import { isApiDataSource } from "@/lib/data-source";
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
  clearWorkspaceSnapshot,
  loadWorkspaceSnapshot,
  saveWorkspaceSnapshot,
} from "@/lib/store-persist";
import {
  normalizeTaskClientGate,
  taskNeedsClientApproval,
} from "@/lib/portal-selectors";
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
  TaskClientApprovalStatus,
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
  AwardQuotationInput,
  Quotation,
  QuotationPatchInput,
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
  workspaceId: string;
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
  deleteProject: (
    id: string,
    confirmName: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  updateTask: (taskId: string, patch: Partial<Task>) => void;
  addTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  authorizeTaskForClient: (taskId: string) => void;
  clientReviewTask: (
    taskId: string,
    decision: Extract<
      TaskClientApprovalStatus,
      "approved" | "revision_requested" | "rejected"
    >,
    note?: string
  ) => void;
  addMilestone: (milestone: Milestone) => Promise<Milestone>;
  updateMilestone: (id: string, patch: Partial<Milestone>) => void;
  updateMilestoneStatus: (milestoneId: string, status: MilestoneStatus) => void;
  deleteMilestone: (id: string) => void;
  addComment: (comment: Omit<ProjectComment, "id" | "createdAt">) => void;
  addDocument: (
    doc: Omit<ProjectDocument, "id" | "uploadedAt"> & { storagePath?: string }
  ) => void;
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

  addClient: (client: Client & { inviteToPortal?: boolean }) => void;
  updateClient: (id: string, patch: Partial<Client>) => void;
  inviteClient: (clientId: string, email?: string) => Promise<Client | null>;
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
    opp: Omit<MarketplaceOpportunity, "id" | "publishedAt"> & {
      status?: OpportunityStatus;
    }
  ) => void;
  updateOpportunity: (id: string, patch: Partial<MarketplaceOpportunity>) => void;
  setOpportunityStatus: (id: string, status: OpportunityStatus) => void;
  deleteOpportunity: (id: string) => void;
  saveOpportunity: (opportunityId: string, developerId?: string) => void;
  unsaveOpportunity: (opportunityId: string) => void;
  submitQuotation: (
    quotation: Omit<Quotation, "id" | "submittedAt" | "status">
  ) => void;
  updateQuotationStatus: (
    id: string,
    status: QuotationStatus,
    extra?: { rejectionReason?: string; adminNotes?: string }
  ) => void;
  patchQuotation: (id: string, patch: QuotationPatchInput) => void;
  acceptQuotation: (
    quotationId: string,
    award?: AwardQuotationInput
  ) => void;
  acceptFixedOpportunity: (
    opportunityId: string,
    developerId: string,
    developerName: string
  ) => void;
  confirmAssignment: (assignmentId: string) => void;
  rejectAssignment: (assignmentId: string, reason?: string) => void;
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
  requestTaskExtension: (
    taskId: string,
    requestedDueDate: string,
    reason: string
  ) => void;
  resolveTaskExtension: (
    taskId: string,
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
  createThread: (input: {
    subject?: string;
    visibility?: MessageThread["visibility"];
    projectId?: string | null;
    assignmentId?: string | null;
    recipientProfileId: string;
    body: string;
  }) => Promise<string>;
  markThreadRead: (threadId: string) => void;
  refreshThreads: () => Promise<void>;
  loadThreadMessages: (threadId: string) => Promise<void>;
  updateDeveloperProfile: (
    id: string,
    patch: Partial<DeveloperProfile> & { requestReview?: boolean }
  ) => void;
  registerDeveloper: (profile: DeveloperProfile) => void;
  setDeveloperStatus: (
    id: string,
    status: DeveloperStatus,
    note?: string
  ) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (portal: PortalNotification["portal"], userId: string) => void;
  refreshNotifications: () => Promise<void>;
  mergeNotifications: (items: PortalNotification[]) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, patch: Partial<Invoice>) => void;
  markEarningPaid: (
    id: string,
    providerReference: string,
    note?: string,
    extras?: {
      payoutAccountId?: string;
      paymentAmount: number;
      paymentCurrency: string;
      paymentDate: string;
      proofStoragePath: string;
      proofFileName: string;
      proofMimeType: string;
      proofSizeBytes: number;
    }
  ) => void;
  resetDemoData: () => void;
}

const WorkspaceStoreContext = createContext<WorkspaceStoreValue | null>(null);

function seedState() {
  return {
    workspaceId: seedWorkspaces[0].id,
    workspaces: seedWorkspaces.map((w) => ({ ...w })),
    projects: initialProjects,
    tasks: initialTasks.map(normalizeTaskClientGate),
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

/** API mode must never render demo seed IDs (p1/ws1) before bootstrap. */
function emptyApiState() {
  return {
    workspaceId: "",
    workspaces: [] as Workspace[],
    projects: [] as Project[],
    tasks: [] as Task[],
    milestones: [] as Milestone[],
    documents: [] as ProjectDocument[],
    comments: [] as ProjectComment[],
    submissions: [] as Submission[],
    activity: [] as ActivityItem[],
    opportunities: [] as MarketplaceOpportunity[],
    quotations: [] as Quotation[],
    assignments: [] as DeveloperAssignment[],
    workSubmissions: [] as WorkSubmissionVersion[],
    threads: [] as MessageThread[],
    messages: [] as PortalMessage[],
    invoices: [] as Invoice[],
    earnings: [] as EarningRecord[],
    portalNotifications: [] as PortalNotification[],
    developers: [] as DeveloperProfile[],
    saved: [] as SavedOpportunity[],
    clients: [] as Client[],
    team: [] as TeamMember[],
    searchQuery: "",
  };
}

const EMPTY_WORKSPACE: Workspace = {
  id: "",
  name: "Loading…",
  plan: "Pro",
  color: "#4F46E5",
};

function applyBootstrap(
  data: WorkspaceBootstrap,
  setters: {
    setWorkspaceDirectory: React.Dispatch<React.SetStateAction<Workspace[]>>;
    setWorkspaceIdState: React.Dispatch<React.SetStateAction<string>>;
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    setMilestones: React.Dispatch<React.SetStateAction<Milestone[]>>;
    setDocuments: React.Dispatch<React.SetStateAction<ProjectDocument[]>>;
    setComments: React.Dispatch<React.SetStateAction<ProjectComment[]>>;
    setSubmissions: React.Dispatch<React.SetStateAction<Submission[]>>;
    setActivity: React.Dispatch<React.SetStateAction<ActivityItem[]>>;
    setOpportunities: React.Dispatch<
      React.SetStateAction<MarketplaceOpportunity[]>
    >;
    setQuotations: React.Dispatch<React.SetStateAction<Quotation[]>>;
    setAssignments: React.Dispatch<React.SetStateAction<DeveloperAssignment[]>>;
    setWorkSubmissions: React.Dispatch<
      React.SetStateAction<WorkSubmissionVersion[]>
    >;
    setThreads: React.Dispatch<React.SetStateAction<MessageThread[]>>;
    setMessages: React.Dispatch<React.SetStateAction<PortalMessage[]>>;
    setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
    setEarnings: React.Dispatch<React.SetStateAction<EarningRecord[]>>;
    setPortalNotifications: React.Dispatch<
      React.SetStateAction<PortalNotification[]>
    >;
    setDevelopers: React.Dispatch<React.SetStateAction<DeveloperProfile[]>>;
    setSaved: React.Dispatch<React.SetStateAction<SavedOpportunity[]>>;
    setClients: React.Dispatch<React.SetStateAction<Client[]>>;
    setTeam: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  },
  directory?: Workspace[]
) {
  if (directory) setters.setWorkspaceDirectory(directory);
  else {
    setters.setWorkspaceDirectory((prev) => {
      const exists = prev.some((w) => w.id === data.workspace.id);
      return exists
        ? prev.map((w) => (w.id === data.workspace.id ? data.workspace : w))
        : [...prev, data.workspace];
    });
  }
  setters.setWorkspaceIdState(data.workspace.id);
  setApiWorkspaceId(data.workspace.id);
  setters.setProjects(data.projects);
  setters.setTasks(data.tasks.map(normalizeTaskClientGate));
  setters.setMilestones(data.milestones);
  setters.setDocuments(data.documents);
  setters.setComments(data.comments);
  setters.setSubmissions(data.submissions);
  setters.setActivity(data.activity);
  setters.setOpportunities(data.opportunities);
  setters.setQuotations(data.quotations);
  setters.setAssignments(data.assignments);
  setters.setWorkSubmissions(data.workSubmissions);
  setters.setThreads(data.threads);
  setters.setMessages(data.messages);
  setters.setInvoices(data.invoices);
  setters.setEarnings(data.earnings);
  setters.setPortalNotifications(data.portalNotifications);
  setters.setDevelopers(data.developers);
  setters.setSaved(
    data.savedOpportunityIds.map((opportunityId) => ({
      developerId: "",
      opportunityId,
    }))
  );
  setters.setClients(data.clients);
  setters.setTeam(data.team);
}

export function WorkspaceStoreProvider({ children }: { children: ReactNode }) {
  const seed = useMemo(() => seedState(), []);
  const apiEmpty = useMemo(() => emptyApiState(), []);
  const apiMode = isApiDataSource();
  const initial = apiMode ? apiEmpty : seed;
  const { isAuthenticated, hydrated: authHydrated, user } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [workspaceId, setWorkspaceIdState] = useState(initial.workspaceId);
  const [workspaceDirectory, setWorkspaceDirectory] = useState<Workspace[]>(
    initial.workspaces
  );
  const workspaceIdRef = useRef(workspaceId);
  useEffect(() => {
    workspaceIdRef.current = workspaceId;
    if (apiMode) setApiWorkspaceId(workspaceId);
  }, [workspaceId, apiMode]);
  const [projects, setProjects] = useState<Project[]>(initial.projects);
  const [tasks, setTasks] = useState<Task[]>(initial.tasks);
  const [milestones, setMilestones] = useState<Milestone[]>(initial.milestones);
  const [documents, setDocuments] = useState<ProjectDocument[]>(
    initial.documents
  );
  const [comments, setComments] = useState<ProjectComment[]>(initial.comments);
  const [submissions, setSubmissions] = useState<Submission[]>(
    initial.submissions
  );
  const [activity, setActivity] = useState<ActivityItem[]>(initial.activity);
  const [searchQuery, setSearchQuery] = useState("");
  const [opportunities, setOpportunities] = useState(initial.opportunities);
  const [quotations, setQuotations] = useState(initial.quotations);
  const [assignments, setAssignments] = useState(initial.assignments);
  const [workSubmissions, setWorkSubmissions] = useState(
    initial.workSubmissions
  );
  const [threads, setThreads] = useState(initial.threads);
  const [messages, setMessages] = useState(initial.messages);
  const [invoices, setInvoices] = useState<Invoice[]>(initial.invoices);
  const [earnings, setEarnings] = useState(initial.earnings);
  const [portalNotifications, setPortalNotifications] = useState(
    initial.portalNotifications
  );
  const [developers, setDevelopers] = useState(initial.developers);
  const [saved, setSaved] = useState(initial.saved);
  const [clients, setClients] = useState<Client[]>(initial.clients);
  const [team, setTeam] = useState<TeamMember[]>(initial.team);
  const skipPersist = useRef(true);

  const bootstrapSetters = useMemo(
    () => ({
      setWorkspaceDirectory,
      setWorkspaceIdState,
      setProjects,
      setTasks,
      setMilestones,
      setDocuments,
      setComments,
      setSubmissions,
      setActivity,
      setOpportunities,
      setQuotations,
      setAssignments,
      setWorkSubmissions,
      setThreads,
      setMessages,
      setInvoices,
      setEarnings,
      setPortalNotifications,
      setDevelopers,
      setSaved,
      setClients,
      setTeam,
    }),
    []
  );

  const reloadBootstrap = useCallback(
    async (id: string, directory?: Workspace[]) => {
      const data = await loadWorkspaceBootstrap(id);
      applyBootstrap(data, bootstrapSetters, directory);
    },
    [bootstrapSetters]
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (apiMode) {
        clearWorkspaceSnapshot();
        if (!authHydrated) return;
        if (!isAuthenticated) {
          if (!cancelled) {
            setHydrated(true);
          }
          return;
        }
        try {
          const directory = await listApiWorkspaces();
          if (cancelled) return;
          if (directory.length === 0) {
            setWorkspaceDirectory([]);
            setWorkspaceIdState("");
            setProjects([]);
            setTasks([]);
            setMilestones([]);
            setDocuments([]);
            setComments([]);
            setSubmissions([]);
            setActivity([]);
            setOpportunities([]);
            setQuotations([]);
            setAssignments([]);
            setWorkSubmissions([]);
            setThreads([]);
            setMessages([]);
            setInvoices([]);
            setEarnings([]);
            setPortalNotifications([]);
            setSaved([]);
            setClients([]);
            setTeam([]);
            // Pending developers may have no workspace yet — still load own profile.
            if (user?.developerId) {
              try {
                const self = await getApiDeveloper(user.developerId);
                if (!cancelled) setDevelopers([self]);
              } catch {
                if (!cancelled) setDevelopers([]);
              }
            } else if (!cancelled) {
              setDevelopers([]);
            }
            setHydrated(true);
            return;
          }
          const preferred =
            directory.find((w) => w.id === workspaceIdRef.current)?.id ??
            directory[0].id;
          await reloadBootstrap(preferred, directory);
          if (cancelled) return;
          // Ensure signed-in developer always sees their own profile card.
          if (user?.developerId) {
            setDevelopers((prev) => {
              if (prev.some((d) => d.id === user.developerId)) return prev;
              void getApiDeveloper(user.developerId!).then((self) => {
                if (!cancelled) {
                  setDevelopers((current) =>
                    current.some((d) => d.id === self.id)
                      ? current
                      : [self, ...current]
                  );
                }
              });
              return prev;
            });
          }
        } catch {
          /* auth/profile may still be provisioning — keep empty, never demo seed */
          if (!cancelled) {
            setWorkspaceDirectory([]);
            setWorkspaceIdState("");
            setProjects([]);
            setTasks([]);
            setMilestones([]);
            setDocuments([]);
            setComments([]);
            setSubmissions([]);
            setActivity([]);
            setOpportunities([]);
            setQuotations([]);
            setAssignments([]);
            setWorkSubmissions([]);
            setThreads([]);
            setMessages([]);
            setInvoices([]);
            setEarnings([]);
            setPortalNotifications([]);
            setDevelopers([]);
            setSaved([]);
            setClients([]);
            setTeam([]);
          }
        } finally {
          if (!cancelled) setHydrated(true);
        }
        return;
      }

      const snap = loadWorkspaceSnapshot();
      if (snap) {
        setWorkspaceIdState(snap.workspaceId || seed.workspaceId);
        if (Array.isArray(snap.workspaces) && snap.workspaces.length > 0) {
          setWorkspaceDirectory(snap.workspaces as Workspace[]);
        }
        if (Array.isArray(snap.projects)) setProjects(snap.projects as Project[]);
        if (Array.isArray(snap.tasks)) {
          setTasks((snap.tasks as Task[]).map(normalizeTaskClientGate));
        }
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
      if (!cancelled) setHydrated(true);
      queueMicrotask(() => {
        skipPersist.current = false;
      });
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    authHydrated,
    isAuthenticated,
    reloadBootstrap,
    seed,
    user?.id,
    user?.developerId,
  ]);

  useEffect(() => {
    if (apiMode || !hydrated || skipPersist.current) return;
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
    apiMode,
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
    (apiMode ? EMPTY_WORKSPACE : seedWorkspaces[0]);

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
    const taskPending = scopedTasks.filter(
      (t) =>
        !t.parentId &&
        taskNeedsClientApproval(t) &&
        ((t.status === "review" &&
          t.clientApprovalStatus !== "approved" &&
          !(t.authorizedForClient && t.clientApprovalStatus === "pending")) ||
          (t.authorizedForClient && t.clientApprovalStatus === "pending"))
    ).length;
    return workPending + orphanSubmissionPending + taskPending;
  }, [workSubmissions, submissions, scopedProjectIds, scopedTasks]);

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

  const setWorkspaceId = useCallback(
    (id: string) => {
      setWorkspaceIdState(id);
      if (apiMode) {
        runApi(() => reloadBootstrap(id), "Load workspace");
      }
    },
    [apiMode, reloadBootstrap]
  );

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
      if (apiMode) {
        runApi(async () => {
          const remote = await createApiWorkspace(input);
          setWorkspaceDirectory((prev) =>
            prev.map((w) => (w.id === created.id ? remote : w))
          );
          setWorkspaceIdState(remote.id);
          await reloadBootstrap(remote.id);
        }, "Create workspace");
      }
      return created;
    },
    [apiMode, notify, reloadBootstrap]
  );

  const addProject = useCallback(
    (project: Project) => {
      setProjects((prev) => [project, ...prev]);
      pushActivity(setActivity, {
        type: "project_update",
        title: "Project created",
        description: project.name,
        actorName: currentUser.name,
        projectId: project.id,
        projectName: project.name,
      });
      runApi(async () => {
        const remote = await createApiProject(
          workspaceIdRef.current,
          project
        );
        setProjects((prev) =>
          prev.map((p) => (p.id === project.id ? remote : p))
        );
      }, "Create project");
    },
    []
  );

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    runApi(
      () => patchApiProject(workspaceIdRef.current, id, patch),
      "Update project"
    );
  }, []);

  const archiveProject = useCallback((id: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, archived: true, status: "on_hold" as ProjectStatus } : p))
    );
    runApi(
      () => archiveApiProject(workspaceIdRef.current, id),
      "Archive project"
    );
  }, []);

  const deleteProject = useCallback(
    async (id: string, confirmName: string) => {
      const project = projects.find((p) => p.id === id);
      if (!project) {
        return { ok: false as const, error: "Project not found" };
      }
      if (confirmName.trim() !== project.name) {
        return {
          ok: false as const,
          error: "Confirmation name does not match the project name exactly.",
        };
      }

      const blockedFinance = invoices.filter(
        (inv) =>
          inv.projectId === id &&
          (inv.status === "paid" || inv.status === "partial")
      );
      if (blockedFinance.length) {
        return {
          ok: false as const,
          error: `Cannot permanently delete project: invoice(s) ${blockedFinance
            .map((i) => i.number)
            .join(", ")} have payment history.`,
        };
      }

      const linkedOppIds = new Set(
        opportunities
          .filter((o) => o.projectId === id)
          .map((o) => o.id)
      );
      const linkedAssignmentIds = new Set(
        assignments
          .filter(
            (a) =>
              a.projectId === id ||
              (a.opportunityId && linkedOppIds.has(a.opportunityId))
          )
          .map((a) => a.id)
      );

      const applyLocalCascade = () => {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        setTasks((prev) => prev.filter((t) => t.projectId !== id));
        setMilestones((prev) => prev.filter((m) => m.projectId !== id));
        setDocuments((prev) => prev.filter((d) => d.projectId !== id));
        setComments((prev) => prev.filter((c) => c.projectId !== id));
        setSubmissions((prev) => prev.filter((s) => s.projectId !== id));
        setActivity((prev) =>
          prev.filter((a) => a.projectId !== id)
        );
        setOpportunities((prev) => prev.filter((o) => o.projectId !== id));
        setQuotations((prev) =>
          prev.filter((q) => !linkedOppIds.has(q.opportunityId))
        );
        setAssignments((prev) =>
          prev.filter((a) => !linkedAssignmentIds.has(a.id))
        );
        setWorkSubmissions((prev) =>
          prev.filter(
            (w) =>
              w.projectId !== id &&
              !(w.assignmentId && linkedAssignmentIds.has(w.assignmentId))
          )
        );
        setThreads((prev) =>
          prev.filter(
            (t) =>
              t.projectId !== id &&
              !(t.assignmentId && linkedAssignmentIds.has(t.assignmentId))
          )
        );
        setMessages((prev) =>
          prev.filter(
            (m) =>
              m.projectId !== id &&
              !(m.assignmentId && linkedAssignmentIds.has(m.assignmentId))
          )
        );
        setPortalNotifications((prev) =>
          prev.filter(
            (n) =>
              !n.href ||
              (!n.href.includes(id) && !n.href.includes(`/projects/${id}`))
          )
        );
        setInvoices((prev) =>
          prev.filter((inv) => {
            if (inv.projectId !== id) return true;
            // Keep paid/partial in demo for audit; drop drafts
            return inv.status === "paid" || inv.status === "partial";
          })
        );
        setEarnings((prev) =>
          prev.filter(
            (e) =>
              !e.assignmentId || !linkedAssignmentIds.has(e.assignmentId)
          )
        );
      };

      if (apiMode) {
        try {
          await deleteApiProject(
            workspaceIdRef.current,
            id,
            confirmName.trim()
          );
          applyLocalCascade();
          return { ok: true as const };
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Delete project failed";
          return { ok: false as const, error: message };
        }
      }

      applyLocalCascade();
      return { ok: true as const };
    },
    [projects, opportunities, assignments, invoices, apiMode]
  );

  const syncMilestoneAfterTasks = useCallback(
    (taskList: Task[], milestoneId: string, projectId: string) => {
      setMilestones((ms) => {
        const synced = applyMilestoneProgressFromTasks(
          ms,
          taskList,
          milestoneId
        );
        const nextProjectProgress = projectProgressFromMilestones(
          projectId,
          synced
        );
        if (nextProjectProgress !== null) {
          setProjects((ps) =>
            ps.map((p) =>
              p.id === projectId ? { ...p, progress: nextProjectProgress } : p
            )
          );
        }
        return synced;
      });
    },
    []
  );

  const authorizeTaskForClient = useCallback(
    (taskId: string) => {
      let touched: Task | undefined;
      setTasks((prev) => {
        const task = prev.find((t) => t.id === taskId);
        if (!task || !taskNeedsClientApproval(task)) return prev;
        touched = task;
        const next = prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: "review" as TaskStatus,
                requiresClientApproval: true,
                authorizedForClient: true,
                clientApprovalStatus: "pending" as TaskClientApprovalStatus,
              }
            : t
        );
        if (task.milestoneId) {
          syncMilestoneAfterTasks(next, task.milestoneId, task.projectId);
        }
        pushActivity(setActivity, {
          type: "approval",
          title: "Task sent for client approval",
          description: task.title,
          actorName: currentUser.name,
          projectId: task.projectId,
          projectName: task.projectName,
        });
        return next;
      });
      if (!touched) return;
      runApi(
        () => authorizeApiTask(workspaceIdRef.current, taskId),
        "Authorize task"
      );
      const project = projects.find((p) => p.id === touched!.projectId);
      notify({
        portal: "client",
        userId: resolveClientUserId(project?.clientId),
        title: "Task ready for your approval",
        body: `${touched.title} — ${touched.projectName}`,
        href: "/client/approvals",
        workspaceId: project?.workspaceId || workspaceIdRef.current,
      });
    },
    [notify, projects, resolveClientUserId, syncMilestoneAfterTasks]
  );

  const clientReviewTask = useCallback(
    (
      taskId: string,
      decision: Extract<
        TaskClientApprovalStatus,
        "approved" | "revision_requested" | "rejected"
      >,
      note?: string
    ) => {
      let touched: Task | undefined;
      setTasks((prev) => {
        const task = prev.find((t) => t.id === taskId);
        if (
          !task ||
          !task.authorizedForClient ||
          task.clientApprovalStatus !== "pending"
        ) {
          return prev;
        }
        touched = task;
        const nextStatus: TaskStatus =
          decision === "approved" ? "done" : "in_progress";
        const next = prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: nextStatus,
                clientApprovalStatus: decision,
                authorizedForClient: decision === "approved",
              }
            : t
        );
        if (task.milestoneId) {
          syncMilestoneAfterTasks(next, task.milestoneId, task.projectId);
        }
        pushActivity(setActivity, {
          type: "approval",
          title:
            decision === "approved"
              ? "Client approved task"
              : "Client returned task",
          description: note ? `${task.title} — ${note}` : task.title,
          actorName: "Client",
          projectId: task.projectId,
          projectName: task.projectName,
        });
        return next;
      });
      if (!touched) return;
      runApi(
        () =>
          clientReviewApiTask(
            workspaceIdRef.current,
            taskId,
            decision,
            note
          ),
        "Client review task"
      );
      notify({
        portal: "admin",
        userId: "u1",
        title:
          decision === "approved"
            ? "Client approved task"
            : "Client returned task",
        body: touched.title,
        href: `/projects/${touched.projectId}`,
        workspaceId:
          projects.find((p) => p.id === touched!.projectId)?.workspaceId ||
          workspaceIdRef.current,
      });
    },
    [notify, projects, syncMilestoneAfterTasks]
  );

  const updateTaskStatus = useCallback(
    (taskId: string, status: TaskStatus) => {
      const existing = tasks.find((t) => t.id === taskId);
      // Client-gated tasks: admin "done" = send to client, not client Done
      if (
        existing &&
        status === "done" &&
        taskNeedsClientApproval(existing) &&
        existing.clientApprovalStatus !== "approved"
      ) {
        authorizeTaskForClient(taskId);
        return;
      }

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
        const next = prev.map((t) => {
          if (t.id !== taskId) return t;
          const patch: Task = { ...t, status };
          if (status === "review" && taskNeedsClientApproval(t)) {
            patch.authorizedForClient = false;
            patch.clientApprovalStatus = "not_required";
          }
          return patch;
        });
        if (task?.milestoneId) {
          syncMilestoneAfterTasks(next, task.milestoneId, task.projectId);
        }
        return next;
      });

      if (
        touched &&
        !(
          status === "done" &&
          taskNeedsClientApproval(touched) &&
          touched.clientApprovalStatus !== "approved"
        )
      ) {
        runApi(
          () => patchApiTaskStatus(workspaceIdRef.current, taskId, status),
          "Update task status"
        );
      }
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
    [authorizeTaskForClient, notify, projects, syncMilestoneAfterTasks, tasks]
  );

  const updateTask = useCallback((taskId: string, patch: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t))
    );
    runApi(
      () => patchApiTask(workspaceIdRef.current, taskId, patch),
      "Update task"
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
    runApi(async () => {
      const remote = await createApiTask(workspaceIdRef.current, task);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? remote : t)));
    }, "Create task");
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
    runApi(
      () => deleteApiTask(workspaceIdRef.current, taskId),
      "Delete task"
    );
  }, []);

  const addMilestone = useCallback(async (milestone: Milestone) => {
    setMilestones((prev) => [milestone, ...prev]);
    if (!isApiDataSource()) return milestone;
    try {
      const remote = await createApiMilestone(
        workspaceIdRef.current,
        milestone
      );
      setMilestones((prev) =>
        prev.map((m) => (m.id === milestone.id ? remote : m))
      );
      return remote;
    } catch (err) {
      setMilestones((prev) => prev.filter((m) => m.id !== milestone.id));
      throw err;
    }
  }, []);

  const updateMilestone = useCallback(
    (id: string, patch: Partial<Milestone>) => {
      setMilestones((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
      );
      runApi(
        () => patchApiMilestone(workspaceIdRef.current, id, patch),
        "Update milestone"
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
      runApi(
        () =>
          patchApiMilestoneStatus(
            workspaceIdRef.current,
            milestoneId,
            status
          ),
        "Update milestone status"
      );
    },
    []
  );

  const deleteMilestone = useCallback((id: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
    runApi(
      () => deleteApiMilestone(workspaceIdRef.current, id),
      "Delete milestone"
    );
  }, []);

  const addComment = useCallback(
    (comment: Omit<ProjectComment, "id" | "createdAt">) => {
      const local = { ...comment, id: demoId("cmt"), createdAt: DEMO_TS };
      setComments((prev) => [local, ...prev]);
      const project = projects.find((p) => p.id === comment.projectId);
      pushActivity(setActivity, {
        type: "comment",
        title: "New comment",
        description: comment.body.slice(0, 80),
        actorName: comment.authorName,
        projectId: comment.projectId,
        projectName: project?.name,
      });
      runApi(async () => {
        const remote = await createApiComment(workspaceIdRef.current, comment);
        setComments((prev) =>
          prev.map((c) => (c.id === local.id ? remote : c))
        );
      }, "Add comment");
    },
    [projects]
  );

  const addDocument = useCallback(
    (
      doc: Omit<ProjectDocument, "id" | "uploadedAt"> & { storagePath?: string }
    ) => {
      const { storagePath, ...rest } = doc;
      const local = { ...rest, id: demoId("doc"), uploadedAt: DEMO_TS };
      setDocuments((prev) => [local, ...prev]);
      runApi(async () => {
        const remote = await createApiDocument(workspaceIdRef.current, {
          ...rest,
          storagePath,
        });
        setDocuments((prev) =>
          prev.map((d) => (d.id === local.id ? remote : d))
        );
      }, "Add document");
    },
    []
  );

  const deleteDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    runApi(
      () => deleteApiDocument(workspaceIdRef.current, id),
      "Delete document"
    );
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
      runApi(
        () =>
          authorizeApiSubmission(
            workspaceIdRef.current,
            workSubmissionId,
            note
          ),
        "Authorize client review"
      );
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

  const addClient = useCallback((client: Client & { inviteToPortal?: boolean }) => {
    setClients((prev) => [client, ...prev]);
    runApi(async () => {
      const remote = await createApiClient(workspaceIdRef.current, client);
      setClients((prev) => prev.map((c) => (c.id === client.id ? remote : c)));
      return remote;
    }, "Create client");
  }, []);

  const updateClient = useCallback((id: string, patch: Partial<Client>) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    runApi(
      () => patchApiClient(workspaceIdRef.current, id, patch),
      "Update client"
    );
  }, []);

  const inviteClient = useCallback(async (clientId: string, email?: string) => {
    if (!isApiDataSource()) {
      const next: Client = {
        ...(clients.find((c) => c.id === clientId) as Client),
        portalAccessStatus: "invited",
        invitedAt: new Date().toISOString(),
        inviteEmail: email,
      };
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, ...next } : c))
      );
      return next;
    }
    const remote = await inviteApiClient(
      workspaceIdRef.current,
      clientId,
      email
    );
    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, ...remote } : c))
    );
    return remote;
  }, [clients]);

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
    (
      opp: Omit<MarketplaceOpportunity, "id" | "publishedAt"> & {
        status?: OpportunityStatus;
      }
    ) => {
      const id = demoId("opp");
      const status = opp.status ?? "open";
      setOpportunities((prev) => [
        {
          ...opp,
          id,
          publishedAt: status === "draft" ? "" : DEMO_TS,
          status,
        },
        ...prev,
      ]);
      if (status !== "draft") {
        notify({
          portal: "developer",
          userId: "du1",
          workspaceId: opp.workspaceId || workspaceIdRef.current,
          title: "New marketplace opportunity",
          body: opp.title,
          href: `/developer/marketplace/${id}`,
        });
      }
      runApi(async () => {
        const remote = await createApiOpportunity(
          workspaceIdRef.current,
          opp
        );
        setOpportunities((prev) =>
          prev.map((o) => (o.id === id ? remote : o))
        );
      }, "Create opportunity");
    },
    [notify]
  );

  const updateOpportunity = useCallback(
    (id: string, patch: Partial<MarketplaceOpportunity>) => {
      setOpportunities((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
      );
      runApi(
        () => patchApiOpportunity(workspaceIdRef.current, id, patch),
        "Update opportunity"
      );
    },
    []
  );

  const setOpportunityStatus = useCallback(
    (id: string, status: OpportunityStatus) => {
      setOpportunities((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status } : o))
      );
      runApi(
        () => setApiOpportunityStatus(workspaceIdRef.current, id, status),
        "Update opportunity status"
      );
    },
    []
  );

  const deleteOpportunity = useCallback((id: string) => {
    setOpportunities((prev) => prev.filter((o) => o.id !== id));
    runApi(
      () => deleteApiOpportunity(workspaceIdRef.current, id),
      "Delete opportunity"
    );
  }, []);

  const saveOpportunity = useCallback(
    (opportunityId: string, developerId = "dev1") => {
      setSaved((prev) =>
        prev.some((s) => s.opportunityId === opportunityId)
          ? prev
          : [...prev, { developerId, opportunityId }]
      );
      runApi(
        () => saveApiOpportunity(workspaceIdRef.current, opportunityId),
        "Save opportunity"
      );
    },
    []
  );

  const unsaveOpportunity = useCallback((opportunityId: string) => {
    setSaved((prev) => prev.filter((s) => s.opportunityId !== opportunityId));
    runApi(
      () => unsaveApiOpportunity(workspaceIdRef.current, opportunityId),
      "Unsave opportunity"
    );
  }, []);

  const submitQuotation = useCallback(
    (quotation: Omit<Quotation, "id" | "submittedAt" | "status">) => {
      const localId = demoId("q");
      setQuotations((prev) => [
        {
          ...quotation,
          id: localId,
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
      runApi(async () => {
        const remote = await submitApiQuotation(
          workspaceIdRef.current,
          quotation
        );
        setQuotations((prev) =>
          prev.map((q) => (q.id === localId ? remote : q))
        );
      }, "Submit quotation");
    },
    [notify]
  );

  const updateQuotationStatus = useCallback(
    (
      id: string,
      status: QuotationStatus,
      extra?: { rejectionReason?: string; adminNotes?: string }
    ) => {
      setQuotations((prev) =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                status,
                rejectionReason: extra?.rejectionReason ?? q.rejectionReason,
                adminNotes: extra?.adminNotes ?? q.adminNotes,
                shortlistedAt:
                  status === "shortlisted"
                    ? DEMO_TS
                    : q.shortlistedAt,
              }
            : q
        )
      );
      const quote = quotations.find((q) => q.id === id);
      if (quote && (status === "shortlisted" || status === "rejected" || status === "withdrawn")) {
        const opp = opportunities.find((o) => o.id === quote.opportunityId);
        const titles: Record<string, string> = {
          shortlisted: "Bid shortlisted",
          rejected: "Bid not selected",
          withdrawn: "Bid withdrawn",
        };
        notify({
          portal: status === "withdrawn" ? "admin" : "developer",
          userId:
            status === "withdrawn"
              ? currentUser.id
              : resolveDeveloperUserId(quote.developerId),
          title: titles[status] ?? "Bid updated",
          body: opp?.title ?? quote.coverMessage.slice(0, 80),
          href:
            status === "withdrawn"
              ? "/marketplace"
              : "/developer/marketplace",
        });
      }
      runApi(async () => {
        const remote = await patchApiQuotation(
          workspaceIdRef.current,
          id,
          { status, ...extra }
        );
        setQuotations((prev) =>
          prev.map((q) => (q.id === id ? remote : q))
        );
      }, "Update bid status");
    },
    [quotations, opportunities, resolveDeveloperUserId, notify]
  );

  const patchQuotation = useCallback(
    (id: string, patch: QuotationPatchInput) => {
      setQuotations((prev) =>
        prev.map((q) => (q.id === id ? { ...q, ...patch } : q))
      );
      runApi(async () => {
        const remote = await patchApiQuotation(
          workspaceIdRef.current,
          id,
          patch
        );
        setQuotations((prev) =>
          prev.map((q) => (q.id === id ? remote : q))
        );
      }, "Update bid");
    },
    []
  );

  const acceptQuotation = useCallback(
    (quotationId: string, award?: AwardQuotationInput) => {
      const quote = quotations.find((q) => q.id === quotationId);
      if (!quote) return;
      const opp = opportunities.find((o) => o.id === quote.opportunityId);
      if (!opp) return;
      const approvedAmount = award?.approvedAmount ?? quote.price;
      const approvedDays = award?.approvedDays ?? quote.estimatedDays;
      setQuotations((prev) =>
        prev.map((q) =>
          q.opportunityId === quote.opportunityId
            ? {
                ...q,
                status:
                  q.id === quotationId
                    ? ("accepted" as QuotationStatus)
                    : ("rejected" as QuotationStatus),
                price: q.id === quotationId ? approvedAmount : q.price,
                estimatedDays:
                  q.id === quotationId ? approvedDays : q.estimatedDays,
                adminNotes:
                  q.id === quotationId
                    ? award?.note ?? q.adminNotes
                    : q.adminNotes,
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
        budget: approvedAmount,
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
        title: "Project awarded — confirm assignment",
        body: `${opp.title} · $${approvedAmount} · ${approvedDays} days`,
        href: "/developer/my-tasks",
      });
      runApi(async () => {
        const remote = await acceptApiQuotation(
          workspaceIdRef.current,
          quotationId,
          award
        );
        setQuotations((prev) =>
          prev.map((q) =>
            q.id === quotationId ? remote.quotation : q
          )
        );
        setAssignments((prev) => [
          remote.assignment,
          ...prev.filter((a) => a.id !== assignment.id),
        ]);
      }, "Award bid");
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
      runApi(async () => {
        const remote = await acceptApiFixedOpportunity(
          workspaceIdRef.current,
          opportunityId,
          developerId
        );
        setAssignments((prev) =>
          prev.map((a) => (a.id === assignment.id ? remote : a))
        );
      }, "Accept fixed opportunity");
    },
    [opportunities, notify]
  );

  const confirmAssignment = useCallback((assignmentId: string) => {
    runApi(
      () => confirmApiAssignment(workspaceIdRef.current, assignmentId),
      "Confirm assignment"
    );
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

  const rejectAssignment = useCallback(
    (assignmentId: string, reason?: string) => {
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
      runApi(
        () =>
          rejectApiAssignment(workspaceIdRef.current, assignmentId, {
            reason,
          }),
        "Reject assignment"
      );
    },
    [assignments]
  );

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
      runApi(
        () => patchApiAssignment(workspaceIdRef.current, id, patch),
        "Update assignment"
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
      runApi(
        () =>
          requestApiExtension(
            workspaceIdRef.current,
            assignmentId,
            requestedDeadline,
            reason
          ),
        "Request extension"
      );
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
      runApi(
        () =>
          resolveApiExtension(
            workspaceIdRef.current,
            assignmentId,
            decision
          ),
        "Resolve extension"
      );
    },
    []
  );

  const requestTaskExtension = useCallback(
    (taskId: string, requestedDueDate: string, reason: string) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                extensionRequest: {
                  requestedDueDate,
                  reason,
                  status: "pending",
                },
              }
            : t
        )
      );
      notify({
        portal: "admin",
        userId: currentUser.id,
        title: "Task deadline extension requested",
        body: reason,
        href: "/marketplace",
      });
      runApi(
        () =>
          requestApiTaskExtension(
            workspaceIdRef.current,
            taskId,
            requestedDueDate,
            reason
          ).then((res) => {
            if (res?.task) {
              setTasks((prev) =>
                prev.map((t) => (t.id === taskId ? { ...t, ...res.task } : t))
              );
            }
          }),
        "Request task extension"
      );
    },
    [notify]
  );

  const resolveTaskExtension = useCallback(
    (taskId: string, decision: "approved" | "rejected") => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId || !t.extensionRequest) return t;
          if (decision === "approved") {
            return {
              ...t,
              dueDate: t.extensionRequest.requestedDueDate,
              extensionRequest: {
                ...t.extensionRequest,
                status: "approved",
              },
            };
          }
          return {
            ...t,
            extensionRequest: {
              ...t.extensionRequest,
              status: "rejected",
            },
          };
        })
      );
      runApi(
        () =>
          resolveApiTaskExtension(
            workspaceIdRef.current,
            taskId,
            decision
          ).then((res) => {
            if (res?.task) {
              setTasks((prev) =>
                prev.map((t) => (t.id === taskId ? { ...t, ...res.task } : t))
              );
            }
          }),
        "Resolve task extension"
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
          prev.filter((s) =>
            submission.taskId
              ? s.taskId === submission.taskId
              : s.assignmentId === submission.assignmentId
          ).length + 1;
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
      if (submission.assignmentId) {
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
      }
      if (submission.taskId) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === submission.taskId
              ? {
                  ...t,
                  status: "review",
                  authorizedForClient: false,
                  clientApprovalStatus: "not_required",
                }
              : t
          )
        );
      }
      if (submission.projectId) {
        addSubmission({
          projectId: submission.projectId,
          title: submission.title,
          description: submission.description,
          submittedBy: submission.submittedBy,
          status: "submitted",
          documentIds: [],
          relatedTaskId: submission.taskId ?? null,
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
      runApi(async () => {
        const remote = await createApiWorkSubmission(workspaceIdRef.current, {
          assignmentId: submission.assignmentId,
          taskId: submission.taskId,
          title: submission.title,
          description: submission.description,
          repoUrl: submission.repoUrl,
          deployUrl: submission.deployUrl,
          designUrl: submission.designUrl,
          files: submission.files,
          screenshots: submission.screenshots,
          testingNotes: submission.testingNotes,
          projectId: submission.projectId,
          milestoneId: submission.milestoneId,
          requiresClientApproval: submission.requiresClientApproval,
        });
        setWorkSubmissions((prev) =>
          prev.map((w) => (w.id === createdId ? remote : w))
        );
      }, "Submit work");
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
          if (work.assignmentId) {
            setAssignments((prev) =>
              prev.map((a) =>
                a.id === work.assignmentId
                  ? { ...a, status: "revision_requested" as AssignmentStatus }
                  : a
              )
            );
          }
          if (work.taskId) {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === work.taskId
                  ? {
                      ...t,
                      status: "in_progress",
                      clientApprovalStatus: "revision_requested",
                      authorizedForClient: false,
                    }
                  : t
              )
            );
          }
        }
        const assignment = work.assignmentId
          ? assignments.find((a) => a.id === work.assignmentId)
          : undefined;
        const href = work.assignmentId
          ? `/developer/tasks/${work.assignmentId}`
          : work.projectId
            ? `/developer/projects/${work.projectId}`
            : "/developer/my-tasks";
        const developerUserId = assignment
          ? resolveDeveloperUserId(assignment.developerId)
          : (developers.find((d) => d.name === work.submittedBy)?.userId ?? "");
        notify({
          portal: "developer",
          userId: developerUserId,
          title:
            status === "rejected"
              ? "Revision feedback"
              : authorizeClient
                ? "Approved — sent to client"
                : `Submission ${status}`,
          body: reviewNote
            ? `${work.title} — ${reviewNote}`
            : work.title,
          href,
        });
      }
      // Prefer explicit authorizeClientReview after status is approved
      if (authorizeClient && status === "approved") {
        authorizeClientReview(workSubmissionId, reviewNote);
      }
      runApi(
        () =>
          reviewApiWorkSubmission(
            workspaceIdRef.current,
            workSubmissionId,
            status,
            reviewNote,
            authorizeClient
          ),
        "Review submission"
      );
    },
    [
      workSubmissions,
      authorizeClientReview,
      assignments,
      developers,
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
        if (work.assignmentId) {
          const assignmentId = work.assignmentId;
          setEarnings((prev) => {
            const exists = prev.some(
              (e) => e.assignmentId === assignmentId && e.status !== "paid"
            );
            if (exists) return prev;
            return [
              {
                id: demoId("ear"),
                assignmentId,
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
        }

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
      runApi(
        () =>
          clientReviewApiWork(
            workspaceIdRef.current,
            workSubmissionId,
            decision,
            note
          ),
        "Client review work"
      );
    },
    [workSubmissions, assignments, resolveDeveloperUserId, notify, projects]
  );

  const sendMessage = useCallback(
    (message: Omit<PortalMessage, "id" | "createdAt" | "read">) => {
      const localId = demoId("msg");
      const createdAt = new Date().toISOString();
      setMessages((prev) => [
        {
          ...message,
          id: localId,
          createdAt,
          read: true,
        },
        ...prev,
      ]);
      setThreads((prev) =>
        prev.map((t) =>
          t.id === message.threadId
            ? {
                ...t,
                lastMessageAt: createdAt,
                lastMessagePreview: message.body,
                lastMessageAuthorName: message.authorName,
                unreadCount: 0,
              }
            : t
        )
      );
      runApi(async () => {
        const remote = await sendApiMessage(workspaceIdRef.current, message);
        setMessages((prev) =>
          prev.map((m) => (m.id === localId ? remote : m))
        );
        setThreads((prev) =>
          prev.map((t) =>
            t.id === message.threadId
              ? {
                  ...t,
                  lastMessageAt: remote.createdAt,
                  lastMessagePreview: remote.body,
                  lastMessageAuthorName: remote.authorName,
                  unreadCount: 0,
                }
              : t
          )
        );
      }, "Send message");
    },
    []
  );

  const createThread = useCallback(
    async (input: {
      subject?: string;
      visibility?: MessageThread["visibility"];
      projectId?: string | null;
      assignmentId?: string | null;
      recipientProfileId: string;
      body: string;
    }) => {
      if (isApiDataSource()) {
        const remote = await createApiThread(workspaceIdRef.current, input);
        setThreads((prev) => {
          const without = prev.filter((t) => t.id !== remote.id);
          return [remote, ...without];
        });
        try {
          const msgs = await listApiThreadMessages(
            workspaceIdRef.current,
            remote.id
          );
          setMessages((prev) => {
            const others = prev.filter((m) => m.threadId !== remote.id);
            return [...msgs, ...others];
          });
        } catch {
          /* thread list still usable */
        }
        return remote.id;
      }

      const id = demoId("th");
      const createdAt = new Date().toISOString();
      setThreads((prev) => [
        {
          id,
          subject: input.subject?.trim() || "New conversation",
          projectId: input.projectId ?? undefined,
          assignmentId: input.assignmentId ?? undefined,
          participants: [input.recipientProfileId],
          visibility: input.visibility ?? "internal",
          lastMessageAt: createdAt,
          lastMessagePreview: input.body,
          unreadCount: 0,
        },
        ...prev,
      ]);
      setMessages((prev) => [
        {
          id: demoId("msg"),
          threadId: id,
          projectId: input.projectId ?? undefined,
          assignmentId: input.assignmentId ?? undefined,
          authorId: currentUser.id,
          authorName: currentUser.name,
          body: input.body,
          createdAt,
          visibility: input.visibility ?? "internal",
          read: true,
        },
        ...prev,
      ]);
      return id;
    },
    []
  );

  const markThreadRead = useCallback((threadId: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t))
    );
    runApi(async () => {
      const remote = await markApiThreadRead(workspaceIdRef.current, threadId);
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, ...remote } : t))
      );
    }, "Mark thread read");
  }, []);

  const refreshThreads = useCallback(async () => {
    if (!isApiDataSource() || !workspaceIdRef.current) return;
    try {
      const remote = await listApiThreads(workspaceIdRef.current);
      setThreads(remote);
    } catch {
      /* polling soft-fail */
    }
  }, []);

  const loadThreadMessages = useCallback(async (threadId: string) => {
    if (!isApiDataSource() || !workspaceIdRef.current || !threadId) return;
    try {
      const msgs = await listApiThreadMessages(
        workspaceIdRef.current,
        threadId
      );
      setMessages((prev) => {
        const others = prev.filter((m) => m.threadId !== threadId);
        return [...msgs, ...others];
      });
    } catch {
      /* polling soft-fail */
    }
  }, []);

  const updateDeveloperProfile = useCallback(
    (
      id: string,
      patch: Partial<DeveloperProfile> & { requestReview?: boolean }
    ) => {
      const { requestReview, ...profilePatch } = patch;
      // Strip local-only fields that the API does not accept.
      const { cvMeta: _cvMeta, ...apiPatch } = profilePatch as Partial<DeveloperProfile> & {
        cvMeta?: DeveloperProfile["cvMeta"];
      };
      void _cvMeta;
      setDevelopers((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                ...profilePatch,
                ...(requestReview ||
                profilePatch.status === "pending_verification"
                  ? {
                      status: "pending_verification" as const,
                      verificationNote: undefined,
                    }
                  : {}),
              }
            : d
        )
      );
      runApi(async () => {
        const remote = await patchApiDeveloper(id, {
          ...apiPatch,
          ...(requestReview ? { requestReview: true } : {}),
        });
        setDevelopers((prev) =>
          prev.map((d) =>
            d.id === id
              ? {
                  ...remote,
                  cvMeta: profilePatch.cvMeta ?? d.cvMeta,
                }
              : d
          )
        );
      }, "Update developer");
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
      runApi(async () => {
        const remote = await registerApiDeveloper(profile);
        setDevelopers((prev) =>
          prev.map((d) => (d.id === profile.id ? remote : d))
        );
      }, "Register developer");
    },
    [notify]
  );

  const setDeveloperStatus = useCallback(
    (id: string, status: DeveloperStatus, note?: string) => {
      const profile = developers.find((d) => d.id === id);
      setDevelopers((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                status,
                verificationNote: note ?? d.verificationNote,
              }
            : d
        )
      );
      notify({
        portal: "developer",
        userId: profile?.userId ?? id,
        title:
          status === "verified"
            ? "Verification approved"
            : `Developer status: ${status}`,
        body:
          note?.trim() ||
          (status === "verified"
            ? "Your developer profile was verified."
            : "Your developer profile was updated."),
        href: "/developer/profile",
      });
      runApi(
        () =>
          setApiDeveloperStatus(workspaceIdRef.current, id, status, note),
        "Update developer status"
      );
    },
    [developers, notify]
  );

  const markNotificationRead = useCallback((id: string) => {
    setPortalNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    runApi(
      () => markApiNotificationRead(workspaceIdRef.current, id),
      "Mark notification read"
    );
  }, []);

  const mergeNotifications = useCallback((items: PortalNotification[]) => {
    setPortalNotifications((prev) => {
      const byId = new Map(prev.map((n) => [n.id, n]));
      for (const item of items) byId.set(item.id, item);
      return Array.from(byId.values()).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!apiMode || !workspaceIdRef.current) return;
    try {
      const data = await listApiNotifications(workspaceIdRef.current, {
        limit: 100,
      });
      mergeNotifications(data.items);
    } catch {
      /* polling soft-fail */
    }
  }, [apiMode, mergeNotifications]);

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
      if (apiMode) {
        runApi(
          () => markApiAllNotificationsRead(scopedWorkspace),
          "Mark all notifications read"
        );
      }
    },
    [apiMode]
  );

  const addInvoice = useCallback((invoice: Invoice) => {
    setInvoices((prev) => [invoice, ...prev]);
    runApi(async () => {
      const remote = await createApiInvoice(workspaceIdRef.current, invoice);
      setInvoices((prev) =>
        prev.map((i) => (i.id === invoice.id ? remote : i))
      );
    }, "Create invoice");
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
    runApi(
      () => patchApiInvoice(workspaceIdRef.current, id, patch),
      "Update invoice"
    );
  }, []);

  const markEarningPaid = useCallback(
    (
      id: string,
      providerReference: string,
      note?: string,
      extras?: {
        payoutAccountId?: string;
        paymentAmount: number;
        paymentCurrency: string;
        paymentDate: string;
        proofStoragePath: string;
        proofFileName: string;
        proofMimeType: string;
        proofSizeBytes: number;
      }
    ) => {
      if (!providerReference.trim()) {
        throw new Error("Transaction reference is required");
      }
      if (!extras) {
        throw new Error(
          "Payment proof fields are required to mark an earning paid"
        );
      }
      setEarnings((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                status: "paid",
                payoutStatus: "paid",
                paidAt: new Date().toISOString(),
                providerReference: providerReference.trim(),
                paymentAmount: extras.paymentAmount,
                paymentCurrency: extras.paymentCurrency,
                paymentDate: extras.paymentDate,
                hasPaymentProof: true,
                paymentProofFileName: extras.proofFileName,
              }
            : e
        )
      );
      runApi(
        () =>
          markApiEarningPaid(workspaceIdRef.current, id, {
            providerReference: providerReference.trim(),
            note,
            ...extras,
          }),
        "Mark earning paid"
      );
    },
    []
  );

  const resetDemoData = useCallback(() => {
    if (apiMode) {
      clearWorkspaceSnapshot();
      runApi(
        () => reloadBootstrap(workspaceIdRef.current),
        "Reload workspace"
      );
      return;
    }
    // demo-only path below
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
  }, [apiMode, reloadBootstrap]);

  const value = useMemo<WorkspaceStoreValue>(
    () => ({
      hydrated,
      workspace,
      workspaces: workspaceDirectory,
      workspaceId,
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
      authorizeTaskForClient,
      clientReviewTask,
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
      inviteClient,
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
      patchQuotation,
      acceptQuotation,
      acceptFixedOpportunity,
      confirmAssignment,
      rejectAssignment,
      updateAssignment,
      requestExtension,
      resolveExtension,
      requestTaskExtension,
      resolveTaskExtension,
      addWorkSubmission,
      reviewWorkSubmission,
      clientReviewWork,
      sendMessage,
      createThread,
      markThreadRead,
      refreshThreads,
      loadThreadMessages,
      updateDeveloperProfile,
      registerDeveloper,
      setDeveloperStatus,
      markNotificationRead,
      markAllNotificationsRead,
      refreshNotifications,
      mergeNotifications,
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
      authorizeTaskForClient,
      clientReviewTask,
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
      inviteClient,
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
      patchQuotation,
      acceptQuotation,
      acceptFixedOpportunity,
      confirmAssignment,
      rejectAssignment,
      updateAssignment,
      requestExtension,
      resolveExtension,
      requestTaskExtension,
      resolveTaskExtension,
      addWorkSubmission,
      reviewWorkSubmission,
      clientReviewWork,
      sendMessage,
      createThread,
      markThreadRead,
      refreshThreads,
      loadThreadMessages,
      updateDeveloperProfile,
      registerDeveloper,
      setDeveloperStatus,
      markNotificationRead,
      markAllNotificationsRead,
      refreshNotifications,
      mergeNotifications,
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
