"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { claimHaptaAction, claimHaptaManyAction } from "@/app/actions/contributions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useT } from "@/components/i18n/locale-provider";
import { formatDate, formatRupees } from "@/lib/format";
import type { Contribution, PaymentMode } from "@/lib/types";
import { buildUpiPayUrl, haptaUpiNote } from "@/lib/upi";
import { cn } from "@/lib/utils";

const modes: { id: PaymentMode; key: "payUpi" | "cash" | "bank" }[] = [
  { id: "upi", key: "payUpi" },
  { id: "cash", key: "cash" },
  { id: "bank_transfer", key: "bank" },
];

export function HaptaPayCard({
  contributions,
  groupId,
  groupName,
  cycleNumber,
  dueDate,
  amount,
  handCount = 1,
  organiserName,
  organiserUpi,
  selfServe,
}: {
  contributions: Contribution[];
  groupId: string;
  groupName: string;
  cycleNumber: number;
  dueDate: string;
  amount: number | string;
  handCount?: number;
  organiserName: string;
  organiserUpi: string | null;
  selfServe: boolean;
}) {
  const { t, locale } = useT();
  const [mode, setMode] = useState<PaymentMode>(contributions[0]?.payment_mode ?? "upi");
  const [pending, setPending] = useState(false);

  const remaining = contributions.filter((row) => row.status !== "paid");
  const paid = remaining.length === 0;
  const claimed = remaining.length > 0 && remaining.every((row) => Boolean(row.member_claimed_at));
  const upiUrl = buildUpiPayUrl({
    pa: organiserUpi,
    pn: organiserName,
    amount,
    note: haptaUpiNote(groupName, cycleNumber),
  });

  async function claim() {
    setPending(true);
    const ids = remaining.map((row) => row.id);
    const result =
      ids.length === 1
        ? await claimHaptaAction({ contributionId: ids[0], groupId, paymentMode: mode })
        : await claimHaptaManyAction({ contributionIds: ids, groupId, paymentMode: mode });
    setPending(false);
    if (result.error) toast.error(result.error);
    else toast.success(t("claimedToast"));
  }

  async function copyUpi() {
    if (!organiserUpi) return;
    await navigator.clipboard.writeText(organiserUpi);
    toast.success(t("upiCopied"));
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="panel-hero px-5 py-4">
        <p className="text-sm font-semibold text-primary">{t("yourHapta")}</p>
        <h2 className="mt-1 text-xl font-bold">{groupName}</h2>
        {handCount > 1 ? (
          <p className="mt-1 text-sm font-semibold text-primary">{t("playingHands", { n: handCount })}</p>
        ) : null}
        {paid ? (
          <p className="mt-1 text-sm text-muted-foreground">{formatDate(dueDate, locale)}</p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            {handCount > 1
              ? `${t("dueForHands", {
                  amount: formatRupees(amount),
                  n: remaining.length || handCount,
                })} · ${formatDate(dueDate, locale)}`
              : t("haptaDueLine", {
                  amount: formatRupees(amount),
                  date: formatDate(dueDate, locale),
                })}
          </p>
        )}
      </div>
      <div className="space-y-3 p-5">
        {organiserUpi ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("organiserUpi", { name: organiserName, upi: organiserUpi })}
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">{t("noUpi")}</p>
        )}

        {paid ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
            {t("thisMonthPaid")}
          </p>
        ) : claimed ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            {t("iPaidPending")}
          </p>
        ) : (
          <>
            {selfServe ? (
              <div className="grid grid-cols-3 gap-2">
                {modes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={cn(
                      "h-10 rounded-xl text-xs font-semibold",
                      mode === item.id
                        ? "bg-primary text-white"
                        : "bg-secondary text-foreground",
                    )}
                  >
                    {item.id === "upi" ? "UPI" : t(item.key)}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              {upiUrl ? (
                <Button asChild className="w-full">
                  <a href={upiUrl}>{t("payUpi")}</a>
                </Button>
              ) : organiserUpi ? (
                <Button type="button" variant="outline" className="w-full" onClick={copyUpi}>
                  {t("copyUpi")}
                </Button>
              ) : (
                <Button type="button" variant="outline" className="w-full" disabled>
                  {t("payUpi")}
                </Button>
              )}
              {selfServe ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={pending}
                  onClick={claim}
                >
                  {pending ? t("saving") : t("iPaid")}
                </Button>
              ) : (
                <Button type="button" variant="secondary" className="w-full" disabled>
                  {t("iPaid")}
                </Button>
              )}
            </div>
          </>
        )}
        <Button asChild variant="ghost" className="w-full">
          <Link href={`/groups/${groupId}/me`}>{t("yourStatement")}</Link>
        </Button>
      </div>
    </Card>
  );
}
