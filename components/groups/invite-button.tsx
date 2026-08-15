"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { createInviteAction } from "@/app/actions/groups";
import { useT } from "@/components/i18n/locale-provider";
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
  const { t } = useT();
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
    <button
      type="button"
      onClick={invite}
      disabled={pending}
      className="flex min-h-[4.5rem] w-full flex-col items-center justify-center gap-1.5 rounded-2xl bg-secondary/80 px-2 text-center text-sm font-semibold disabled:opacity-60"
    >
      <Share2 className="size-5" />
      {pending ? t("saving") : t("invite")}
    </button>
  );
}
