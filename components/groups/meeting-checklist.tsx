"use client";

import Link from "next/link";
import { Check, CircleDashed } from "lucide-react";
import { PayoutForm } from "@/components/groups/payout-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useT } from "@/components/i18n/locale-provider";
import { formatDate, formatRupees } from "@/lib/format";
import { reminderMessage, whatsappShareUrl } from "@/lib/whatsapp";
import { updateContributionAction } from "@/app/actions/contributions";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type MeetingUnpaid = {
  memberId: string;
  contributionId: string;
  name: string;
  phone: string | null;
  claimed: boolean;
};

export function MeetingChecklist({
  groupId,
  groupName,
  amount,
  dueDate,
  cycleNumber,
  plannedCount,
  unpaid,
  paidCount,
  totalCount,
  collected,
  isAdmin,
  canDraw,
  drawn,
  winnerName,
  payoutPending,
  cycleId,
  upiId,
  meetingLabel,
  meetingDetail,
}: {
  groupId: string;
  groupName: string;
  amount: number | string;
  dueDate: string;
  cycleNumber: number;
  plannedCount: number;
  unpaid: MeetingUnpaid[];
  paidCount: number;
  totalCount: number;
  collected: number;
  isAdmin: boolean;
  canDraw: boolean;
  drawn: boolean;
  winnerName: string | null;
  payoutPending: boolean;
  cycleId: string | null;
  upiId?: string | null;
  meetingLabel: string;
  meetingDetail: string;
}) {
  const { t, locale } = useT();
  const [busyId, setBusyId] = useState<string | null>(null);

  function remind(member: MeetingUnpaid) {
    const message = reminderMessage({
      memberName: member.name,
      groupName,
      amount: formatRupees(amount),
      dueDate: formatDate(dueDate, locale),
      upiId,
    });
    window.open(whatsappShareUrl(message, member.phone), "_blank");
  }

  async function markPaid(row: MeetingUnpaid) {
    setBusyId(row.contributionId);
    const result = await updateContributionAction({
      contributionId: row.contributionId,
      groupId,
      status: "paid",
      paymentMode: "upi",
    });
    setBusyId(null);
    if (result.error) toast.error(result.error);
    else toast.success(t("markedPaid", { name: row.name }));
  }

  const collectDone = unpaid.length === 0;
  const drawDone = drawn;
  const handoverDone = drawn && !payoutPending;

  return (
    <Card className="mt-5 overflow-hidden p-0">
      <div className="panel-hero px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-primary">
            {t("monthOf", { n: cycleNumber, total: plannedCount })}
          </p>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary">
            {meetingLabel}
          </span>
        </div>
        <h2 className="mt-1 text-2xl font-bold text-foreground">
          {canDraw ? t("meetingChecklist") : t("dueOn", { date: formatDate(dueDate, locale) })}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{meetingDetail}</p>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">{t("haptaReceived")}</p>
            <p className="text-lg font-semibold">
              {paidCount} / {totalCount}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("collected")}</p>
            <p className="text-lg font-semibold">{formatRupees(collected)}</p>
          </div>
        </div>

        <ol className="mt-5 space-y-4">
          <li>
            <ChecklistTitle done={collectDone} title={t("stepCollect")} />
            <p className="mt-1 text-sm text-muted-foreground">
              {collectDone ? t("allPaid") : t("stillDue", { count: unpaid.length })}
            </p>
            {unpaid.length > 0 ? (
              <div className="mt-3 space-y-2">
                {unpaid.map((row) => (
                  <div
                    key={row.memberId}
                    className="flex flex-col gap-2 rounded-2xl bg-secondary/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold">{row.name}</p>
                      <p className="text-xs font-semibold text-muted-foreground">
                        {row.claimed ? t("claimed") : t("due")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => remind(row)}
                      >
                        {t("remindWhatsApp")}
                      </Button>
                      {isAdmin ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={busyId === row.contributionId}
                          onClick={() => markPaid(row)}
                        >
                          {busyId === row.contributionId
                            ? t("saving")
                            : row.claimed
                              ? t("claimedConfirm")
                              : t("markReceived")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </li>

          <li>
            <ChecklistTitle done={drawDone} title={t("stepDraw")} />
            {winnerName ? (
              <p className="mt-2 rounded-xl bg-accent/70 px-3 py-2 font-semibold">
                {t("receivedPool", { name: winnerName })}
              </p>
            ) : (
              <Button asChild className="mt-3 w-full" disabled={!canDraw}>
                <Link href={`/groups/${groupId}/draw`}>
                  {canDraw ? t("drawChitthi") : t("chitthi")}
                </Link>
              </Button>
            )}
          </li>

          <li>
            <ChecklistTitle done={handoverDone} title={t("stepHandover")} />
            {payoutPending && cycleId && isAdmin ? (
              <PayoutForm cycleId={cycleId} groupId={groupId} />
            ) : handoverDone ? (
              <p className="mt-2 text-sm font-semibold text-emerald-700">{t("handoverSaved")}</p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {drawDone ? t("markPoolHanded") : t("stepDraw")}
              </p>
            )}
          </li>
        </ol>
      </div>
    </Card>
  );
}

function ChecklistTitle({ done, title }: { done: boolean; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-full",
          done ? "bg-emerald-600 text-white" : "bg-secondary text-muted-foreground",
        )}
      >
        {done ? <Check className="size-4" /> : <CircleDashed className="size-4" />}
      </span>
      <p className="font-semibold">{title}</p>
    </div>
  );
}
