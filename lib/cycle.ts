import { daysUntil, isDueOrPast } from "@/lib/dates";
import type { Cycle, CycleFrequency, GroupMember, Payout } from "@/lib/types";

export type MeetingState = {
  cycle: Cycle | null;
  drawn: boolean;
  canDraw: boolean;
  daysUntilDraw: number;
  label: string;
  detail: string;
};

export function getMeetingState(
  cycles: Cycle[],
  payouts: Payout[],
  frequency: CycleFrequency = "monthly",
): MeetingState {
  const drawnIds = new Set(payouts.map((row) => row.cycle_id));
  const undrawn = cycles.filter((cycle) => !drawnIds.has(cycle.id));
  const dueNow = undrawn.filter((cycle) => isDueOrPast(cycle.due_date));
  const cycle = dueNow[0] ?? undrawn[0] ?? cycles[cycles.length - 1] ?? null;
  const unit = frequency === "weekly" ? "Week" : "Month";
  const period = frequency === "weekly" ? "week" : "month";

  if (!cycle) {
    return {
      cycle: null,
      drawn: false,
      canDraw: false,
      daysUntilDraw: 0,
      label: "No meetings yet",
      detail: "Create the group again if rounds are missing.",
    };
  }

  if (undrawn.length === 0) {
    return {
      cycle,
      drawn: true,
      canDraw: false,
      daysUntilDraw: 0,
      label: "Bhishi complete",
      detail: "Every member has received the pool once.",
    };
  }

  const drawn = drawnIds.has(cycle.id);
  const due = isDueOrPast(cycle.due_date);
  const wait = Math.max(0, daysUntil(cycle.due_date));

  if (drawn) {
    return {
      cycle,
      drawn: true,
      canDraw: false,
      daysUntilDraw: wait,
      label: `${unit} ${cycle.cycle_number} winner is locked`,
      detail: `Next chitthi opens on the next due date. One draw each ${period}.`,
    };
  }

  if (due) {
    return {
      cycle,
      drawn: false,
      canDraw: true,
      daysUntilDraw: 0,
      label: `Meeting day · ${unit} ${cycle.cycle_number}`,
      detail: `Collect this ${period}'s hapta, then draw the chitthi once.`,
    };
  }

  return {
    cycle,
    drawn: false,
    canDraw: false,
    daysUntilDraw: wait,
    label: wait === 1 ? "Draw opens tomorrow" : `Draw opens in ${wait} days`,
    detail: `Chitthi is drawn once each ${period}, one ${period} after the group start date.`,
  };
}

export function winnersTimeline(
  cycles: Cycle[],
  payouts: Payout[],
  members: GroupMember[],
) {
  return cycles
    .map((cycle) => {
      const payout = payouts.find((row) => row.cycle_id === cycle.id);
      const winner = members.find((member) => member.id === payout?.winner_member_id);
      return { cycle, payout, winner };
    })
    .filter((row) => row.payout);
}
