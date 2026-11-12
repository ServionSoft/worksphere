"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, UserCheck, UserX } from "lucide-react";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { demoId } from "@/lib/demo-clock";
import { formatCurrency } from "@/lib/format";
import type { DeveloperProfile } from "@/lib/portal-types";
import type { TeamMember } from "@/lib/types";
import { useWorkspaceStore } from "@/lib/workspace-store";

type MemberForm = {
  name: string;
  email: string;
  role: string;
  active: boolean;
};

const emptyMember: MemberForm = {
  name: "",
  email: "",
  role: "Project Manager",
  active: true,
};

export function TeamManagement() {
  const {
    team,
    tasks,
    developers,
    workspace,
    addTeamMember,
    updateTeamMember,
    setDeveloperStatus,
    updateDeveloperProfile,
  } = useWorkspaceStore();

  const [tab, setTab] = useState("members");
  const [memberOpen, setMemberOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyMember);
  const [profileEdit, setProfileEdit] = useState<DeveloperProfile | null>(null);
  const [skillsDraft, setSkillsDraft] = useState("");

  const workloadByMember = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of tasks) {
      if (!task.assigneeId) continue;
      map.set(task.assigneeId, (map.get(task.assigneeId) ?? 0) + 1);
    }
    return map;
  }, [tasks]);

  const pendingDevelopers = developers.filter(
    (d) => d.status === "pending_verification"
  );

  function openCreateMember() {
    setEditingId(null);
    setForm(emptyMember);
    setMemberOpen(true);
  }

  function openEditMember(member: TeamMember) {
    setEditingId(member.id);
    setForm({
      name: member.name,
      email: member.email,
      role: member.role,
      active: member.active !== false,
    });
    setMemberOpen(true);
  }

  function saveMember() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (editingId) {
      updateTeamMember(editingId, {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role.trim() || "Member",
        active: form.active,
      });
      toast.success("Member updated");
    } else {
      addTeamMember({
        id: demoId("u"),
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role.trim() || "Member",
        workspaceId: workspace.id,
        active: form.active,
        permissionRole: "internal_member",
      });
      toast.success("Member added");
    }
    setMemberOpen(false);
  }

  function saveDeveloperProfile() {
    if (!profileEdit) return;
    updateDeveloperProfile(profileEdit.id, {
      title: profileEdit.title,
      hourlyRate: profileEdit.hourlyRate,
      skills: skillsDraft
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      bio: profileEdit.bio,
      availability: profileEdit.availability,
    });
    toast.success("Developer profile updated");
    setProfileEdit(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Team Members"
        description="Internal directory, developer profiles, and verification queue."
        actions={
          tab === "members" ? (
            <Button size="sm" onClick={openCreateMember}>
              <Plus className="size-4" />
              Add member
            </Button>
          ) : null
        }
      />

      <Tabs
        value={tab}
        onValueChange={(v) => typeof v === "string" && setTab(v)}
      >
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="developers">Developers</TabsTrigger>
          <TabsTrigger value="verification">
            Verification
            {pendingDevelopers.length > 0 ? (
              <Badge variant="secondary" className="ml-1">
                {pendingDevelopers.length}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <SectionCard
            title="Directory"
            description={`${team.length} members in this workspace`}
            bodyClassName="p-0"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Workload</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.email}
                    </TableCell>
                    <TableCell>{member.role}</TableCell>
                    <TableCell>
                      {workloadByMember.get(member.id) ?? 0} tasks
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          member.active !== false
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }
                      >
                        {member.active !== false ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditMember(member)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        <TabsContent value="developers" className="mt-4">
          <div className="grid gap-3 lg:grid-cols-2">
            {developers.map((dev) => (
              <SectionCard
                key={dev.id}
                title={dev.name}
                description={dev.title}
                action={
                  <Badge variant="outline" className="capitalize">
                    {dev.status.replaceAll("_", " ")}
                  </Badge>
                }
              >
                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <p>Rating: {dev.rating || "—"}</p>
                  <p>Earnings: {formatCurrency(dev.totalEarnings)}</p>
                  <p>Completed: {dev.completedAssignments}</p>
                  <p>Rate: {formatCurrency(dev.hourlyRate)}/hr</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {dev.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setProfileEdit(dev);
                    setSkillsDraft(dev.skills.join(", "));
                  }}
                >
                  Edit profile
                </Button>
              </SectionCard>
            ))}
            {developers.length === 0 ? (
              <SectionCard title="No developers">
                <p className="text-sm text-muted-foreground">
                  No developer profiles registered yet.
                </p>
              </SectionCard>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="verification" className="mt-4">
          <div className="flex flex-col gap-3">
            {pendingDevelopers.map((dev) => (
              <SectionCard
                key={dev.id}
                title={dev.name}
                description={`${dev.title} · ${dev.email} · ${dev.country}`}
              >
                <p className="text-sm text-muted-foreground">{dev.bio}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {dev.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setDeveloperStatus(dev.id, "verified");
                      toast.success("Developer approved", {
                        description: dev.name,
                      });
                    }}
                  >
                    <UserCheck className="size-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setDeveloperStatus(dev.id, "rejected");
                      toast.success("Developer rejected", {
                        description: dev.name,
                      });
                    }}
                  >
                    <UserX className="size-4" />
                    Reject
                  </Button>
                </div>
              </SectionCard>
            ))}
            {pendingDevelopers.length === 0 ? (
              <SectionCard title="Verification queue">
                <p className="text-sm text-muted-foreground">
                  No developers awaiting verification.
                </p>
              </SectionCard>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit member" : "Add member"}
            </DialogTitle>
            <DialogDescription>
              Manage internal team directory entries for this workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Field
              label="Name"
              value={form.name}
              onChange={(v) => setForm((p) => ({ ...p, name: v }))}
            />
            <Field
              label="Email"
              value={form.email}
              onChange={(v) => setForm((p) => ({ ...p, email: v }))}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Role</label>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  typeof v === "string" && setForm((p) => ({ ...p, role: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Workspace Admin">Workspace Admin</SelectItem>
                  <SelectItem value="Project Manager">Project Manager</SelectItem>
                  <SelectItem value="Engineering Lead">Engineering Lead</SelectItem>
                  <SelectItem value="Designer">Designer</SelectItem>
                  <SelectItem value="QA Lead">QA Lead</SelectItem>
                  <SelectItem value="Developer">Developer</SelectItem>
                  <SelectItem value="Member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.active}
                onCheckedChange={(checked) =>
                  setForm((p) => ({ ...p, active: checked === true }))
                }
              />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveMember}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!profileEdit}
        onOpenChange={(open) => !open && setProfileEdit(null)}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Edit developer</DialogTitle>
            <DialogDescription>
              Update marketplace profile fields stored locally.
            </DialogDescription>
          </DialogHeader>
          {profileEdit ? (
            <div className="flex flex-col gap-3">
              <Field
                label="Title"
                value={profileEdit.title}
                onChange={(v) =>
                  setProfileEdit((p) => (p ? { ...p, title: v } : p))
                }
              />
              <Field
                label="Hourly rate"
                value={String(profileEdit.hourlyRate)}
                onChange={(v) =>
                  setProfileEdit((p) =>
                    p ? { ...p, hourlyRate: Number(v) || 0 } : p
                  )
                }
              />
              <Field
                label="Skills (comma-separated)"
                value={skillsDraft}
                onChange={setSkillsDraft}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Availability</label>
                <Select
                  value={profileEdit.availability}
                  onValueChange={(v) =>
                    typeof v === "string" &&
                    setProfileEdit((p) =>
                      p
                        ? {
                            ...p,
                            availability: v as DeveloperProfile["availability"],
                          }
                        : p
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="limited">Limited</SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileEdit(null)}>
              Cancel
            </Button>
            <Button onClick={saveDeveloperProfile}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
