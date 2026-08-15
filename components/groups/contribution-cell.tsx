"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateContributionAction } from "@/app/actions/contributions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRupees } from "@/lib/format";
import type { Contribution, ContributionStatus, PaymentMode } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ContributionCell({
  contribution,
  groupId,
  canEdit,
}: {
  contribution: Contribution;
  groupId: string;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [partial, setPartial] = useState(String(contribution.amount_paid || ""));
  const [mode, setMode] = useState<PaymentMode>(contribution.payment_mode ?? "upi");
  const [pending, setPending] = useState(false);

  async function save(status: ContributionStatus) {
    setPending(true);
    const result = await updateContributionAction({
      contributionId: contribution.id,
      groupId,
      status,
      amountPaid: status === "partial" ? Number(partial) : undefined,
      paymentMode: status === "unpaid" ? undefined : mode,
    });
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        disabled={!canEdit}
        onClick={() => canEdit && setOpen(true)}
        className={cn(
          "min-h-11 min-w-16 rounded-lg px-2 text-xs font-semibold",
          contribution.status === "paid" && "bg-emerald-100 text-emerald-800",
          contribution.status === "partial" && "bg-amber-100 text-amber-800",
          contribution.status === "unpaid" && "bg-secondary text-muted-foreground",
        )}
      >
        {contribution.status === "paid"
          ? "Paid"
          : contribution.status === "partial"
            ? formatRupees(contribution.amount_paid)
            : "Due"}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-4">
          <div className="w-full rounded-2xl bg-card p-5">
            <h3 className="text-lg font-semibold">Update payment</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Due {formatRupees(contribution.amount_due)}. Money is paid outside the app.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(["upi", "cash", "bank_transfer"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={cn(
                    "h-10 rounded-xl text-xs font-semibold capitalize",
                    mode === item ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {item.replace("_", " ")}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <Input
                inputMode="numeric"
                value={partial}
                onChange={(event) => setPartial(event.target.value)}
                placeholder="Partial amount"
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button variant="outline" disabled={pending} onClick={() => save("unpaid")}>
                Unpaid
              </Button>
              <Button variant="accent" disabled={pending} onClick={() => save("partial")}>
                Partial
              </Button>
              <Button disabled={pending} onClick={() => save("paid")}>
                Paid
              </Button>
            </div>
            <Button variant="ghost" className="mt-2 w-full" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
