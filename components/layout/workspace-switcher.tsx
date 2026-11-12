"use client";

import { useState } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { workspace, workspaces, setWorkspaceId, createWorkspace } =
    useWorkspaceStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [plan, setPlan] = useState("Pro");
  const [seats, setSeats] = useState("10");
  const [color, setColor] = useState("#0EA5E9");

  function openCreate() {
    setName("");
    setCompanyName("");
    setPlan("Pro");
    setSeats("10");
    setColor("#0EA5E9");
    setCreateOpen(true);
  }

  function submitCreate() {
    if (!name.trim()) {
      toast.error("Workspace name is required");
      return;
    }
    const seatCount = Number(seats);
    if (!Number.isFinite(seatCount) || seatCount < 1) {
      toast.error("Seats must be at least 1");
      return;
    }
    const created = createWorkspace({
      name: name.trim(),
      companyName: companyName.trim() || name.trim(),
      plan: plan.trim() || "Pro",
      color: color.trim() || "#0EA5E9",
      seats: seatCount,
    });
    setCreateOpen(false);
    toast.success("Workspace created", {
      description: `${created.name} is selected. Demo data starts empty for this workspace.`,
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              className={cn(
                "h-auto w-full justify-between border-border bg-background px-2.5 py-2 hover:bg-muted",
                collapsed && "justify-center px-0"
              )}
            />
          }
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: workspace.color }}
            />
            {!collapsed ? (
              <span className="min-w-0 text-left">
                <span className="block truncate text-xs font-medium text-foreground">
                  {workspace.name}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {workspace.plan}
                </span>
              </span>
            ) : null}
          </span>
          {!collapsed ? (
            <ChevronsUpDown className="size-3.5 text-muted-foreground" />
          ) : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {workspaces.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onClick={() => setWorkspaceId(item.id)}
                className="justify-between"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.name}
                </span>
                {item.id === workspace.id ? (
                  <Check className="size-3.5 text-primary" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              openCreate();
            }}
          >
            Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
            <DialogDescription>
              Demo tenant only — stored in localStorage with the shared workspace
              snapshot. No cloud provisioning.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="grid gap-1 text-xs font-medium">
              Workspace name
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Contoso Labs"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium">
              Company name
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Defaults to workspace name"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-medium">
                Plan
                <Input
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  placeholder="Pro"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Seats
                <Input
                  type="number"
                  min={1}
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                />
              </label>
            </div>
            <label className="grid gap-1 text-xs font-medium">
              Accent color
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-full p-1"
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitCreate}>Create workspace</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
