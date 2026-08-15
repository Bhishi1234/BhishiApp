import Link from "next/link";
import { notFound } from "next/navigation";
import { LuckyDraw } from "@/components/groups/lucky-draw";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getMeetingState } from "@/lib/cycle";
import { formatDate } from "@/lib/format";
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

  const { group, members, cycles, contributions, payouts, isAdmin, profile } = bundle;
  const locale = parseLocale(profile?.locale);
  const meeting = getMeetingState(cycles, payouts, group.frequency);
  const current = meeting.cycle;
  const wonIds = new Set(payouts.map((row) => row.winner_member_id));
  const eligible = members.filter((member) => !wonIds.has(member.id));
  const alreadyWon = members
    .filter((member) => wonIds.has(member.id))
    .map((member) => member.display_name);
  const existing = current ? payouts.find((row) => row.cycle_id === current.id) : undefined;
  const winner = members.find((member) => member.id === existing?.winner_member_id);
  const currentContributions = contributions.filter((row) => row.cycle_id === current?.id);
  const unpaidNames = members
    .filter((member) =>
      currentContributions.some((row) => row.member_id === member.id && row.status !== "paid"),
    )
    .map((member) => member.display_name);

  return (
    <div className="px-5 py-6">
      <PageHeader
        backHref={`/groups/${id}`}
        backLabel={group.name}
        kicker="चिठ्ठी"
        title={group.type === "lucky_draw" ? t(locale, "drawTitle") : t(locale, "biddingSoon")}
        subtitle={t(locale, "drawSubtitle")}
      />

      {group.type !== "lucky_draw" ? (
        <Card className="p-5">
          <h2 className="text-xl font-semibold">{t(locale, "biddingSoon")}</h2>
          <p className="mt-2 text-muted-foreground">{t(locale, "drawWaitBody")}</p>
        </Card>
      ) : members.length < 2 ? (
        <Card className="p-5">
          {t(locale, "addMembersFirst")}
          <Button asChild className="mt-4 w-full">
            <Link href={`/groups/${id}/members`}>{t(locale, "addAMember")}</Link>
          </Button>
        </Card>
      ) : existing ? (
        <Card className="p-5 text-center">
          <p className="text-sm font-semibold text-primary">
            {t(locale, "monthLocked", { n: current?.cycle_number ?? 1 })}
          </p>
          <p className="mt-2 text-4xl font-bold">{winner?.display_name}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {t(locale, "lockedUntilNext")}
          </p>
        </Card>
      ) : !meeting.canDraw ? (
        <Card className="p-5">
          <p className="text-sm font-semibold text-primary">{meeting.label}</p>
          <h2 className="mt-2 text-2xl font-bold">
            {t(locale, "dueOn", { date: formatDate(current?.due_date, locale) })}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {t(locale, "drawWaitBody")}
          </p>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href={`/groups/${id}/grid`}>{t(locale, "markThisHapta")}</Link>
          </Button>
        </Card>
      ) : !isAdmin ? (
        <Card className="p-5">{t(locale, "onlyOrganiserDraw")}</Card>
      ) : !current ? (
        <Card className="p-5">{t(locale, "quietAlerts")}</Card>
      ) : (
        <LuckyDraw
          cycleId={current.id}
          groupId={group.id}
          cycleNumber={current.cycle_number}
          eligible={eligible}
          alreadyWon={alreadyWon}
          unpaidNames={unpaidNames}
        />
      )}
    </div>
  );
}
