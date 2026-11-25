"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDeadline?: string | null;
  onSubmit: (requestedDate: string, reason: string) => void;
  title?: string;
  description?: string;
};

export function RequestDeadlineExtensionDialog({
  open,
  onOpenChange,
  currentDeadline,
  onSubmit,
  title = "Request deadline extension",
  description = "Propose a new deadline and reason. An administrator must authorize the change.",
}: Props) {
  const [date, setDate] = useState(currentDeadline?.slice(0, 10) ?? "");
  const [reason, setReason] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDate(currentDeadline?.slice(0, 10) ?? "");
          setReason("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium">Requested deadline</label>
            <Input
              className="mt-1"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Reason</label>
            <Textarea
              className="mt-1"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why do you need more time?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!date || !reason.trim()) {
                toast.error("Provide a date and reason");
                return;
              }
              onSubmit(date, reason.trim());
              onOpenChange(false);
              toast.success("Extension request sent", {
                description: "Admin must authorize deadline changes.",
              });
            }}
          >
            Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
