"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRequiredAuth } from "@/lib/auth-store";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { Project } from "@/lib/types";

interface DeleteProjectDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, navigate to /projects after successful delete */
  redirectOnSuccess?: boolean;
}

function canDeleteProjects(role: string | undefined) {
  return (
    role === "tenant_admin" ||
    role === "project_manager" ||
    role === "super_admin"
  );
}

export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
  redirectOnSuccess = false,
}: DeleteProjectDialogProps) {
  const router = useRouter();
  const { user } = useRequiredAuth();
  const { deleteProject } = useWorkspaceStore();
  const [confirmName, setConfirmName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setConfirmName("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const authorized = canDeleteProjects(user.role);
  const nameMatches =
    Boolean(project) && confirmName.trim() === (project?.name ?? "");

  async function handleDelete() {
    if (!project || !authorized || !nameMatches || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await deleteProject(project.id, confirmName.trim());
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Project permanently deleted", {
        description: "Associated project-specific data was removed.",
      });
      onOpenChange(false);
      if (redirectOnSuccess) {
        router.replace("/projects");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Delete project failed";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!submitting}>
        <DialogHeader>
          <DialogTitle>Permanently Delete Project?</DialogTitle>
          <DialogDescription>
            This will permanently delete this project and its associated tasks,
            milestones, assignments, submissions, approvals, documents and other
            project-specific data. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {!authorized ? (
          <p className="text-sm text-destructive">
            Only Admin or Project Manager roles can permanently delete projects.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <label htmlFor="confirm-project-name" className="text-xs font-medium">
              Type{" "}
              <span className="font-semibold text-foreground">
                {project?.name}
              </span>{" "}
              to confirm
            </label>
            <Input
              id="confirm-project-name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Exact project name"
              disabled={submitting || !project}
              autoComplete="off"
            />
            {error ? (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!authorized || !nameMatches || submitting || !project}
            onClick={() => void handleDelete()}
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" data-icon="inline-start" />
                Deleting...
              </>
            ) : (
              "Delete Project"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { canDeleteProjects };
