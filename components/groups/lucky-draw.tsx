"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { runLuckyDrawAction } from "@/app/actions/draw";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useT } from "@/components/i18n/locale-provider";
import type { GroupMember } from "@/lib/types";

export function LuckyDraw({
  cycleId,
  groupId,
  cycleNumber,
  eligible,
  alreadyWon,
  unpaidNames,
}: {
  cycleId: string;
  groupId: string;
  cycleNumber: number;
  eligible: GroupMember[];
  alreadyWon: string[];
  unpaidNames: string[];
}) {
  const { t } = useT();
  const [spinning, setSpinning] = useState(false);
  const [displayName, setDisplayName] = useState(eligible[0]?.display_name ?? "—");
  const [winner, setWinner] = useState<string | null>(null);

  const names = useMemo(() => eligible.map((member) => member.display_name), [eligible]);
  const unpaidLabel = unpaidNames.join(", ");

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
    }, 1600);
  }

  return (
    <div className="space-y-4">
      <Card className="flex min-h-52 flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#dbeafe,transparent_62%)] p-6 text-center">
        <p className="text-sm font-semibold text-primary">{t("monthN", { n: cycleNumber })}</p>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          {spinning ? t("drawing") : winner ? t("winnerLocked") : t("drawReady")}
        </p>
        <p className="mt-3 text-4xl font-bold tracking-tight">{displayName}</p>
      </Card>

      <div className="rounded-3xl border-2 border-dashed border-primary/30 bg-[#eff6ff] p-4">
        <p className="text-sm font-semibold text-primary">
          {t("inTheBox")} · {eligible.length}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {eligible.map((member) => (
            <span
              key={member.id}
              className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-[0_4px_12px_rgba(37,99,235,0.08)]"
            >
              {member.display_name}
            </span>
          ))}
        </div>
      </div>

      {alreadyWon.length > 0 ? (
        <div>
          <p className="text-sm font-semibold">{t("alreadyReceived")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {alreadyWon.map((name) => (
              <span
                key={name}
                className="rounded-full bg-secondary px-3 py-1.5 text-sm text-muted-foreground"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {unpaidNames.length > 0 && !winner ? (
        <p className="rounded-2xl bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900">
          {t("drawUnpaidWarn", { names: unpaidLabel })}
        </p>
      ) : null}

      {winner ? (
        <p className="text-center text-sm font-semibold text-primary">{t("lockedUntilNext")}</p>
      ) : (
        <Button className="w-full" size="lg" onClick={spin} disabled={spinning || eligible.length === 0}>
          {spinning ? t("drawing") : t("drawChitthi")}
        </Button>
      )}
      <p className="text-center text-xs text-muted-foreground">{t("oneDraw")}</p>
    </div>
  );
}
