"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { closeBiddingAction, setBidWindowAction, upsertBidAction } from "@/app/actions/draw";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useT } from "@/components/i18n/locale-provider";
import { formatDateTime, formatRupees, seatName, toDateTimeLocal } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Bid, Cycle, GroupMember, Payout } from "@/lib/types";

export function BiddingBoard({
  cycle,
  groupId,
  poolAmount,
  members,
  mySeats,
  bids: initialBids,
  payout,
  isAdmin,
  wonMemberIds,
}: {
  cycle: Cycle;
  groupId: string;
  poolAmount: number | string;
  members: GroupMember[];
  mySeats: GroupMember[];
  bids: Bid[];
  payout?: Payout;
  isAdmin: boolean;
  wonMemberIds: string[];
}) {
  const { t, locale } = useT();
  const router = useRouter();
  const [bids, setBids] = useState(initialBids);
  const [opensAt, setOpensAt] = useState(toDateTimeLocal(cycle.bid_opens_at) || defaultOpen());
  const [closesAt, setClosesAt] = useState(toDateTimeLocal(cycle.bid_closes_at) || defaultClose());
  const [discount, setDiscount] = useState("");
  const [seatId, setSeatId] = useState(mySeats[0]?.id ?? "");
  const [pending, setPending] = useState(false);

  const now = Date.now();
  const openMs = cycle.bid_opens_at ? new Date(cycle.bid_opens_at).getTime() : null;
  const closeMs = cycle.bid_closes_at ? new Date(cycle.bid_closes_at).getTime() : null;
  const isOpen = Boolean(openMs && closeMs && now >= openMs && now <= closeMs && !payout);
  const windowClosed = Boolean(closeMs && now > closeMs && !payout);
  const lowest = useMemo(
    () => [...bids].sort((a, b) => Number(a.discount_amount) - Number(b.discount_amount))[0],
    [bids],
  );
  const eligibleSeats = mySeats.filter((seat) => !wonMemberIds.includes(seat.id));

  useEffect(() => {
    setBids(initialBids);
  }, [initialBids]);

  useEffect(() => {
    if (payout) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`bids-${cycle.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bids", filter: `cycle_id=eq.${cycle.id}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [cycle.id, payout, router]);

  async function saveWindow() {
    setPending(true);
    const result = await setBidWindowAction({
      cycleId: cycle.id,
      groupId,
      opensAt,
      closesAt,
    });
    setPending(false);
    if (result.error) toast.error(result.error);
    else toast.success(t("windowSet"));
  }

  async function saveBid() {
    const amount = Number(discount);
    if (!(amount >= 0)) {
      toast.error(t("bidError"));
      return;
    }
    setPending(true);
    const result = await upsertBidAction(cycle.id, groupId, amount, seatId || undefined);
    setPending(false);
    if (result.error) toast.error(result.error);
    else toast.success(t("bidSaved"));
  }

  async function lockBid() {
    setPending(true);
    const result = await closeBiddingAction(cycle.id, groupId);
    setPending(false);
    if (result.error) toast.error(result.error);
    else toast.success(t("bidClosed"));
  }

  if (payout) {
    const winner = members.find((member) => member.id === payout.winner_member_id);
    const discountWon = Number(payout.bid_discount ?? 0);
    const bonus = Number(payout.bonus_per_member ?? 0);
    const takes = Number(poolAmount) - discountWon;
    return (
      <div className="space-y-4">
        <Card className="p-5 text-center">
          <p className="text-sm font-semibold text-primary">{t("bidLocked")}</p>
          <p className="mt-2 text-4xl font-bold">{winner ? seatName(winner) : "—"}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {t("bidDiscount", { amount: formatRupees(discountWon) })}
          </p>
          <p className="mt-1 font-semibold">{t("winnerTakes", { amount: formatRupees(takes) })}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("bonusEach", { amount: formatRupees(bonus) })}
          </p>
        </Card>
        <BidList bids={bids} members={members} lowestId={lowest?.id} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin ? (
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold">{t("bidWindow")}</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="bid-open">{t("bidOpens")}</Label>
              <Input id="bid-open" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bid-close">{t("bidCloses")}</Label>
              <Input id="bid-close" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
            </div>
            <Button className="w-full" disabled={pending} onClick={saveWindow}>
              {pending ? t("saving") : t("setWindow")}
            </Button>
          </div>
        </Card>
      ) : null}

      {cycle.bid_opens_at && cycle.bid_closes_at ? (
        <Card className="p-4">
          <p className="text-sm font-semibold text-primary">
            {isOpen ? t("openBidding") : windowClosed ? t("windowClosed") : t("bidNotOpen")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDateTime(cycle.bid_opens_at, locale)} → {formatDateTime(cycle.bid_closes_at, locale)}
          </p>
        </Card>
      ) : (
        <Card className="p-4 text-sm text-muted-foreground">{t("waitingWindow")}</Card>
      )}

      <Card className="p-5 text-center">
        <p className="text-sm font-semibold text-muted-foreground">{t("currentLowest")}</p>
        <p className="mt-1 text-4xl font-bold">
          {lowest ? formatRupees(lowest.discount_amount) : "—"}
        </p>
        {lowest ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {seatName(members.find((member) => member.id === lowest.member_id) ?? { display_name: "—" })}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">{t("noBidsYet")}</p>
        )}
      </Card>

      {isOpen && eligibleSeats.length > 0 ? (
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold">{t("placeBid")}</p>
          {eligibleSeats.length > 1 ? (
            <div className="mb-3 space-y-1.5">
              <Label htmlFor="bid-seat">{t("bidForHand")}</Label>
              <Select id="bid-seat" value={seatId} onChange={(e) => setSeatId(e.target.value)}>
                {eligibleSeats.map((seat) => (
                  <option key={seat.id} value={seat.id}>
                    {seatName(seat)}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="bid-amount">{t("yourBid")}</Label>
            <div className="relative">
              <span className="absolute top-1/2 left-4 -translate-y-1/2 font-semibold">₹</span>
              <Input
                id="bid-amount"
                inputMode="decimal"
                className="pl-8"
                value={discount}
                onChange={(e) => setDiscount(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="500"
              />
            </div>
          </div>
          <Button className="mt-3 w-full" disabled={pending} onClick={saveBid}>
            {pending ? t("saving") : t("placeBid")}
          </Button>
        </Card>
      ) : null}

      <BidList bids={bids} members={members} lowestId={lowest?.id} />

      {isAdmin && windowClosed ? (
        <Button className="w-full" size="lg" disabled={pending || bids.length === 0} onClick={lockBid}>
          {pending ? t("saving") : t("closeBidding")}
        </Button>
      ) : null}
    </div>
  );
}

function BidList({
  bids,
  members,
  lowestId,
}: {
  bids: Bid[];
  members: GroupMember[];
  lowestId?: string;
}) {
  const { t } = useT();
  const ranked = [...bids].sort((a, b) => Number(a.discount_amount) - Number(b.discount_amount));
  return (
    <Card className="p-5">
      <p className="mb-3 text-sm font-semibold">{t("allBids")}</p>
      {ranked.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noBidsYet")}</p>
      ) : (
        <div className="space-y-2">
          {ranked.map((bid) => {
            const member = members.find((row) => row.id === bid.member_id);
            return (
              <div
                key={bid.id}
                className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                  bid.id === lowestId ? "bg-accent" : "bg-muted"
                }`}
              >
                <p className="font-semibold">{member ? seatName(member) : "—"}</p>
                <p className="font-bold">{formatRupees(bid.discount_amount)}</p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function defaultOpen() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function defaultClose() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
