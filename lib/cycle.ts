import { daysUntil, isDueOrPast } from "@/lib/dates";
import { formatIstDateTime } from "@/lib/ist";
import type { Cycle, CycleFrequency, GroupMember, GroupType, Payout } from "@/lib/types";

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
  groupType: GroupType = "lucky_draw",
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

  if (groupType === "bidding") {
    const now = Date.now();
    const opens = cycle.bid_opens_at ? new Date(cycle.bid_opens_at).getTime() : null;
    const closes = cycle.bid_closes_at ? new Date(cycle.bid_closes_at).getTime() : null;

    if (drawn) {
      return {
        cycle,
        drawn: true,
        canDraw: false,
        daysUntilDraw: wait,
        label: `${unit} ${cycle.cycle_number} lilav locked`,
        detail: "Winner takes the pool minus their bid. Every other hand shares that bid equally.",
      };
    }

    if (opens && closes && now >= opens && now <= closes) {
      return {
        cycle,
        drawn: false,
        canDraw: true,
        daysUntilDraw: 0,
        label: "Lilav is open now",
        detail: `Closes ${formatIstDateTime(cycle.bid_closes_at)}. Lowest bid wins.`,
      };
    }

    if (opens && now < opens) {
      return {
        cycle,
        drawn: false,
        canDraw: true,
        daysUntilDraw: wait,
        label: `Lilav opens ${formatIstDateTime(cycle.bid_opens_at)}`,
        detail: "Times are Indian Standard Time (IST). Collect hapta, then bid.",
      };
    }

    if (closes && now > closes) {
      return {
        cycle,
        drawn: false,
        canDraw: true,
        daysUntilDraw: 0,
        label: "Lilav window closed",
        detail: "The organiser can lock the lowest bid. Winner and bonus for others then show to everyone.",
      };
    }

    return {
      cycle,
      drawn: false,
      canDraw: true,
      daysUntilDraw: wait,
      label: due ? `Hapta due · ${unit} ${cycle.cycle_number}` : wait === 1 ? "Hapta due tomorrow" : `Hapta due in ${wait} days`,
      detail: "Organiser sets lilav open and close in IST. There is no chitthi in a bidding Bhishi.",
    };
  }

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
