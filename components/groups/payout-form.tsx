"use client";

import { useState } from "react";
import { toast } from "sonner";
import { markPayoutSentAction } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PayoutForm({ cycleId, groupId }: { cycleId: string; groupId: string }) {
  const [ref, setRef] = useState("");
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    const result = await markPayoutSentAction(cycleId, groupId, ref);
    setPending(false);
    if (result.error) toast.error(result.error);
    else toast.success("Payout marked as sent");
  }

  return (
    <div className="mt-3 space-y-2">
      <Input
        value={ref}
        onChange={(event) => setRef(event.target.value)}
        placeholder="UPI reference (optional)"
      />
      <Button variant="outline" className="w-full" disabled={pending} onClick={save}>
        {pending ? "Saving…" : "Mark pool as handed over"}
      </Button>
    </div>
  );
}
