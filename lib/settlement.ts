import type { Contribution, Cycle, GroupMember, Payout } from "@/lib/types";

export function settlementForSeat(input: {
  member: GroupMember;
  cycles: Cycle[];
  contributions: Contribution[];
  payouts: Payout[];
  hapta: number;
  plannedHands: number;
}) {
  const rows = input.contributions.filter((row) => row.member_id === input.member.id);
  const paidIn = rows.reduce((sum, row) => sum + Number(row.amount_paid), 0);
  const monthsPaid = rows.filter((row) => row.status === "paid").length;
  const received = input.payouts.find((row) => row.winner_member_id === input.member.id);
  const completed = input.payouts.length;
  const remainingMonths = Math.max(input.plannedHands - completed, 0);
  const remainingHapta = remainingMonths * input.hapta;
  const won = Boolean(received);
  const poolReceived = won
    ? Number(
        input.cycles.find((cycle) => cycle.id === received?.cycle_id)?.pool_amount ??
          input.hapta * input.plannedHands,
      )
    : 0;

  return {
    paidIn,
    monthsPaid,
    monthsTotal: input.cycles.length,
    completedDraws: completed,
    remainingMonths,
    remainingHapta,
    won,
    poolReceived,
    refundIfLeave: won ? 0 : paidIn,
    stillOwesIfLeave: won ? remainingHapta : 0,
    netToDate: poolReceived - paidIn,
  };
}

export function settlementForPerson(seats: ReturnType<typeof settlementForSeat>[]) {
  return seats.reduce(
    (sum, seat) => ({
      paidIn: sum.paidIn + seat.paidIn,
      poolReceived: sum.poolReceived + seat.poolReceived,
      refundIfLeave: sum.refundIfLeave + seat.refundIfLeave,
      stillOwesIfLeave: sum.stillOwesIfLeave + seat.stillOwesIfLeave,
      netToDate: sum.netToDate + seat.netToDate,
    }),
    { paidIn: 0, poolReceived: 0, refundIfLeave: 0, stillOwesIfLeave: 0, netToDate: 0 },
  );
}
