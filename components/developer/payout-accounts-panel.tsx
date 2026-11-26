"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Star, Trash2 } from "lucide-react";
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
import { SectionCard } from "@/components/shared/section-card";
import {
  createApiPayoutAccount,
  deleteApiPayoutAccount,
  listApiMyPayoutAccounts,
  patchApiPayoutAccount,
} from "@/lib/api/workspace-api";
import { isApiDataSource } from "@/lib/data-source";
import type {
  DeveloperPayoutAccount,
  PayoutMethodType,
} from "@/lib/portal-types";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { toast } from "sonner";

const METHOD_LABEL: Record<PayoutMethodType, string> = {
  bank_transfer: "Bank transfer",
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
};

export function PayoutAccountsPanel() {
  const { workspace } = useWorkspaceStore();
  const [items, setItems] = useState<DeveloperPayoutAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [methodType, setMethodType] =
    useState<PayoutMethodType>("bank_transfer");
  const [label, setLabel] = useState("");
  const [accountTitle, setAccountTitle] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [iban, setIban] = useState("");
  const [branchCode, setBranchCode] = useState("");

  const reload = useCallback(async () => {
    if (!workspace?.id || !isApiDataSource()) return;
    setLoading(true);
    try {
      const data = await listApiMyPayoutAccounts(workspace.id);
      setItems(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, [workspace?.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onCreate() {
    if (!workspace?.id) return;
    setSaving(true);
    try {
      await createApiPayoutAccount(workspace.id, {
        methodType,
        label: label.trim() || undefined,
        accountTitle: accountTitle.trim(),
        bankName: methodType === "bank_transfer" ? bankName.trim() : null,
        accountNumber: accountNumber.trim(),
        iban: iban.trim() || null,
        branchCode: branchCode.trim() || null,
        isPrimary: items.length === 0,
      });
      setLabel("");
      setAccountTitle("");
      setBankName("");
      setAccountNumber("");
      setIban("");
      setBranchCode("");
      toast.success("Payout method saved");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function makePrimary(id: string) {
    if (!workspace?.id) return;
    try {
      await patchApiPayoutAccount(workspace.id, id, { isPrimary: true });
      toast.success("Primary payout method updated");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function remove(id: string) {
    if (!workspace?.id) return;
    if (!window.confirm("Remove this payout method?")) return;
    try {
      await deleteApiPayoutAccount(workspace.id, id);
      toast.success("Payout method removed");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    }
  }

  if (!isApiDataSource()) {
    return (
      <SectionCard title="Payout methods">
        <p className="text-sm text-muted-foreground">
          API mode required to manage Bank / JazzCash / Easypaisa details.
        </p>
      </SectionCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Your payout methods"
        description="Admin pays into your primary account and uploads proof on Finance. Pakistan: Bank transfer, JazzCash, or Easypaisa."
        action={
          loading ? <Loader2 className="size-4 animate-spin" /> : null
        }
      >
        <ul className="flex flex-col gap-3">
          {items.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-border px-3 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">
                      {METHOD_LABEL[a.methodType]}
                      {a.label ? ` · ${a.label}` : ""}
                    </p>
                    {a.isPrimary ? (
                      <Badge variant="secondary">Primary</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm">{a.accountTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.bankName ? `${a.bankName} · ` : ""}
                    {a.accountNumber}
                    {a.iban ? ` · IBAN ${a.iban}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!a.isPrimary ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void makePrimary(a.id)}
                    >
                      <Star className="size-3.5" />
                      Make primary
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => void remove(a.id)}
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
          {items.length === 0 && !loading ? (
            <li className="text-sm text-muted-foreground">
              No payout methods yet. Add one below so Admin can pay you.
            </li>
          ) : null}
        </ul>
      </SectionCard>

      <SectionCard title="Add payout method">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Method</label>
            <Select
              value={methodType}
              onValueChange={(v) =>
                typeof v === "string" &&
                setMethodType(v as PayoutMethodType)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                <SelectItem value="jazzcash">JazzCash</SelectItem>
                <SelectItem value="easypaisa">Easypaisa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Label (optional)</label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Personal HBL"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-medium">Account title</label>
            <Input
              value={accountTitle}
              onChange={(e) => setAccountTitle(e.target.value)}
              placeholder="As per CNIC / bank"
            />
          </div>
          {methodType === "bank_transfer" ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Bank name</label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="HBL / Meezan / UBL"
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">
              {methodType === "bank_transfer"
                ? "Account number"
                : "Wallet / mobile number"}
            </label>
            <Input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder={
                methodType === "bank_transfer" ? "Account number" : "03XXXXXXXXX"
              }
            />
          </div>
          {methodType === "bank_transfer" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">IBAN (optional)</label>
                <Input
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  placeholder="PK00XXXX..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">
                  Branch code (optional)
                </label>
                <Input
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                />
              </div>
            </>
          ) : null}
        </div>
        <Button
          className="mt-4"
          disabled={saving || !accountTitle.trim() || !accountNumber.trim()}
          onClick={() => void onCreate()}
        >
          {saving ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            <Plus data-icon="inline-start" />
          )}
          Save payout method
        </Button>
      </SectionCard>
    </div>
  );
}
