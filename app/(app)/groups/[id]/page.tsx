import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Settings, UserPlus } from "lucide-react";
import { InviteButton } from "@/components/groups/invite-button";
import { PayoutForm } from "@/components/groups/payout-form";
import { ReminderButton } from "@/components/groups/reminder-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate, formatRupees, groupTypeHindi, groupTypeLabel } from "@/lib/format";
import { getGroupBundle } from "@/lib/group-data";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getGroupBundle(id);
  if (!bundle) notFound();

  const { group, members, cycles, contributions, payouts, isAdmin, profile } = bundle;
  const current =
    cycles.find((cycle) => cycle.status === "open") ??
    cycles.find((cycle) => cycle.status === "drawn" || cycle.status === "paid_out") ??
    cycles[0];
  const currentContributions = contributions.filter((row) => row.cycle_id === current?.id);
  const paidCount = currentContributions.filter((row) => row.status === "paid").length;
  const collected = currentContributions.reduce((sum, row) => sum + Number(row.amount_paid), 0);
  const expected = currentContributions.reduce((sum, row) => sum + Number(row.amount_due), 0);
  const unpaidMembers = members.filter((member) =>
    currentContributions.some((row) => row.member_id === member.id && row.status !== "paid"),
  );
  const currentPayout = payouts.find((row) => row.cycle_id === current?.id);
  const winner = members.find((member) => member.id === currentPayout?.winner_member_id);
  const canStartRound = members.length >= 2;

  return (
    <div className="px-5 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/groups" className="inline-flex items-center gap-2 text-sm font-semibold">
          <ArrowLeft className="size-4" /> Groups
        </Link>
        <Link href={`/groups/${id}/settings`} aria-label="Settings">
          <Settings className="size-5" />
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{group.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {groupTypeLabel(group.type)} · {groupTypeHindi(group.type)}
          </p>
        </div>
        <Badge>{group.status}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Members</p>
          <p className="font-bold">{members.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Each cycle</p>
          <p className="font-bold">{formatRupees(group.contribution_amount)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Pool</p>
          <p className="font-bold">{formatRupees(current?.pool_amount ?? 0)}</p>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Button asChild variant="secondary" size="icon" aria-label="Add member">
          <Link href={`/groups/${id}/members`}>
            <UserPlus />
          </Link>
        </Button>
        <ReminderButton
          unpaid={unpaidMembers.map((member) => ({ name: member.display_name, phone: member.phone }))}
          groupName={group.name}
          amount={group.contribution_amount}
          dueDate={current?.due_date ?? group.start_date}
          upiId={profile?.upi_id}
        />
        <InviteButton
          groupId={group.id}
          groupName={group.name}
          amount={group.contribution_amount}
          type={group.type}
        />
      </div>
      <div className="mt-2 grid grid-cols-3 text-center text-xs font-semibold text-muted-foreground">
        <p>Add member</p>
        <p>Reminder</p>
        <p>Invite</p>
      </div>

      {!canStartRound ? (
        <Card className="mt-6 p-5">
          <h2 className="text-xl font-semibold">Add members first</h2>
          <p className="mt-2 text-muted-foreground">
            Add at least 1 more member before starting a round. You are already in the group as the organiser.
          </p>
          <Button asChild className="mt-4 w-full">
            <Link href={`/groups/${id}/members`}>Add a member</Link>
          </Button>
        </Card>
      ) : (
        <Card className="mt-6 p-5">
          <p className="text-sm font-semibold text-primary">
            Round {current?.cycle_number ?? 1}
          </p>
          <h2 className="text-xl font-semibold">Due {formatDate(current?.due_date)}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Paid</p>
              <p className="font-semibold">
                {paidCount} / {currentContributions.length || members.length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Collected</p>
              <p className="font-semibold">
                {formatRupees(collected)} / {formatRupees(expected)}
              </p>
            </div>
          </div>
          {winner ? (
            <p className="mt-4 font-semibold">{winner.display_name} won this round.</p>
          ) : null}
          {currentPayout && currentPayout.status === "pending" && isAdmin ? (
            <PayoutForm cycleId={currentPayout.cycle_id} groupId={group.id} />
          ) : null}
        </Card>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button asChild variant="outline">
          <Link href={`/groups/${id}/grid`}>Payment grid</Link>
        </Button>
        {group.type === "lucky_draw" ? (
          <Button asChild>
            <Link href={`/groups/${id}/draw`}>Lucky draw</Link>
          </Button>
        ) : (
          <Button asChild variant="secondary">
            <Link href={`/groups/${id}/draw`}>Bidding soon</Link>
          </Button>
        )}
        <Button asChild variant="outline" className="col-span-2">
          <Link href={`/groups/${id}/reports`}>Reports</Link>
        </Button>
      </div>
    </div>
  );
}
