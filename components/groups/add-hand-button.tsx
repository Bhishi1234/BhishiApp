"use client";

import { useState } from "react";
import { toast } from "sonner";
import { addMemberHandAction } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/locale-provider";

export function AddHandButton({ memberId, groupId }: { memberId: string; groupId: string }) {
  const { t } = useT();
  const [pending, setPending] = useState(false);

  async function addHand() {
    setPending(true);
    const result = await addMemberHandAction(memberId, groupId);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t("handAdded"));
  }

  return (
    <Button type="button" variant="secondary" className="mt-3 w-full" disabled={pending} onClick={addHand}>
      {pending ? t("saving") : t("addHand")}
    </Button>
  );
}
