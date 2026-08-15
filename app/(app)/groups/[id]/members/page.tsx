import { notFound } from "next/navigation";
import { AddMemberForm } from "@/components/groups/add-member-form";
import { CoAdminButton } from "@/components/groups/co-admin-button";
import { LeaveGroupButton, ReplaceMemberForm } from "@/components/groups/member-lifecycle";
import { NudgeJoinButton } from "@/components/groups/nudge-join-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { formatPhone } from "@/lib/format";
import { getGroupBundle } from "@/lib/group-data";
import { parseLocale, t } from "@/lib/i18n";

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
  const myId = bundle.membership?.id;
  const joinedCount = bundle.members.filter((member) => member.user_id).length;

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
              {t(locale, "joinedCount", { joined: joinedCount, total: bundle.members.length })}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t(locale, "coAdminHelp")}</p>
          </div>
        </Card>
      ) : null}

      {bundle.isAdmin ? (
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold">{t(locale, "addToRegister")}</p>
          <AddMemberForm groupId={id} />
        </Card>
      ) : null}

      <div className="mt-5 space-y-3">
        {bundle.members.map((member) => {
          const isWinner = wonIds.has(member.id);
          const isSelf = member.id === myId;
          const isOrganiserSeat = member.role === "admin";
          const isCoAdmin = member.role === "co_admin";
          const joined = Boolean(member.user_id);

          return (
            <Card key={member.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{member.display_name}</p>
                  <p className="text-sm text-muted-foreground">{formatPhone(member.phone)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {isWinner ? (
                    <Badge className="bg-accent text-accent-foreground">
                      {t(locale, "receivedPoolBadge")}
                    </Badge>
                  ) : (
                    <Badge>{t(locale, "stillEligible")}</Badge>
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
              {isSelf && isWinner ? (
                <p className="mt-3 text-sm text-muted-foreground">{t(locale, "leaveBlockedWinner")}</p>
              ) : null}
              {isSelf && !isOrganiserSeat && !isWinner ? (
                <LeaveGroupButton groupId={id} groupName={bundle.group.name} />
              ) : null}
              {bundle.isOwner && !isOrganiserSeat && isCoAdmin ? (
                <CoAdminButton memberId={member.id} groupId={id} enabled />
              ) : null}
              {bundle.isOwner && !isOrganiserSeat && !isCoAdmin && joined ? (
                <CoAdminButton memberId={member.id} groupId={id} enabled={false} />
              ) : null}
              {bundle.isOwner && !isOrganiserSeat && !joined ? (
                <p className="mt-3 text-sm text-muted-foreground">{t(locale, "coAdminNeedJoin")}</p>
              ) : null}
              {!joined && bundle.isAdmin ? (
                <NudgeJoinButton
                  name={member.display_name}
                  phone={member.phone}
                  groupName={bundle.group.name}
                />
              ) : null}
              {bundle.isAdmin && !isOrganiserSeat && !isCoAdmin && !isWinner && !isSelf ? (
                <ReplaceMemberForm memberId={member.id} groupId={id} />
              ) : null}
              {bundle.isAdmin && isWinner && !isOrganiserSeat ? (
                <p className="mt-3 text-sm text-muted-foreground">{t(locale, "leaveBlockedWinner")}</p>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
