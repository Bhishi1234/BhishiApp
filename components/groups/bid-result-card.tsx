"use client";

import { Card } from "@/components/ui/card";
import { useT } from "@/components/i18n/locale-provider";
import { bidSplit } from "@/lib/bid-split";
import { formatRupees } from "@/lib/format";
import type { Payout } from "@/lib/types";

export function BidResultCard({
  payout,
  poolAmount,
  winnerName,
}: {
  payout: Payout;
  poolAmount: number | string;
  winnerName: string;
}) {
  const { t } = useT();
  const split = bidSplit(payout, poolAmount);

  return (
    <Card className="overflow-hidden p-0">
      <div className="panel-hero px-5 py-5 text-center">
        <p className="text-sm font-semibold text-primary">{t("bidLocked")}</p>
        <p className="mt-2 text-3xl font-bold">{winnerName}</p>
        <p className="mt-3 text-lg font-semibold">{t("winnerGets", { amount: formatRupees(split.winnerTakes) })}</p>
      </div>
      <div className="space-y-3 p-5 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">{t("thisPool")}</span>
          <span className="font-semibold">{formatRupees(split.pool)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">{t("winningBid")}</span>
          <span className="font-semibold">− {formatRupees(split.discount)}</span>
        </div>
        <p className="rounded-xl bg-muted px-3 py-2 leading-relaxed">
          {t("bidMath", {
            pool: formatRupees(split.pool),
            bid: formatRupees(split.discount),
            takes: formatRupees(split.winnerTakes),
          })}
        </p>
        <p className="rounded-xl bg-accent/80 px-3 py-2 font-semibold leading-relaxed">
          {t("othersShare", {
            count: split.otherHands,
            amount: formatRupees(split.discount),
          })}
        </p>
        <p className="text-base font-bold">
          {t("eachOtherGets", { amount: formatRupees(split.bonus) })}
        </p>
      </div>
    </Card>
  );
}
