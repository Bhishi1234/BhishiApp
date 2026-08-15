"use client";

import { useState } from "react";
import { acceptInviteAction } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";

export function AcceptInviteButton({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function join() {
    setPending(true);
    setError(null);
    const result = await acceptInviteAction(token);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button className="w-full" disabled={pending} onClick={join}>
        {pending ? "Joining…" : "Join this group"}
      </Button>
    </div>
  );
}
