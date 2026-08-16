"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  acceptPayoutAction,
  decidePayoutTransferAction,
  requestPayoutTransferAction,
} from "@/app/actions/draw";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useT } from "@/components/i18n/locale-provider";
import { seatName } from "@/lib/format";
import type { GroupMember, Payout } from "@/lib/types";

export function PayoutAcceptCard({
  payout,
  members,
  groupId,
  canAct,
  isAdmin,
}: {
  payout: Payout;
  members: GroupMember[];
  groupId: string;
  canAct: boolean;
  isAdmin: boolean;
}) {
  const { t } = useT();
  const [toMemberId, setToMemberId] = useState("");
  const [pending, setPending] = useState(false);

  const drawn = members.find((member) => member.id === (payout.drawn_member_id ?? payout.winner_member_id));
  const receiver = members.find((member) => member.id === payout.winner_member_id);
  const transferTo = members.find((member) => member.id === payout.transfer_to_member_id);
  const status = payout.acceptance_status ?? "accepted";
  const others = members.filter((member) => member.id !== drawn?.id);

  async function run(fn: () => Promise<{ error?: string }>, ok: string) {
    setPending(true);
    const result = await fn();
    setPending(false);
    if (result.error) toast.error(result.error);
    else toast.success(ok);
  }

  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-primary">{t("drawnWinner", { name: seatName(drawn ?? { display_name: "—" }) })}</p>
      {status === "accepted" || status === "transferred" ? (
        <p className="mt-2 text-lg font-semibold">{t("poolReceiver", { name: seatName(receiver ?? { display_name: "—" }) })}</p>
      ) : status === "transfer_requested" ? (
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          {t("transferPending")}
          {transferTo ? ` · ${seatName(transferTo)}` : ""}
        </p>
      ) : (
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{t("acceptHelp")}</p>
      )}

      {canAct && (status === "pending_accept" || status === "transfer_requested") ? (
        <div className="mt-4 space-y-3">
          <Button
            className="w-full"
            disabled={pending}
            onClick={() => run(() => acceptPayoutAction(payout.cycle_id, groupId), t("acceptedPool"))}
          >
            {t("acceptPool")}
          </Button>
          <Select value={toMemberId} onChange={(event) => setToMemberId(event.target.value)}>
            <option value="">{t("transferTo")}</option>
            {others.map((member) => (
              <option key={member.id} value={member.id}>
                {seatName(member)}
              </option>
            ))}
          </Select>
          <Button
            variant="outline"
            className="w-full"
            disabled={pending || !toMemberId}
            onClick={() =>
              run(
                () => requestPayoutTransferAction(payout.cycle_id, groupId, toMemberId),
                t("transferPending"),
              )
            }
          >
            {t("requestTransfer")}
          </Button>
        </div>
      ) : null}

      {isAdmin && status === "transfer_requested" ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            disabled={pending}
            onClick={() => run(() => decidePayoutTransferAction(payout.cycle_id, groupId, true), t("handoverSaved"))}
          >
            {t("approveTransfer")}
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => decidePayoutTransferAction(payout.cycle_id, groupId, false), t("declineTransfer"))}
          >
            {t("declineTransfer")}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
