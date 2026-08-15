"use client";

import { useState } from "react";
import { toast } from "sonner";
import { claimPhoneInviteAction } from "@/app/actions/members";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRupees, groupTypeHindi, groupTypeLabel } from "@/lib/format";
import type { PhoneInvite } from "@/lib/types";

export function PhoneInviteCard({ invite }: { invite: PhoneInvite }) {
  const [pending, setPending] = useState(false);

  async function join() {
    setPending(true);
    const result = await claimPhoneInviteAction(invite.member_id);
    if (result?.error) {
      toast.error(result.error);
      setPending(false);
    }
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="bg-accent px-4 py-3">
        <p className="text-xs font-semibold tracking-wide text-accent-foreground uppercase">
          You are invited
        </p>
        <h2 className="mt-1 text-lg font-bold">{invite.group_name}</h2>
        <p className="text-sm text-accent-foreground/80">
          {groupTypeLabel(invite.group_type)} · {groupTypeHindi(invite.group_type)}
        </p>
      </div>
      <div className="p-4">
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          {invite.organiser_name} added you as {invite.invited_as_name}. Join to see hapta
          and the monthly chitthi. Money still stays outside the app.
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <Badge>{formatRupees(invite.contribution_amount)} hapta</Badge>
          <Button size="sm" onClick={join} disabled={pending}>
            {pending ? "Joining…" : "Join group"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
