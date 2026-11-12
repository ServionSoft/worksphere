"use client";

import { Fragment, useMemo, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
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
import { demoId } from "@/lib/demo-clock";
import type { Client, ClientStatus } from "@/lib/types";
import { useWorkspaceStore } from "@/lib/workspace-store";

type ClientForm = {
  name: string;
  industry: string;
  contactName: string;
  email: string;
  phone: string;
  status: ClientStatus;
};

const emptyForm: ClientForm = {
  name: "",
  industry: "",
  contactName: "",
  email: "",
  phone: "",
  status: "prospect",
};

export function ClientsManagement() {
  const { clients, projects, workspace, addClient, updateClient } =
    useWorkspaceStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        (c.contactName ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
    );
  }, [clients, query]);

  const projectsByClient = useMemo(() => {
    const map = new Map<string, typeof projects>();
    for (const project of projects) {
      const list = map.get(project.clientId) ?? [];
      list.push(project);
      map.set(project.clientId, list);
    }
    return map;
  }, [projects]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(client: Client) {
    setEditingId(client.id);
    setForm({
      name: client.name,
      industry: client.industry,
      contactName: client.contactName ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      status: client.status ?? "active",
    });
    setOpen(true);
  }

  function save() {
    if (!form.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    const patch = {
      name: form.name.trim(),
      industry: form.industry.trim() || "General",
      contactName: form.contactName.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      status: form.status,
    };
    if (editingId) {
      updateClient(editingId, patch);
      toast.success("Client updated");
    } else {
      addClient({
        id: demoId("c"),
        workspaceId: workspace.id,
        ...patch,
      });
      toast.success("Client added");
    }
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Clients"
        description="Client accounts, contacts, and linked projects."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            Add client
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients..."
          className="pl-8"
        />
      </div>

      <SectionCard
        title="Client directory"
        description={`${filtered.length} of ${clients.length} clients`}
        bodyClassName="p-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Projects</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((client) => {
              const linked = projectsByClient.get(client.id) ?? [];
              const expanded = expandedId === client.id;
              return (
                <Fragment key={client.id}>
                  <TableRow>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.industry}</TableCell>
                    <TableCell>{client.contactName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.phone ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setExpandedId(expanded ? null : client.id)
                        }
                      >
                        {linked.length}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusClass(client.status ?? "active")}
                      >
                        {(client.status ?? "active").replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(client)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expanded ? (
                    <TableRow>
                      <TableCell colSpan={8} className="bg-muted/30">
                        {linked.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No projects linked to this client.
                          </p>
                        ) : (
                          <ul className="flex flex-col gap-1 text-sm">
                            {linked.map((project) => (
                              <li key={project.id}>
                                <span className="font-medium">
                                  {project.name}
                                </span>
                                <span className="text-muted-foreground">
                                  {" "}
                                  · {project.status.replace("_", " ")} ·{" "}
                                  {project.progress}%
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No clients match your search.
          </p>
        ) : null}
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit client" : "Add client"}
            </DialogTitle>
            <DialogDescription>
              Client records are stored in the shared workspace store.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Field
              label="Name"
              value={form.name}
              onChange={(v) => setForm((p) => ({ ...p, name: v }))}
            />
            <Field
              label="Industry"
              value={form.industry}
              onChange={(v) => setForm((p) => ({ ...p, industry: v }))}
            />
            <Field
              label="Contact"
              value={form.contactName}
              onChange={(v) => setForm((p) => ({ ...p, contactName: v }))}
            />
            <Field
              label="Email"
              value={form.email}
              onChange={(v) => setForm((p) => ({ ...p, email: v }))}
            />
            <Field
              label="Phone"
              value={form.phone}
              onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Status</label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  typeof v === "string" &&
                  setForm((p) => ({ ...p, status: v as ClientStatus }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function statusClass(status: ClientStatus) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "prospect") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
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
