"use client";

import { useState } from "react";
import { toast } from "sonner";
import { decideHandRequestAction } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useT } from "@/components/i18n/locale-provider";
import type { GroupMember, HandRequest } from "@/lib/types";

export function HandRequestList({
  requests,
  members,
  groupId,
}: {
  requests: HandRequest[];
  members: GroupMember[];
  groupId: string;
}) {
  const { t } = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const pending = requests.filter((row) => row.status === "pending");
  if (pending.length === 0) return null;

  async function decide(id: string, approve: boolean) {
    setBusy(id);
    const result = await decideHandRequestAction({ requestId: id, groupId, approve });
    setBusy(null);
    if (result.error) toast.error(result.error);
    else toast.success(approve ? t("handsApproved") : t("declineHands"));
  }

  return (
    <Card className="mb-4 p-5">
      <p className="mb-3 text-sm font-semibold">{t("pendingHandRequests")}</p>
      <div className="space-y-3">
        {pending.map((row) => {
          const member = members.find((item) => item.id === row.member_id);
          return (
            <div key={row.id} className="rounded-2xl bg-secondary/70 p-3">
              <p className="font-semibold">
                {t("handRequestLine", {
                  name: member?.display_name ?? "Member",
                  want: row.requested_hands,
                  have: row.current_hands,
                })}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button size="sm" disabled={busy === row.id} onClick={() => decide(row.id, true)}>
                  {t("approveHands")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === row.id}
                  onClick={() => decide(row.id, false)}
                >
                  {t("declineHands")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
