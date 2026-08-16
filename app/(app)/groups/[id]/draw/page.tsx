import Link from "next/link";
import { notFound } from "next/navigation";
import { BiddingBoard } from "@/components/groups/bidding-board";
import { LuckyDraw } from "@/components/groups/lucky-draw";
import { ChitthiBox } from "@/components/groups/chitthi-box";
import { PayoutAcceptCard } from "@/components/groups/payout-accept";
import { PostponeForm } from "@/components/groups/postpone-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getMeetingState } from "@/lib/cycle";
import { formatDate, seatName } from "@/lib/format";
import { getGroupBundle } from "@/lib/group-data";
import { parseLocale, t } from "@/lib/i18n";

export default async function DrawPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getGroupBundle(id);
  if (!bundle) notFound();

  const { group, members, cycles, contributions, payouts, bids, isAdmin, profile, mySeats } = bundle;
  const locale = parseLocale(profile?.locale);
  const meeting = getMeetingState(cycles, payouts, group.frequency);
  const current = meeting.cycle;
  const wonIds = new Set(payouts.map((row) => row.winner_member_id));
  const eligible = members.filter((member) => !wonIds.has(member.id));
  const alreadyWon = members.filter((member) => wonIds.has(member.id)).map((member) => seatName(member));
  const existing = current ? payouts.find((row) => row.cycle_id === current.id) : undefined;
  const winner = members.find((member) => member.id === existing?.winner_member_id);
  const frozenNames = (existing?.eligible_member_ids ?? [])
    .map((memberId) => {
      const member = members.find((row) => row.id === memberId);
      return member ? seatName(member) : null;
    })
    .filter((name): name is string => Boolean(name));
  const currentContributions = contributions.filter((row) => row.cycle_id === current?.id);
  const unpaidNames = members
    .filter((member) =>
      currentContributions.some((row) => row.member_id === member.id && row.status !== "paid"),
    )
    .map((member) => seatName(member));
  const currentBids = bids.filter((bid) => bid.cycle_id === current?.id);
  const drawnId = existing?.drawn_member_id ?? existing?.winner_member_id;
  const canActOnPayout = Boolean(
    isAdmin || mySeats.some((seat) => seat.id === drawnId),
  );

  if (group.type === "bidding") {
    return (
      <div className="px-5 py-6">
        <PageHeader
          backHref={`/groups/${id}`}
          backLabel={group.name}
          kicker="लिलाव"
          title={t(locale, "biddingTitle")}
          subtitle={t(locale, "biddingSubtitle")}
        />
        {members.length < 2 ? (
          <Card className="p-5">
            {t(locale, "addMembersFirst")}
            <Button asChild className="mt-4 w-full">
              <Link href={`/groups/${id}/members`}>{t(locale, "addAMember")}</Link>
            </Button>
          </Card>
        ) : current ? (
          <BiddingBoard
            cycle={current}
            groupId={group.id}
            poolAmount={current.pool_amount}
            members={members}
            mySeats={mySeats}
            bids={currentBids}
            payout={existing}
            isAdmin={isAdmin}
            wonMemberIds={[...wonIds]}
          />
        ) : (
          <Card className="p-5">{t(locale, "quietAlerts")}</Card>
        )}
      </div>
    );
  }

  return (
    <div className="px-5 py-6">
      <PageHeader
        backHref={`/groups/${id}`}
        backLabel={group.name}
        kicker="चिठ्ठी"
        title={t(locale, "drawTitle")}
        subtitle={t(locale, "drawSubtitle")}
      />

      {members.length < 2 ? (
        <Card className="p-5">
          {t(locale, "addMembersFirst")}
          <Button asChild className="mt-4 w-full">
            <Link href={`/groups/${id}/members`}>{t(locale, "addAMember")}</Link>
          </Button>
        </Card>
      ) : existing ? (
        <div className="space-y-4">
          <Card className="p-5 text-center">
            <p className="text-sm font-semibold text-primary">
              {t(locale, "monthLocked", { n: current?.cycle_number ?? 1 })}
            </p>
            <p className="mt-2 text-4xl font-bold">{winner ? seatName(winner) : "—"}</p>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              {t(locale, "lockedUntilNext")}
            </p>
          </Card>
          <PayoutAcceptCard
            payout={existing}
            members={members}
            groupId={group.id}
            canAct={canActOnPayout}
            isAdmin={isAdmin}
          />
          <ChitthiBox title={t(locale, "frozenBox")} names={frozenNames.length ? frozenNames : eligible.map((m) => seatName(m))} />
          <ChitthiBox title={t(locale, "alreadyReceived")} names={alreadyWon} muted />
        </div>
      ) : !meeting.canDraw ? (
        <Card className="p-5">
          <p className="text-sm font-semibold text-primary">{meeting.label}</p>
          <h2 className="mt-2 text-2xl font-bold">
            {t(locale, "dueOn", { date: formatDate(current?.due_date, locale) })}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {t(locale, "drawWaitBody")}
          </p>
          <div className="mt-4 space-y-3">
            <ChitthiBox title={t(locale, "inTheBox")} names={eligible.map((member) => seatName(member))} />
            <ChitthiBox title={t(locale, "alreadyReceived")} names={alreadyWon} muted />
          </div>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href={`/groups/${id}/grid`}>{t(locale, "markThisHapta")}</Link>
          </Button>
          {isAdmin && current ? (
            <PostponeForm cycleId={current.id} groupId={group.id} currentDue={current.due_date} />
          ) : null}
        </Card>
      ) : !current ? (
        <Card className="p-5">{t(locale, "quietAlerts")}</Card>
      ) : (
        <>
          <LuckyDraw
            cycleId={current.id}
            groupId={group.id}
            cycleNumber={current.cycle_number}
            eligible={eligible}
            alreadyWon={alreadyWon}
            unpaidNames={unpaidNames}
            canDraw={isAdmin}
          />
          {isAdmin ? (
            <PostponeForm cycleId={current.id} groupId={group.id} currentDue={current.due_date} />
          ) : null}
        </>
      )}
    </div>
  );
}
