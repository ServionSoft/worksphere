"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ExternalLink, Shield } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductionTemplatesPanel } from "@/components/admin/production-templates-panel";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useRequiredAuth } from "@/lib/auth-store";
import { useWorkspaceStore } from "@/lib/workspace-store";

const DEFAULT_NOTIFS = {
  emailDigest: true,
  taskAssigned: true,
  approvals: true,
  marketplace: false,
  weeklyReport: true,
};

const ROLE_MATRIX_SEED = [
  {
    id: "tenant_admin",
    label: "Tenant Admin",
    projects: "Full",
    billing: "Full",
    marketplace: "Full",
    settings: "Full",
  },
  {
    id: "project_manager",
    label: "Project Manager",
    projects: "Full",
    billing: "View",
    marketplace: "Manage",
    settings: "Limited",
  },
  {
    id: "internal_member",
    label: "Internal Member",
    projects: "Assigned",
    billing: "None",
    marketplace: "View",
    settings: "None",
  },
  {
    id: "client",
    label: "Client",
    projects: "Shared",
    billing: "Own invoices",
    marketplace: "None",
    settings: "Profile",
  },
  {
    id: "developer",
    label: "Developer",
    projects: "Assigned",
    billing: "Earnings",
    marketplace: "Apply",
    settings: "Profile",
  },
];

export function WorkspaceSettings() {
  const { user } = useRequiredAuth();
  const { workspace, workspaces, setWorkspaceId, resetDemoData } =
    useWorkspaceStore();
  const { theme, setTheme } = useTheme();
  const [notifs, setNotifs] = useLocalStorage(
    "worksphere.settings.notifications",
    DEFAULT_NOTIFS
  );
  const [twoFa, setTwoFa] = useLocalStorage(
    "worksphere.settings.demo2fa",
    false
  );
  const [roles, setRoles] = useState(ROLE_MATRIX_SEED);
  const [resetOpen, setResetOpen] = useState(false);

  const isSuper = user.role === "super_admin";

  const profileFields = useMemo(
    () => [
      { label: "Name", value: user.name },
      { label: "Email", value: user.email },
      { label: "Role", value: user.role },
      { label: "Title", value: user.title ?? "—" },
      { label: "Portal", value: user.portal },
    ],
    [user]
  );

  function updateRoleLabel(id: string, label: string) {
    setRoles((prev) =>
      prev.map((r) => (r.id === id ? { ...r, label } : r))
    );
  }

  function confirmReset() {
    resetDemoData();
    setResetOpen(false);
    toast.success("Demo data reset", {
      description: "Workspace store restored to seed fixtures.",
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Settings"
        description="Profile, workspace preferences, roles and demo data controls."
        actions={
          isSuper ? (
            <Button
              size="sm"
              variant="outline"
              render={<Link href="/super-admin/dashboard" />}
              nativeButton={false}
            >
              <Shield data-icon="inline-start" />
              Super Admin
              <ExternalLink data-icon="inline-end" className="size-3.5" />
            </Button>
          ) : null
        }
      />

      <Tabs defaultValue="profile">
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <SectionCard title="Your profile" description="From the current demo session">
            <dl className="grid gap-3 sm:grid-cols-2">
              {profileFields.map((f) => (
                <div key={f.label} className="rounded-lg border border-border px-3 py-2.5">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {f.label}
                  </dt>
                  <dd className="mt-1 text-sm font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <ProductionTemplatesPanel />
        </TabsContent>

        <TabsContent value="workspace" className="mt-4">
          <SectionCard
            title="Workspace"
            description="Active tenant workspace in this demo"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-xs font-medium">Active workspace</label>
                <Select
                  value={workspace.id}
                  onValueChange={(v) => {
                    if (v) setWorkspaceId(v);
                    toast.message("Workspace switched (demo)");
                  }}
                >
                  <SelectTrigger className="w-full min-w-56 sm:w-72">
                    <SelectValue>{workspace.name}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {workspaces.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} · {w.plan}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="secondary">{workspace.plan}</Badge>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Company: {workspace.companyName ?? workspace.name} · Seats:{" "}
              {workspace.seats ?? "—"}
            </p>
          </SectionCard>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <SectionCard
            title="Notification preferences"
            description="Stored in localStorage for this browser"
          >
            <ul className="flex flex-col gap-3">
              {(
                [
                  ["emailDigest", "Email digest"],
                  ["taskAssigned", "Task assigned"],
                  ["approvals", "Approval requests"],
                  ["marketplace", "Marketplace activity"],
                  ["weeklyReport", "Weekly report"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm"
                >
                  <span>{label}</span>
                  <Checkbox
                    checked={notifs[key]}
                    onCheckedChange={(checked) =>
                      setNotifs((prev) => ({
                        ...prev,
                        [key]: Boolean(checked),
                      }))
                    }
                  />
                </label>
              ))}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <SectionCard
            title="Roles matrix"
            description="Static demo permissions — labels editable in local state only"
            bodyClassName="overflow-x-auto p-0"
          >
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Role label</th>
                  <th className="px-4 py-2.5 font-medium">Projects</th>
                  <th className="px-4 py-2.5 font-medium">Billing</th>
                  <th className="px-4 py-2.5 font-medium">Marketplace</th>
                  <th className="px-4 py-2.5 font-medium">Settings</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      <Input
                        value={role.label}
                        onChange={(e) =>
                          updateRoleLabel(role.id, e.target.value)
                        }
                        className="h-8 max-w-[180px]"
                      />
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {role.projects}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {role.billing}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {role.marketplace}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {role.settings}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </TabsContent>

        <TabsContent value="appearance" className="mt-4">
          <SectionCard title="Appearance" description="Theme via next-themes">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Theme</label>
              <Select
                value={theme ?? "system"}
                onValueChange={(v) => setTheme(v ?? "system")}
              >
                <SelectTrigger className="w-48">
                  <SelectValue>
                    {(theme ?? "system").charAt(0).toUpperCase() +
                      (theme ?? "system").slice(1)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <SectionCard
            title="Security"
            description="Demo-only toggles — not real authentication hardening"
          >
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
              <div>
                <p className="font-medium">Two-factor authentication</p>
                <p className="text-xs text-muted-foreground">
                  Simulated preference stored locally
                </p>
              </div>
              <Checkbox
                checked={twoFa}
                onCheckedChange={(checked) => {
                  setTwoFa(Boolean(checked));
                  toast.message(
                    checked ? "2FA enabled (demo)" : "2FA disabled (demo)"
                  );
                }}
              />
            </label>
          </SectionCard>
        </TabsContent>

        <TabsContent value="data" className="mt-4">
          <SectionCard
            title="Demo data"
            description="Reset persisted workspace snapshot to seed fixtures"
          >
            <p className="text-sm text-muted-foreground">
              Clears local workspace mutations (projects, tasks, marketplace
              activity, etc.) and restores the built-in demo dataset.
            </p>
            <Button
              className="mt-4"
              variant="destructive"
              onClick={() => setResetOpen(true)}
            >
              Reset demo data
            </Button>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset all demo data?</DialogTitle>
            <DialogDescription>
              This calls <code className="text-xs">resetDemoData</code> and
              cannot be undone within the current browser snapshot.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReset}>
              Confirm reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
