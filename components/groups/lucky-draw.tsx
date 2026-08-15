"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { runLuckyDrawAction } from "@/app/actions/draw";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { GroupMember } from "@/lib/types";

export function LuckyDraw({
  cycleId,
  groupId,
  eligible,
  alreadyWon,
}: {
  cycleId: string;
  groupId: string;
  eligible: GroupMember[];
  alreadyWon: string[];
}) {
  const [spinning, setSpinning] = useState(false);
  const [displayName, setDisplayName] = useState(eligible[0]?.display_name ?? "—");
  const [winner, setWinner] = useState<string | null>(null);

  const names = useMemo(() => eligible.map((member) => member.display_name), [eligible]);

  async function spin() {
    if (eligible.length === 0) {
      toast.error("No eligible members left.");
      return;
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
        toast.error(result.error ?? "Could not lock a winner");
        return;
      }
      setDisplayName(result.result.winner_name);
      setWinner(result.result.winner_name);
    }, 1600);
  }

  return (
    <div className="space-y-4">
      <Card className="flex min-h-48 flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#fbe8b0,transparent_60%)] p-6 text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          {spinning ? "Picking a winner…" : winner ? "Winner locked" : "Ready to draw"}
        </p>
        <p className="mt-3 text-4xl font-bold tracking-tight">{displayName}</p>
      </Card>
      <Button className="w-full" size="lg" onClick={spin} disabled={spinning || eligible.length === 0}>
        {spinning ? "Spinning…" : "Spin the lucky draw"}
      </Button>
      <div className="text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Still eligible</p>
        <p>{eligible.map((member) => member.display_name).join(", ") || "None"}</p>
        {alreadyWon.length > 0 ? (
          <>
            <p className="mt-3 font-semibold text-foreground">Already received the pool</p>
            <p>{alreadyWon.join(", ")}</p>
          </>
        ) : null}
      </div>
    </div>
  );
}
