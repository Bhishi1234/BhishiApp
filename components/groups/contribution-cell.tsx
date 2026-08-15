"use client";

import { useState } from "react";
import { Check, Clock, Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateContributionAction } from "@/app/actions/contributions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDayMonth, formatRupees } from "@/lib/format";
import type { Contribution, ContributionStatus, PaymentMode } from "@/lib/types";
import { cn } from "@/lib/utils";

const modes: { id: PaymentMode; label: string }[] = [
  { id: "upi", label: "UPI" },
  { id: "cash", label: "Cash" },
  { id: "bank_transfer", label: "Bank" },
];

export function ContributionCell({
  contribution,
  groupId,
  canEdit,
  memberName,
  cycleNumber,
  dueDate,
  highlight = false,
}: {
  contribution: Contribution;
  groupId: string;
  canEdit: boolean;
  memberName: string;
  cycleNumber: number;
  dueDate: string;
  highlight?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [partial, setPartial] = useState(
    String(contribution.amount_paid || contribution.amount_due || ""),
  );
  const [mode, setMode] = useState<PaymentMode>(contribution.payment_mode ?? "upi");
  const [pending, setPending] = useState(false);

  const paid = contribution.status === "paid";
  const partialPaid = contribution.status === "partial";

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
    toast.success(
      status === "paid"
        ? `${memberName} marked paid`
        : status === "partial"
          ? `${memberName} marked partial`
          : `${memberName} marked due`,
    );
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        disabled={!canEdit}
        onClick={() => canEdit && setOpen(true)}
        className={cn(
          "flex w-[7.75rem] shrink-0 snap-start flex-col rounded-2xl border px-3 py-3 text-left shadow-[0_8px_20px_rgba(37,99,235,0.06)] transition",
          paid && "border-emerald-200 bg-emerald-50",
          partialPaid && "border-amber-200 bg-amber-50",
          !paid && !partialPaid && "border-border bg-white",
          highlight && "ring-2 ring-primary ring-offset-2",
          canEdit && "active:scale-[0.98]",
          !canEdit && "opacity-80",
        )}
      >
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Month {cycleNumber}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-foreground">{formatDayMonth(dueDate)}</p>
        <span
          className={cn(
            "mt-3 inline-flex min-h-8 items-center justify-center gap-1 rounded-full px-2 text-xs font-bold",
            paid && "bg-emerald-600 text-white",
            partialPaid && "bg-amber-500 text-white",
            !paid && !partialPaid && "bg-secondary text-foreground",
          )}
        >
          {paid ? (
            <>
              <Check className="size-3.5" /> Paid
            </>
          ) : partialPaid ? (
            formatRupees(contribution.amount_paid)
          ) : (
            <>
              <Clock className="size-3.5" /> Due
            </>
          )}
        </span>
        {canEdit ? (
          <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
            <Pencil className="size-3" />
            {paid || partialPaid ? "Update" : "Tap to mark"}
          </span>
        ) : (
          <span className="mt-2 text-[11px] text-muted-foreground">View only</span>
        )}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
            <p className="text-sm font-semibold text-primary">
              Month {cycleNumber} · {formatDayMonth(dueDate)}
            </p>
            <h3 className="mt-1 text-xl font-bold">{memberName}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Hapta due {formatRupees(contribution.amount_due)}. This only updates the register —
              money is paid outside the app.
            </p>

            <p className="mt-5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              How was it paid?
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {modes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={cn(
                    "h-11 rounded-xl text-sm font-semibold",
                    mode === item.id
                      ? "bg-primary text-white shadow-[0_8px_16px_rgba(37,99,235,0.25)]"
                      : "bg-secondary text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Partial amount, if any
              </p>
              <Input
                inputMode="numeric"
                value={partial}
                onChange={(event) => setPartial(event.target.value)}
                placeholder={String(contribution.amount_due)}
              />
            </div>

            <div className="mt-5 space-y-2">
              <Button className="w-full" size="lg" disabled={pending} onClick={() => save("paid")}>
                {pending ? "Saving…" : `Mark paid · ${formatRupees(contribution.amount_due)}`}
              </Button>
              <Button
                variant="accent"
                className="w-full"
                disabled={pending}
                onClick={() => save("partial")}
              >
                Save partial amount
              </Button>
              <Button variant="outline" className="w-full" disabled={pending} onClick={() => save("unpaid")}>
                Keep as due
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
