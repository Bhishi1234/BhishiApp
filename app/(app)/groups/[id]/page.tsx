import Link from "next/link";
import { notFound } from "next/navigation";
import { Settings, UserPlus } from "lucide-react";
import { HowBhishiWorks } from "@/components/groups/how-bhishi-works";
import { InviteButton } from "@/components/groups/invite-button";
import { MeetingChecklist } from "@/components/groups/meeting-checklist";
import { MeetingSlipButton } from "@/components/groups/meeting-slip-button";
import { PostponeForm } from "@/components/groups/postpone-form";
import { ReminderButton } from "@/components/groups/reminder-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getMeetingState, winnersTimeline } from "@/lib/cycle";
import { daysLate } from "@/lib/dates";
import { formatDate, formatRupees, groupTypeHindi, groupTypeLabel } from "@/lib/format";
import { getGroupBundle } from "@/lib/group-data";
import { parseLocale, t } from "@/lib/i18n";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getGroupBundle(id);
  if (!bundle) notFound();

  const { group, members, cycles, contributions, payouts, isAdmin, organiser, profile } = bundle;
  const locale = parseLocale(profile?.locale);
  const meeting = getMeetingState(cycles, payouts, group.frequency);
  const current = meeting.cycle;
  const currentContributions = contributions.filter((row) => row.cycle_id === current?.id);
  const paidCount = currentContributions.filter((row) => row.status === "paid").length;
  const collected = currentContributions.reduce((sum, row) => sum + Number(row.amount_paid), 0);
  const unpaidMembers = members.filter((member) =>
    currentContributions.some((row) => row.member_id === member.id && row.status !== "paid"),
  );
  const unpaid = unpaidMembers.map((member) => {
    const row = currentContributions.find((item) => item.member_id === member.id);
    return {
      memberId: member.id,
      contributionId: row?.id ?? "",
      name: member.display_name,
      phone: member.phone,
      claimed: Boolean(row?.member_claimed_at),
      lateDays: daysLate(current?.due_date ?? group.start_date),
    };
  }).filter((row) => row.contributionId);
  const currentPayout = payouts.find((row) => row.cycle_id === current?.id);
  const winner = members.find((member) => member.id === currentPayout?.winner_member_id);
  const canStartRound = members.length >= 2;
  const timeline = winnersTimeline(cycles, payouts, members);
  const organiserUpi = organiser?.upi_id;
  const joinedCount = members.filter((member) => member.user_id).length;
  const wonIds = new Set(payouts.map((row) => row.winner_member_id));
  const eligibleNames = members.filter((member) => !wonIds.has(member.id)).map((member) => member.display_name);
  const alreadyWonNames = members.filter((member) => wonIds.has(member.id)).map((member) => member.display_name);
  const paidNames = members
    .filter((member) =>
      currentContributions.some((row) => row.member_id === member.id && row.status === "paid"),
    )
    .map((member) => member.display_name);

  return (
    <div className="px-5 py-6">
      <PageHeader
        backHref="/groups"
        backLabel={t(locale, "groupsBack")}
        title={group.name}
        subtitle={`${groupTypeLabel(group.type)} · ${groupTypeHindi(group.type)}`}
        action={
          <Link href={`/groups/${id}/settings`} className="flex size-11 items-center justify-center rounded-full bg-secondary" aria-label={t(locale, "settingsTitle")}>
            <Settings className="size-5" />
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-2 text-center">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">{t(locale, "members")}</p>
          <p className="font-bold">{members.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">{t(locale, "monthlyHapta")}</p>
          <p className="font-bold">{formatRupees(group.contribution_amount)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">{t(locale, "thisPool")}</p>
          <p className="font-bold">{formatRupees(current?.pool_amount ?? 0)}</p>
        </Card>
      </div>

      {isAdmin ? (
        <Card className="mt-4 p-4">
          <p className="text-sm font-semibold">
            {t(locale, "joinedCount", { joined: joinedCount, total: members.length })}
          </p>
        </Card>
      ) : null}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Link
          href={`/groups/${id}/members`}
          className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl bg-secondary/80 px-2 text-sm font-semibold"
        >
          <UserPlus className="size-5" />
          {t(locale, "members")}
        </Link>
        <ReminderButton
          unpaid={unpaidMembers.map((member) => ({ name: member.display_name, phone: member.phone }))}
          groupName={group.name}
          amount={group.contribution_amount}
          dueDate={current?.due_date ?? group.start_date}
          upiId={organiserUpi}
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
          <h2 className="text-xl font-semibold">{t(locale, "addMembersFirst")}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            {t(locale, "addMembersFirstBody")}
          </p>
          <Button asChild className="mt-4 w-full">
            <Link href={`/groups/${id}/members`}>{t(locale, "addAMember")}</Link>
          </Button>
        </Card>
      ) : (
        <MeetingChecklist
          groupId={group.id}
          groupName={group.name}
          amount={group.contribution_amount}
          dueDate={current?.due_date ?? group.start_date}
          cycleNumber={current?.cycle_number ?? 1}
          plannedCount={group.planned_member_count}
          unpaid={unpaid}
          paidCount={paidCount}
          totalCount={currentContributions.length || members.length}
          collected={collected}
          isAdmin={isAdmin}
          canDraw={meeting.canDraw}
          drawn={Boolean(currentPayout)}
          winnerName={winner?.display_name ?? null}
          payoutPending={currentPayout?.status === "pending"}
          cycleId={currentPayout?.cycle_id ?? current?.id ?? null}
          upiId={organiserUpi}
          meetingLabel={meeting.label}
          meetingDetail={meeting.detail}
        />
      )}

      {canStartRound && isAdmin && current && !currentPayout ? (
        <PostponeForm cycleId={current.id} groupId={group.id} currentDue={current.due_date} />
      ) : null}

      {current?.postpone_note ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{current.postpone_note}</p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button asChild variant="outline">
          <Link href={`/groups/${id}/grid`}>{t(locale, "whoPaid")}</Link>
        </Button>
        {group.type === "lucky_draw" ? (
          <Button asChild disabled={!canStartRound}>
            <Link href={`/groups/${id}/draw`}>
              {meeting.canDraw ? t(locale, "drawChitthi") : t(locale, "chitthi")}
            </Link>
          </Button>
        ) : (
          <Button asChild variant="secondary">
            <Link href={`/groups/${id}/draw`}>{t(locale, "biddingSoon")}</Link>
          </Button>
        )}
        <Button asChild variant="outline" className="col-span-2">
          <Link href={`/groups/${id}/me`}>{t(locale, "yourStatement")}</Link>
        </Button>
        <div className="col-span-2">
          <MeetingSlipButton
            groupName={group.name}
            cycleNumber={current?.cycle_number ?? 1}
            dueDate={current?.due_date ?? group.start_date}
            poolAmount={current?.pool_amount ?? 0}
            haptaAmount={group.contribution_amount}
            paid={paidNames}
            due={unpaid.map((row) => ({ name: row.name, lateDays: row.lateDays }))}
            eligible={eligibleNames}
            alreadyWon={alreadyWonNames}
            winnerName={winner?.display_name ?? null}
          />
        </div>
        <Button asChild variant="outline" className="col-span-2">
          <Link href={`/groups/${id}/reports`}>{t(locale, "memberStatements")}</Link>
        </Button>
      </div>

      {timeline.length > 0 ? (
        <div className="mt-8">
          <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t(locale, "whoReceived")}
          </h3>
          <div className="mt-3 space-y-2">
            {timeline.map(({ cycle, winner: person }) => (
              <Card key={cycle.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-semibold">{person?.display_name ?? t(locale, "members")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t(locale, "monthN", { n: cycle.cycle_number })} · {formatDate(cycle.due_date, locale)}
                  </p>
                </div>
                <span className="text-xs font-semibold text-primary">{t(locale, "won")}</span>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t(locale, "howItWorks")}
          </h3>
          <HowBhishiWorks compact />
        </div>
      )}
    </div>
  );
}
