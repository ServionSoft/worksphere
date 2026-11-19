"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import {
  createApiChangeOrder,
  listApiChangeOrders,
  resolveApiChangeOrder,
  type ChangeOrder,
} from "@/lib/api/workspace-api";
import { isApiDataSource } from "@/lib/data-source";
import { formatCurrency, formatDate } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function ChangeOrdersPanel() {
  const { workspace, projects, assignments } = useWorkspaceStore();
  const [orders, setOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [assignmentId, setAssignmentId] = useState<string>("");
  const [newBudget, setNewBudget] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    if (!isApiDataSource()) {
      setOrders([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await listApiChangeOrders(workspace.id);
      setOrders(rows);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load change orders"
      );
    } finally {
      setLoading(false);
    }
  }, [workspace.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function createOrder() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!projectId && !assignmentId) {
      toast.error("Select a project or assignment");
      return;
    }
    if (!isApiDataSource()) {
      toast.error("Change orders require API mode");
      return;
    }
    setSubmitting(true);
    try {
      await createApiChangeOrder(workspace.id, {
        title: title.trim(),
        reason: reason.trim() || undefined,
        projectId: projectId || null,
        assignmentId: assignmentId || null,
        newBudget: newBudget ? Number(newBudget) : null,
        newDeadline: newDeadline || null,
      });
      toast.success("Change order created");
      setTitle("");
      setReason("");
      setNewBudget("");
      setNewDeadline("");
      await reload();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to create change order"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function resolve(id: string, decision: "approved" | "rejected") {
    try {
      await resolveApiChangeOrder(workspace.id, id, decision);
      toast.success(decision === "approved" ? "Approved" : "Rejected");
      await reload();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to resolve change order"
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Request change order"
        description="Adjust locked assignment budget/deadline or project commercial terms."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Project</label>
            <Select
              value={projectId || null}
              onValueChange={(v) => setProjectId(typeof v === "string" ? v : "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Assignment</label>
            <Select
              value={assignmentId || null}
              onValueChange={(v) =>
                setAssignmentId(typeof v === "string" ? v : "")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {assignments.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.title || a.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">New budget</label>
            <Input
              type="number"
              value={newBudget}
              onChange={(e) => setNewBudget(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">New deadline</label>
            <Input
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-medium">Reason</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <div className="mt-3">
          <Button onClick={() => void createOrder()} disabled={submitting}>
            Create change order
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Change orders"
        description={loading ? "Loading…" : `${orders.length} records`}
        bodyClassName="p-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.title}</TableCell>
                <TableCell>
                  <Badge variant="outline">{o.status}</Badge>
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {o.newBudget != null ? formatCurrency(o.newBudget) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {o.newDeadline ? formatDate(o.newDeadline) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(o.createdAt)}
                </TableCell>
                <TableCell>
                  {o.status === "pending" || o.status === "requested" ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void resolve(o.id, "approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void resolve(o.id, "rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {orders.length === 0 && !loading ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No change orders yet.
          </p>
        ) : null}
      </SectionCard>
    </div>
  );
}
