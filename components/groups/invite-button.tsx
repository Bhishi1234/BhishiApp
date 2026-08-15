"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { createInviteAction } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { formatRupees, groupTypeLabel } from "@/lib/format";
import { inviteMessage, whatsappShareUrl } from "@/lib/whatsapp";

export function InviteButton({
  groupId,
  groupName,
  amount,
  type,
}: {
  groupId: string;
  groupName: string;
  amount: number | string;
  type: string;
}) {
  const [pending, setPending] = useState(false);

  async function invite() {
    setPending(true);
    const result = await createInviteAction(groupId);
    setPending(false);
    if (result.error || !result.token) {
      toast.error(result.error ?? "Could not create invite");
      return;
    }
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const link = `${site}/invite/${result.token}`;
    const message = inviteMessage({
      groupName,
      amount: formatRupees(amount),
      typeLabel: groupTypeLabel(type),
      link,
    });
    window.open(whatsappShareUrl(message), "_blank");
  }

  return (
    <Button variant="secondary" size="icon" onClick={invite} disabled={pending} aria-label="Invite">
      <Share2 />
    </Button>
  );
}
