import type { Contribution, ContributionStatus, GroupMember } from "@/lib/types";

export function personKey(member: {
  id: string;
  user_id?: string | null;
  phone?: string | null;
}) {
  return member.user_id || member.phone || member.id;
}

export function groupByPerson<T extends Pick<GroupMember, "id" | "display_name"> & {
  user_id?: string | null;
  phone?: string | null;
  hand_number?: number | null;
  role?: GroupMember["role"];
}>(members: T[]) {
  const map = new Map<string, T[]>();
  for (const member of members) {
    const key = personKey(member);
    const list = map.get(key) ?? [];
    list.push(member);
    map.set(key, list);
  }
  return [...map.values()].map((seats) => {
    const sorted = [...seats].sort((a, b) => (a.hand_number ?? 1) - (b.hand_number ?? 1));
    return {
      key: personKey(sorted[0]),
      display_name: sorted[0].display_name,
      phone: sorted[0].phone ?? null,
      user_id: sorted[0].user_id ?? null,
      seats: sorted,
      handCount: sorted.length,
      primary: sorted[0],
    };
  });
}

export function combineCycleContributions(rows: Contribution[]): Contribution | null {
  if (rows.length === 0) return null;
  if (rows.length === 1) return rows[0];

  const allPaid = rows.every((row) => row.status === "paid");
  const allUnpaid = rows.every((row) => row.status === "unpaid");
  const amount_due = allPaid
    ? rows.reduce((sum, row) => sum + Number(row.amount_due), 0)
    : rows.reduce(
        (sum, row) => sum + Math.max(Number(row.amount_due) - Number(row.amount_paid), 0),
        0,
      );
  const amount_paid = rows.reduce((sum, row) => sum + Number(row.amount_paid), 0);
  let status: ContributionStatus = "unpaid";
  if (allPaid) status = "paid";
  else if (!allUnpaid) status = "partial";

  const unpaidRows = rows.filter((row) => row.status !== "paid");
  const allUnpaidClaimed =
    unpaidRows.length > 0 && unpaidRows.every((row) => Boolean(row.member_claimed_at));

  return {
    ...rows[0],
    amount_due,
    amount_paid,
    status,
    member_claimed_at: allUnpaidClaimed ? unpaidRows[0]?.member_claimed_at ?? null : null,
    payment_mode: rows.find((row) => row.payment_mode)?.payment_mode ?? null,
  };
}
