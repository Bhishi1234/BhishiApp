"use client";

import { useState } from "react";
import { Check, Clock, Pencil } from "lucide-react";
import { toast } from "sonner";
import { claimHaptaAction, updateContributionAction } from "@/app/actions/contributions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/components/i18n/locale-provider";
import { daysLate } from "@/lib/dates";
import { formatDayMonth, formatRupees } from "@/lib/format";
import type { Contribution, ContributionStatus, PaymentMode } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ContributionCell({
  contribution,
  groupId,
  canEdit,
  canClaim = false,
  memberName,
  cycleNumber,
  dueDate,
  highlight = false,
}: {
  contribution: Contribution;
  groupId: string;
  canEdit: boolean;
  canClaim?: boolean;
  memberName: string;
  cycleNumber: number;
  dueDate: string;
  highlight?: boolean;
}) {
  const { t, locale } = useT();
  const [open, setOpen] = useState(false);
  const [partial, setPartial] = useState(
    String(contribution.amount_paid || contribution.amount_due || ""),
  );
  const [mode, setMode] = useState<PaymentMode>(contribution.payment_mode ?? "upi");
  const [pending, setPending] = useState(false);

  const paid = contribution.status === "paid";
  const partialPaid = contribution.status === "partial";
  const claimed = Boolean(contribution.member_claimed_at) && !paid && !partialPaid;
  const lateDays = !paid && !partialPaid ? daysLate(dueDate) : 0;
  const tappable = canEdit || (canClaim && !paid && !claimed);

  const modes: { id: PaymentMode; label: string }[] = [
    { id: "upi", label: "UPI" },
    { id: "cash", label: t("cash") },
    { id: "bank_transfer", label: t("bank") },
  ];

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
        ? t("markedPaid", { name: memberName })
        : status === "partial"
          ? t("markedPartial", { name: memberName })
          : t("markedDue", { name: memberName }),
    );
    setOpen(false);
  }

  async function claim() {
    setPending(true);
    const result = await claimHaptaAction({
      contributionId: contribution.id,
      groupId,
      paymentMode: mode,
    });
    setPending(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success(t("claimedToast"));
      setOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={!tappable}
        onClick={() => tappable && setOpen(true)}
        className={cn(
          "flex w-[7.75rem] shrink-0 flex-col rounded-2xl border-2 px-3 py-3 text-left shadow-[0_8px_20px_rgba(37,99,235,0.06)] transition",
          paid && "border-emerald-200 bg-emerald-50",
          (partialPaid || claimed) && !paid && "border-amber-200 bg-amber-50",
          highlight && "border-primary bg-[#eff6ff]",
          !paid && !partialPaid && !claimed && lateDays > 0 && "border-red-200 bg-red-50",
          tappable && "active:scale-[0.98]",
          !tappable && "opacity-80",
        )}
      >
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {t("monthN", { n: cycleNumber })}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-foreground">
          {formatDayMonth(dueDate, locale)}
        </p>
        <span
          className={cn(
            "mt-3 inline-flex min-h-8 items-center justify-center gap-1 rounded-full px-2 text-xs font-bold",
            paid && "bg-emerald-600 text-white",
            (partialPaid || claimed) && !paid && "bg-amber-500 text-white",
            !paid && !partialPaid && !claimed && lateDays > 0 && "bg-red-600 text-white",
            !paid && !partialPaid && !claimed && lateDays === 0 && "bg-secondary text-foreground",
          )}
        >
          {paid ? (
            <>
              <Check className="size-3.5" /> {t("paid")}
            </>
          ) : partialPaid ? (
            formatRupees(contribution.amount_paid)
          ) : claimed ? (
            t("claimed")
          ) : lateDays > 0 ? (
            lateDays === 1 ? t("dayLate") : t("daysLate", { n: lateDays })
          ) : (
            <>
              <Clock className="size-3.5" /> {t("due")}
            </>
          )}
        </span>
        {canEdit ? (
          <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
            <Pencil className="size-3" />
            {claimed
              ? t("claimedConfirm")
              : paid || partialPaid
                ? t("update")
                : t("tapToMark")}
          </span>
        ) : canClaim && !paid && !claimed ? (
          <span className="mt-2 text-[11px] font-semibold text-primary">{t("iPaid")}</span>
        ) : (
          <span className="mt-2 text-[11px] text-muted-foreground">{t("viewOnly")}</span>
        )}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
            <p className="text-sm font-semibold text-primary">
              {t("monthN", { n: cycleNumber })} · {formatDayMonth(dueDate, locale)}
            </p>
            <h3 className="mt-1 text-xl font-bold">{memberName}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {t("haptaDueLine", {
                amount: formatRupees(contribution.amount_due),
                date: formatDayMonth(dueDate, locale),
              })}{" "}
              {t("haptaOutside")}
            </p>

            <p className="mt-5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("howPaid")}
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

            {canEdit ? (
              <>
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {t("partialAmount")}
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
                    {pending
                      ? t("saving")
                      : claimed
                        ? t("confirmReceived")
                        : t("markPaid", { amount: formatRupees(contribution.amount_due) })}
                  </Button>
                  <Button
                    variant="accent"
                    className="w-full"
                    disabled={pending}
                    onClick={() => save("partial")}
                  >
                    {t("savePartial")}
                  </Button>
                  <Button variant="outline" className="w-full" disabled={pending} onClick={() => save("unpaid")}>
                    {t("keepDue")}
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => setOpen(false)}>
                    {t("cancel")}
                  </Button>
                </div>
              </>
            ) : (
              <div className="mt-5 space-y-2">
                <Button className="w-full" size="lg" disabled={pending} onClick={claim}>
                  {pending ? t("saving") : t("iPaid")}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setOpen(false)}>
                  {t("cancel")}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
