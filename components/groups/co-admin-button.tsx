"use client";

import { useState } from "react";
import { toast } from "sonner";
import { setCoAdminAction } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/locale-provider";

export function CoAdminButton({
  memberId,
  groupId,
  enabled,
}: {
  memberId: string;
  groupId: string;
  enabled: boolean;
}) {
  const { t } = useT();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const result = await setCoAdminAction({ memberId, groupId, enabled: !enabled });
    setPending(false);
    if (result.error) toast.error(result.error);
    else toast.success(t("coAdminToast"));
  }

  return (
    <Button type="button" variant="outline" className="mt-3 w-full" disabled={pending} onClick={toggle}>
      {pending ? t("saving") : enabled ? t("removeCoAdmin") : t("makeCoAdmin")}
    </Button>
  );
}
