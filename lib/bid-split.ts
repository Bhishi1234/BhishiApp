import type { Payout } from "@/lib/types";

export function bidSplit(payout: Payout, poolAmount: number | string) {
  const pool = Number(poolAmount ?? 0);
  const discount = Number(payout.bid_discount ?? 0);
  const eligible = payout.eligible_member_ids?.length ?? 0;
  const otherHands = Math.max(eligible - 1, 0);
  const bonus =
    payout.bonus_per_member != null
      ? Number(payout.bonus_per_member)
      : otherHands > 0
        ? Math.round((discount / otherHands) * 100) / 100
        : 0;
  return {
    pool,
    discount,
    winnerTakes: pool - discount,
    bonus,
    otherHands,
  };
}
