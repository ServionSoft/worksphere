"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createApiPaymentProofUploadUrl,
  listApiDeveloperPayoutAccounts,
  markApiEarningPaid,
} from "@/lib/api/workspace-api";
import { formatCurrency } from "@/lib/format";
import type {
  DeveloperPayoutAccount,
  EarningRecord,
} from "@/lib/portal-types";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  earning: EarningRecord | null;
  developerName: string;
  onPaid: () => void;
};

export function MarkPaidDialog({
  open,
  onOpenChange,
  workspaceId,
  earning,
  developerName,
  onPaid,
}: Props) {
  const [accounts, setAccounts] = useState<DeveloperPayoutAccount[]>([]);
  const [accountId, setAccountId] = useState<string>("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  useEffect(() => {
    if (!open || !earning) return;
    setReference("");
    setNote("");
    setFile(null);
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setAmount(String(earning.netAmount ?? earning.amount));
    setCurrency(earning.currency || "USD");
    setAccountId("");
    setLoadingAccounts(true);
    void listApiDeveloperPayoutAccounts(workspaceId, earning.developerId)
      .then((rows) => {
        setAccounts(rows);
        const primary = rows.find((a) => a.isPrimary) ?? rows[0];
        setAccountId(primary?.id ?? "");
      })
      .catch((e) => {
        toast.error(
          e instanceof Error ? e.message : "Could not load payout accounts"
        );
        setAccounts([]);
      })
      .finally(() => setLoadingAccounts(false));
  }, [open, earning, workspaceId]);

  const selected = accounts.find((a) => a.id === accountId) ?? null;

  async function submit() {
    if (!earning) return;
    if (!accountId) {
      toast.error("Select a developer payout account");
      return;
    }
    if (!reference.trim()) {
      toast.error("Transaction reference is required");
      return;
    }
    if (!file) {
      toast.error("Upload payment screenshot or PDF proof");
      return;
    }
    const paymentAmount = Number(amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      toast.error("Valid payment amount is required");
      return;
    }

    setBusy(true);
    try {
      const upload = await createApiPaymentProofUploadUrl(
        workspaceId,
        earning.id,
        {
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }
      );
      const put = await fetch(upload.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": upload.contentType || file.type || "application/octet-stream",
          ...(upload.token ? { "x-upsert": "true" } : {}),
        },
        body: file,
      });
      if (!put.ok) {
        throw new Error(`Proof upload failed (${put.status})`);
      }

      await markApiEarningPaid(workspaceId, earning.id, {
        providerReference: reference.trim(),
        note: note.trim() || undefined,
        payoutAccountId: accountId,
        paymentAmount,
        paymentCurrency: currency.trim().toUpperCase(),
        paymentDate,
        proofStoragePath: upload.storagePath || upload.path,
        proofFileName: file.name,
        proofMimeType: upload.contentType || file.type || "application/pdf",
        proofSizeBytes: file.size,
      });
      toast.success("Payout marked paid with proof");
      onPaid();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mark paid failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Mark payout paid</DialogTitle>
          <DialogDescription>
            Pay {developerName} outside the app, then record amount, reference,
            and screenshot/PDF proof. Paid is not saved if proof upload fails.
          </DialogDescription>
        </DialogHeader>

        {earning ? (
          <div className="flex flex-col gap-3 text-sm">
            <p>
              <span className="text-muted-foreground">Assignment:</span>{" "}
              {earning.assignmentTitle}
            </p>
            <p>
              <span className="text-muted-foreground">Net due:</span>{" "}
              {formatCurrency(
                earning.netAmount ?? earning.amount,
                earning.currency
              )}
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Pay to account</label>
              {loadingAccounts ? (
                <p className="text-xs text-muted-foreground">Loading accounts…</p>
              ) : accounts.length === 0 ? (
                <p className="text-xs text-destructive">
                  Developer has no payout methods. Ask them to add Bank /
                  JazzCash / Easypaisa under Settings.
                </p>
              ) : (
                <Select
                  value={accountId || undefined}
                  onValueChange={(v) => typeof v === "string" && setAccountId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.methodType.replace(/_/g, " ")}
                        {a.isPrimary ? " (primary)" : ""} · {a.accountTitle} ·{" "}
                        {a.accountNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selected ? (
                <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
                  {selected.methodType.replace(/_/g, " ")} ·{" "}
                  {selected.accountTitle}
                  {selected.bankName ? ` · ${selected.bankName}` : ""} ·{" "}
                  {selected.accountNumber}
                  {selected.iban ? ` · IBAN ${selected.iban}` : ""}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Amount paid</label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  step="0.01"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Currency</label>
                <Input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  maxLength={3}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Payment date</label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Transaction ref</label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Bank / JazzCash txn id"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">
                Payment proof (PNG / JPG / WEBP / PDF)
              </label>
              <Input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Note (optional)</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={busy || !accounts.length}
            onClick={() => void submit()}
          >
            {busy ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : null}
            Confirm paid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
