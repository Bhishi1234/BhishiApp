import { notFound } from "next/navigation";
import { AddHandButton } from "@/components/groups/add-hand-button";
import { AddMemberForm } from "@/components/groups/add-member-form";
import { CoAdminButton } from "@/components/groups/co-admin-button";
import { HandRequestList } from "@/components/groups/hand-request-list";
import { LeaveGroupButton, ReplaceMemberForm } from "@/components/groups/member-lifecycle";
import { NudgeJoinButton } from "@/components/groups/nudge-join-button";
import { RequestHandsForm } from "@/components/groups/request-hands-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { formatPhone } from "@/lib/format";
import { getGroupBundle } from "@/lib/group-data";
import { parseLocale, t } from "@/lib/i18n";
import { groupByPerson } from "@/lib/people";
import Link from "next/link";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getGroupBundle(id);
  if (!bundle) notFound();

  const locale = parseLocale(bundle.profile?.locale);
  const wonIds = new Set(bundle.payouts.map((row) => row.winner_member_id));
  const joinedCount = bundle.members.filter((member) => member.user_id).length;
  const canAddHand = bundle.members.length < bundle.group.planned_member_count;
  const myHands = bundle.mySeats.length;
  const remainingSeats = bundle.group.planned_member_count - bundle.members.length;
  const myPending = bundle.handRequests.find(
    (row) => row.user_id === bundle.user.id && row.status === "pending",
  );

  return (
    <div className="px-5 py-6">
      <PageHeader
        backHref={`/groups/${id}`}
        backLabel={bundle.group.name}
        title={t(locale, "membersTitle")}
        subtitle={t(locale, "membersSubtitle")}
      />

      {bundle.isAdmin ? (
        <Card className="mb-4 overflow-hidden p-0">
          <div className="panel-hero px-5 py-4">
            <p className="text-sm font-semibold text-primary">
              {t(locale, "seatsFilled", {
                filled: bundle.members.length,
                total: bundle.group.planned_member_count,
              })}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(locale, "joinedCount", { joined: joinedCount, total: bundle.members.length })}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t(locale, "coAdminHelp")}</p>
          </div>
        </Card>
      ) : null}

      {bundle.isAdmin ? (
        <HandRequestList
          requests={bundle.handRequests}
          members={bundle.members}
          groupId={id}
        />
      ) : null}

      {myHands > 0 && remainingSeats > 0 && !myPending ? (
        <div className="mb-4">
          <RequestHandsForm
            groupId={id}
            currentHands={myHands}
            maxHands={myHands + remainingSeats}
          />
        </div>
      ) : null}
      {myPending ? (
        <Card className="mb-4 p-4">
          <p className="text-sm font-semibold text-primary">{t(locale, "requestPending")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(locale, "handRequestLine", {
              name: bundle.profile?.full_name || "You",
              want: myPending.requested_hands,
              have: myPending.current_hands,
            })}
          </p>
        </Card>
      ) : null}

      <Button asChild variant="outline" className="mb-4 w-full">
        <Link href={`/groups/${id}/settlement`}>{t(locale, "settlement")}</Link>
      </Button>

      {bundle.isAdmin ? (
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold">{t(locale, "addToRegister")}</p>
          <AddMemberForm groupId={id} />
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(locale, "addHandHelp")}</p>
        </Card>
      ) : null}

      <div className="mt-5 space-y-3">
        {groupByPerson(bundle.members).map((person) => {
          const member = person.primary;
          const wonCount = person.seats.filter((seat) => wonIds.has(seat.id)).length;
          const isSelf = person.user_id === bundle.user.id;
          const isOrganiserSeat = person.seats.some((seat) => seat.role === "admin");
          const coAdminSeat = person.seats.find((seat) => seat.role === "co_admin");
          const isCoAdmin = Boolean(coAdminSeat);
          const joined = Boolean(person.user_id);
          const leaveSeat = person.seats.find((seat) => seat.role !== "admin" && !wonIds.has(seat.id));

          return (
            <Card key={person.key} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{person.display_name}</p>
                  <p className="text-sm text-muted-foreground">{formatPhone(person.phone)}</p>
                  {person.handCount > 1 ? (
                    <p className="mt-1 text-xs font-semibold text-primary">
                      {t(locale, "playingHands", { n: person.handCount })}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {wonCount === 0 ? (
                    <Badge>{t(locale, "stillEligible")}</Badge>
                  ) : wonCount === person.handCount ? (
                    <Badge className="bg-accent text-accent-foreground">
                      {t(locale, "receivedPoolBadge")}
                    </Badge>
                  ) : (
                    <Badge className="bg-accent text-accent-foreground">
                      {t(locale, "handsWon", { won: wonCount, n: person.handCount })}
                    </Badge>
                  )}
                  {isCoAdmin ? (
                    <Badge className="bg-primary text-white">{t(locale, "coAdminBadge")}</Badge>
                  ) : null}
                  <p className="text-xs font-semibold text-muted-foreground">
                    {joined ? null : t(locale, "notJoined")}
                  </p>
                </div>
              </div>

              {isSelf && isOrganiserSeat ? (
                <p className="mt-3 text-sm text-muted-foreground">{t(locale, "organiserCannotLeave")}</p>
              ) : null}
              {isSelf && !leaveSeat && !isOrganiserSeat ? (
                <p className="mt-3 text-sm text-muted-foreground">{t(locale, "leaveBlockedWinner")}</p>
              ) : null}
              {isSelf && leaveSeat && !isOrganiserSeat ? (
                <LeaveGroupButton groupId={id} groupName={bundle.group.name} memberId={leaveSeat.id} />
              ) : null}
              {bundle.isOwner && !isOrganiserSeat && isCoAdmin && coAdminSeat ? (
                <CoAdminButton memberId={coAdminSeat.id} groupId={id} enabled />
              ) : null}
              {bundle.isOwner && !isOrganiserSeat && !isCoAdmin && joined ? (
                <CoAdminButton memberId={member.id} groupId={id} enabled={false} />
              ) : null}
              {bundle.isOwner && !isOrganiserSeat && !joined ? (
                <p className="mt-3 text-sm text-muted-foreground">{t(locale, "coAdminNeedJoin")}</p>
              ) : null}
              {!joined && bundle.isAdmin ? (
                <NudgeJoinButton
                  name={person.display_name}
                  phone={person.phone}
                  groupName={bundle.group.name}
                />
              ) : null}
              {bundle.isAdmin && canAddHand ? <AddHandButton memberId={member.id} groupId={id} /> : null}
              {bundle.isAdmin && person.handCount === 1 && !isOrganiserSeat && !isCoAdmin && wonCount === 0 && !isSelf ? (
                <ReplaceMemberForm memberId={member.id} groupId={id} />
              ) : null}
              {bundle.isAdmin && wonCount === person.handCount && !isOrganiserSeat ? (
                <p className="mt-3 text-sm text-muted-foreground">{t(locale, "leaveBlockedWinner")}</p>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
