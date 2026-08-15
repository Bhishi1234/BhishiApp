import Link from "next/link";
import { notFound } from "next/navigation";
import { Settings, UserPlus } from "lucide-react";
import { HowBhishiWorks } from "@/components/groups/how-bhishi-works";
import { InviteButton } from "@/components/groups/invite-button";
import { PayoutForm } from "@/components/groups/payout-form";
import { ReminderButton } from "@/components/groups/reminder-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getMeetingState, winnersTimeline } from "@/lib/cycle";
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
  const meeting = getMeetingState(cycles, payouts, group.frequency);
  const current = meeting.cycle;
  const currentContributions = contributions.filter((row) => row.cycle_id === current?.id);
  const paidCount = currentContributions.filter((row) => row.status === "paid").length;
  const collected = currentContributions.reduce((sum, row) => sum + Number(row.amount_paid), 0);
  const unpaidMembers = members.filter((member) =>
    currentContributions.some((row) => row.member_id === member.id && row.status !== "paid"),
  );
  const currentPayout = payouts.find((row) => row.cycle_id === current?.id);
  const winner = members.find((member) => member.id === currentPayout?.winner_member_id);
  const canStartRound = members.length >= 2;
  const timeline = winnersTimeline(cycles, payouts, members);

  return (
    <div className="px-5 py-6">
      <PageHeader
        backHref="/groups"
        backLabel="Groups"
        title={group.name}
        subtitle={`${groupTypeLabel(group.type)} · ${groupTypeHindi(group.type)}`}
        action={
          <Link href={`/groups/${id}/settings`} className="flex size-11 items-center justify-center rounded-full bg-secondary" aria-label="Settings">
            <Settings className="size-5" />
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-2 text-center">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Members</p>
          <p className="font-bold">{members.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Monthly hapta</p>
          <p className="font-bold">{formatRupees(group.contribution_amount)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">This pool</p>
          <p className="font-bold">{formatRupees(current?.pool_amount ?? 0)}</p>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Link
          href={`/groups/${id}/members`}
          className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl bg-secondary/80 px-2 text-sm font-semibold"
        >
          <UserPlus className="size-5" />
          Members
        </Link>
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

      {!canStartRound ? (
        <Card className="mt-5 p-5">
          <h2 className="text-xl font-semibold">Add members first</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            A Bhishi needs at least two people. You are already in as the organiser.
            Add the rest, collect hapta, and draw only on the monthly due date.
          </p>
          <Button asChild className="mt-4 w-full">
            <Link href={`/groups/${id}/members`}>Add a member</Link>
          </Button>
        </Card>
      ) : (
        <Card className="mt-5 overflow-hidden p-0">
          <div className="bg-primary px-5 py-4 text-primary-foreground">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                Month {current?.cycle_number ?? 1} of {group.planned_member_count}
              </p>
              <Badge className="bg-white/15 text-primary-foreground">{meeting.label}</Badge>
            </div>
            <h2 className="mt-1 text-2xl font-bold">
              {meeting.canDraw ? "Meeting day" : `Due ${formatDate(current?.due_date)}`}
            </h2>
            <p className="mt-1 text-sm text-primary-foreground/85">{meeting.detail}</p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Hapta received</p>
                <p className="text-lg font-semibold">
                  {paidCount} / {currentContributions.length || members.length}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Collected</p>
                <p className="text-lg font-semibold">
                  {formatRupees(collected)}
                </p>
              </div>
            </div>
            {winner ? (
              <p className="mt-4 rounded-xl bg-accent/70 px-3 py-2 font-semibold">
                {winner.display_name} received this month&apos;s pool.
              </p>
            ) : null}
            {currentPayout && currentPayout.status === "pending" && isAdmin ? (
              <PayoutForm cycleId={currentPayout.cycle_id} groupId={group.id} />
            ) : null}
          </div>
        </Card>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button asChild variant="outline">
          <Link href={`/groups/${id}/grid`}>Who paid</Link>
        </Button>
        {group.type === "lucky_draw" ? (
          <Button asChild disabled={!canStartRound}>
            <Link href={`/groups/${id}/draw`}>
              {meeting.canDraw ? "Draw chitthi" : "Chitthi"}
            </Link>
          </Button>
        ) : (
          <Button asChild variant="secondary">
            <Link href={`/groups/${id}/draw`}>Bidding soon</Link>
          </Button>
        )}
        <Button asChild variant="outline" className="col-span-2">
          <Link href={`/groups/${id}/reports`}>Member statements</Link>
        </Button>
      </div>

      {timeline.length > 0 ? (
        <div className="mt-8">
          <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Who has received the pool
          </h3>
          <div className="mt-3 space-y-2">
            {timeline.map(({ cycle, winner }) => (
              <Card key={cycle.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-semibold">{winner?.display_name ?? "Member"}</p>
                  <p className="text-sm text-muted-foreground">
                    Month {cycle.cycle_number} · {formatDate(cycle.due_date)}
                  </p>
                </div>
                <span className="text-xs font-semibold text-primary">Won</span>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            How this Bhishi works
          </h3>
          <HowBhishiWorks compact />
        </div>
      )}
    </div>
  );
}
