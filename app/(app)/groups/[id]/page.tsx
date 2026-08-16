import Link from "next/link";
import { notFound } from "next/navigation";
import { Settings, UserPlus } from "lucide-react";
import { HowBhishiWorks } from "@/components/groups/how-bhishi-works";
import { InviteButton } from "@/components/groups/invite-button";
import { MeetingChecklist } from "@/components/groups/meeting-checklist";
import { MeetingSlipButton } from "@/components/groups/meeting-slip-button";
import { PayoutAcceptCard } from "@/components/groups/payout-accept";
import { PostponeForm } from "@/components/groups/postpone-form";
import { ReminderButton } from "@/components/groups/reminder-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getMeetingState, winnersTimeline } from "@/lib/cycle";
import { daysLate } from "@/lib/dates";
import { formatDate, formatRupees, groupTypeHindi, groupTypeLabel, seatName } from "@/lib/format";
import { getGroupBundle } from "@/lib/group-data";
import { parseLocale, t } from "@/lib/i18n";
import { groupByPerson, transferRecipients } from "@/lib/people";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getGroupBundle(id);
  if (!bundle) notFound();

  const { group, members, cycles, contributions, payouts, isAdmin, isOwner, organiser, profile, mySeats } = bundle;
  const locale = parseLocale(profile?.locale);
  const meeting = getMeetingState(cycles, payouts, group.frequency, group.type);
  const current = meeting.cycle;
  const currentContributions = contributions.filter((row) => row.cycle_id === current?.id);
  const paidCount = currentContributions.filter((row) => row.status === "paid").length;
  const collected = currentContributions.reduce((sum, row) => sum + Number(row.amount_paid), 0);
  const people = groupByPerson(members);
  const unpaid = people.flatMap((person) => {
    const rows = currentContributions.filter(
      (row) => person.seats.some((seat) => seat.id === row.member_id) && row.status !== "paid",
    );
    if (rows.length === 0) return [];
    const amountDue = rows.reduce(
      (sum, row) => sum + Math.max(Number(row.amount_due) - Number(row.amount_paid), 0),
      0,
    );
    return [
      {
        key: person.key,
        name: person.display_name,
        phone: person.phone,
        contributionIds: rows.map((row) => row.id),
        handCount: person.handCount,
        unpaidHands: rows.length,
        amountDue,
        claimed: rows.every((row) => Boolean(row.member_claimed_at)),
        lateDays: daysLate(current?.due_date ?? group.start_date),
      },
    ];
  });
  const unpaidMembers = unpaid.map((row) => ({ name: row.name, phone: row.phone }));
  const currentPayout = payouts.find((row) => row.cycle_id === current?.id);
  const winner = members.find((member) => member.id === currentPayout?.winner_member_id);
  const drawnId = currentPayout?.drawn_member_id ?? currentPayout?.winner_member_id;
  const drawnMember = members.find((member) => member.id === drawnId);
  const acceptStatus = currentPayout?.acceptance_status ?? "accepted";
  const canActOnPayout = Boolean(
    mySeats.some((seat) => seat.id === drawnId) || (isAdmin && !drawnMember?.user_id),
  );
  const pastWonIds = new Set(
    payouts.filter((row) => row.cycle_id !== current?.id).map((row) => row.winner_member_id),
  );
  const allotRecipients = transferRecipients(members, drawnMember, pastWonIds);
  const payoutSettled = acceptStatus === "accepted" || acceptStatus === "transferred";
  const canStartRound = members.length >= 2;
  const timeline = winnersTimeline(cycles, payouts, members);
  const organiserUpi = organiser?.upi_id;
  const joinedCount = members.filter((member) => member.user_id).length;
  const wonIds = new Set(payouts.map((row) => row.winner_member_id));
  const eligibleNames = members.filter((member) => !wonIds.has(member.id)).map((member) => seatName(member));
  const alreadyWonNames = members.filter((member) => wonIds.has(member.id)).map((member) => seatName(member));
  const paidNames = members
    .filter((member) =>
      currentContributions.some((row) => row.member_id === member.id && row.status === "paid"),
    )
    .map((member) => seatName(member));

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

      <div className={`mt-4 grid gap-2 ${isOwner ? "grid-cols-3" : "grid-cols-1"}`}>
        <Link
          href={`/groups/${id}/members`}
          className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl bg-secondary/80 px-2 text-sm font-semibold"
        >
          <UserPlus className="size-5" />
          {t(locale, "members")}
        </Link>
        {isOwner ? (
          <>
            <ReminderButton
              unpaid={unpaidMembers}
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
          </>
        ) : null}
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
          winnerName={
            payoutSettled
              ? winner?.display_name ?? null
              : drawnMember?.display_name ?? winner?.display_name ?? null
          }
          payoutPending={currentPayout?.status === "pending"}
          payoutAcceptance={group.type === "lucky_draw" ? acceptStatus : "accepted"}
          cycleId={currentPayout?.cycle_id ?? current?.id ?? null}
          upiId={organiserUpi}
          meetingLabel={meeting.label}
          meetingDetail={meeting.detail}
          groupType={group.type}
          bidPayout={group.type === "bidding" ? currentPayout ?? null : null}
          poolAmount={current?.pool_amount ?? 0}
          canRemind={isOwner}
        />
      )}

      {canStartRound && group.type === "lucky_draw" && currentPayout ? (
        <div className="mt-4">
          <PayoutAcceptCard
            payout={currentPayout}
            members={members}
            recipients={allotRecipients}
            groupId={group.id}
            canAct={canActOnPayout}
            isAdmin={isAdmin}
          />
        </div>
      ) : null}

      {canStartRound && isAdmin && current && !currentPayout ? (
        <PostponeForm cycleId={current.id} groupId={group.id} currentDue={current.due_date} />
      ) : null}

      {current?.postpone_note ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{current.postpone_note}</p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button asChild variant="outline" className={group.type === "bidding" ? "col-span-2" : undefined}>
          <Link href={`/groups/${id}/grid`}>{t(locale, "whoPaid")}</Link>
        </Button>
        {group.type === "lucky_draw" ? (
          <Button asChild disabled={!canStartRound}>
            <Link href={`/groups/${id}/draw`}>
              {meeting.canDraw ? t(locale, "drawChitthi") : t(locale, "chitthi")}
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" className="col-span-2">
          <Link href={`/groups/${id}/me`}>{t(locale, "yourStatement")}</Link>
        </Button>
        <Button asChild variant="outline" className="col-span-2">
          <Link href={`/groups/${id}/settlement`}>{t(locale, "settlement")}</Link>
        </Button>
        <div className="col-span-2">
          <MeetingSlipButton
            groupName={group.name}
            cycleNumber={current?.cycle_number ?? 1}
            dueDate={current?.due_date ?? group.start_date}
            poolAmount={current?.pool_amount ?? 0}
            haptaAmount={group.contribution_amount}
            paid={paidNames}
            due={unpaid.map((row) => ({
              name: row.handCount > 1 ? `${row.name} (${row.handCount})` : row.name,
              lateDays: row.lateDays,
            }))}
            eligible={eligibleNames}
            alreadyWon={alreadyWonNames}
            winnerName={winner ? seatName(winner) : null}
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
            {timeline.map(({ cycle, payout, winner: person }) => (
              <Card key={cycle.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{person ? seatName(person) : t(locale, "members")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t(locale, "monthN", { n: cycle.cycle_number })} · {formatDate(cycle.due_date, locale)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary">{t(locale, "won")}</span>
                </div>
                {payout?.method === "bid" ? (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(locale, "winnerGets", {
                      amount: formatRupees(Number(cycle.pool_amount) - Number(payout.bid_discount ?? 0)),
                    })}
                    {" · "}
                    {t(locale, "eachOtherGets", { amount: formatRupees(payout.bonus_per_member ?? 0) })}
                  </p>
                ) : null}
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t(locale, "howItWorks")}
          </h3>
          <HowBhishiWorks compact groupType={group.type} />
        </div>
      )}
    </div>
  );
}
