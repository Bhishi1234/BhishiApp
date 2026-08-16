"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { runLuckyDrawAction } from "@/app/actions/draw";
import { ChitthiBox } from "@/components/groups/chitthi-box";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useT } from "@/components/i18n/locale-provider";
import { createClient } from "@/lib/supabase/client";
import { seatName } from "@/lib/format";
import type { GroupMember } from "@/lib/types";

export function LuckyDraw({
  cycleId,
  groupId,
  cycleNumber,
  eligible,
  alreadyWon,
  unpaidNames,
  canDraw,
}: {
  cycleId: string;
  groupId: string;
  cycleNumber: number;
  eligible: GroupMember[];
  alreadyWon: string[];
  unpaidNames: string[];
  canDraw: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);
  const [displayName, setDisplayName] = useState(eligible[0]?.display_name ?? "—");
  const [winner, setWinner] = useState<string | null>(null);

  const names = useMemo(() => eligible.map((member) => seatName(member)), [eligible]);
  const unpaidLabel = unpaidNames.join(", ");

  useEffect(() => {
    if (canDraw || winner) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`payouts-${cycleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "payouts",
          filter: `cycle_id=eq.${cycleId}`,
        },
        (payload) => {
          const winnerId = (payload.new as { winner_member_id?: string }).winner_member_id;
          const name =
            eligible.find((member) => member.id === winnerId)
              ? seatName(eligible.find((member) => member.id === winnerId)!)
              : names[0] ?? "—";
          setSpinning(true);
          const interval = window.setInterval(() => {
            const next = names[Math.floor(Math.random() * names.length)];
            if (next) setDisplayName(next);
          }, 90);
          window.setTimeout(() => {
            window.clearInterval(interval);
            setSpinning(false);
            setDisplayName(name);
            setWinner(name);
            router.refresh();
          }, 1600);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [canDraw, cycleId, eligible, names, router, winner]);

  async function spin() {
    if (eligible.length === 0) {
      toast.error(t("noEligible"));
      return;
    }
    if (unpaidNames.length > 0) {
      const ok = window.confirm(t("drawUnpaidConfirm", { names: unpaidLabel }));
      if (!ok) return;
    }
    setSpinning(true);
    setWinner(null);

    const resultPromise = runLuckyDrawAction(cycleId, groupId);
    const interval = window.setInterval(() => {
      const next = names[Math.floor(Math.random() * names.length)];
      if (next) setDisplayName(next);
    }, 90);

    const result = await resultPromise;
    window.setTimeout(() => {
      window.clearInterval(interval);
      setSpinning(false);
      if (result.error || !result.result) {
        toast.error(result.error ?? t("drawError"));
        return;
      }
      setDisplayName(result.result.winner_name);
      setWinner(result.result.winner_name);
      toast.success(t("waitingWinnerDecide", { name: result.result.winner_name }));
      router.refresh();
    }, 1600);
  }

  return (
    <div className="space-y-4">
      <Card className="flex min-h-52 flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#dbeafe,transparent_62%)] p-6 text-center">
        <p className="text-sm font-semibold text-primary">{t("monthN", { n: cycleNumber })}</p>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          {spinning
            ? t("drawing")
            : winner
              ? t("winnerLocked")
              : canDraw
                ? t("drawReady")
                : t("watchingDraw")}
        </p>
        <p className="mt-3 text-4xl font-bold tracking-tight">{displayName}</p>
        {!canDraw && !winner ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("watchingDrawBody")}</p>
        ) : null}
      </Card>

      <ChitthiBox title={t("inTheBox")} names={names} />
      <ChitthiBox title={t("alreadyReceived")} names={alreadyWon} muted />

      {unpaidNames.length > 0 && !winner ? (
        <p className="rounded-2xl bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900">
          {t("drawUnpaidWarn", { names: unpaidLabel })}
        </p>
      ) : null}

      {winner ? (
        <p className="text-center text-sm font-semibold text-primary">{t("lockedUntilNext")}</p>
      ) : canDraw ? (
        <Button className="w-full" size="lg" onClick={spin} disabled={spinning || eligible.length === 0}>
          {spinning ? t("drawing") : t("drawChitthi")}
        </Button>
      ) : null}
      <p className="text-center text-xs text-muted-foreground">{t("oneDraw")}</p>
    </div>
  );
}
