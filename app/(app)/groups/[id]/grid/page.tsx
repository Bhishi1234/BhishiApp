import { notFound } from "next/navigation";
import { ContributionCell } from "@/components/groups/contribution-cell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getMeetingState } from "@/lib/cycle";
import { formatDate, formatRupees, seatName } from "@/lib/format";
import { getGroupBundle } from "@/lib/group-data";
import { parseLocale, t } from "@/lib/i18n";

export default async function GridPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getGroupBundle(id);
  if (!bundle) notFound();

  const { group, members, cycles, contributions, payouts, isAdmin, settings, profile, mySeats } =
    bundle;
  const locale = parseLocale(profile?.locale);
  const meeting = getMeetingState(cycles, payouts, group.frequency);
  const currentId = meeting.cycle?.id;
  const currentContributions = contributions.filter((row) => row.cycle_id === currentId);
  const paidThisMonth = currentContributions.filter((row) => row.status === "paid").length;
  const selfServe = settings?.self_serve_paid !== false;

  return (
    <div className="px-5 py-6">
      <PageHeader
        backHref={`/groups/${id}`}
        backLabel={group.name}
        kicker="हप्ता"
        title={t(locale, "haptaRegister")}
        subtitle={isAdmin ? t(locale, "haptaRegisterAdmin") : t(locale, "haptaRegisterMember")}
      />

      <Card className="mb-4 overflow-hidden p-0">
        <div className="panel-hero px-5 py-4">
          <p className="text-sm font-semibold text-primary">
            {meeting.canDraw ? t(locale, "thisMeeting") : t(locale, "nextHapta")}
          </p>
          <h2 className="mt-1 text-xl font-bold">
            {t(locale, "monthN", { n: meeting.cycle?.cycle_number ?? 1 })} ·{" "}
            {formatDate(meeting.cycle?.due_date, locale)}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(locale, "haptaEach", {
              paid: paidThisMonth,
              total: members.length,
              amount: formatRupees(group.contribution_amount),
            })}
          </p>
        </div>
      </Card>

      <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
        <Badge className="bg-emerald-50 text-emerald-800">{t(locale, "paid")}</Badge>
        <Badge className="bg-amber-50 text-amber-800">{t(locale, "claimed")}</Badge>
        <Badge className="bg-red-50 text-red-800">{t(locale, "dayLate")}</Badge>
        <Badge>{t(locale, "due")}</Badge>
      </div>

      <div className="space-y-4">
        {members.map((member) => {
          const rows = contributions.filter((row) => row.member_id === member.id);
          const paidCount = rows.filter((row) => row.status === "paid").length;
          const initial = member.display_name.trim().charAt(0).toUpperCase() || "M";
          const canClaim = selfServe && mySeats.some((seat) => seat.id === member.id);

          return (
            <Card key={member.id} className="p-0">
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{seatName(member)}</p>
                  <p className="text-sm text-muted-foreground">
                    {t(locale, "monthsPaid", { paid: paidCount, total: cycles.length })}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="flex w-max gap-3 px-5 py-4">
                  {cycles.map((cycle) => {
                    const contribution = rows.find((row) => row.cycle_id === cycle.id);
                    return contribution ? (
                      <ContributionCell
                        key={cycle.id}
                        contribution={contribution}
                        groupId={group.id}
                        canEdit={isAdmin}
                        canClaim={canClaim}
                        memberName={seatName(member)}
                        cycleNumber={cycle.cycle_number}
                        dueDate={cycle.due_date}
                        highlight={cycle.id === currentId}
                      />
                    ) : (
                      <div
                        key={cycle.id}
                        className="flex w-[7.75rem] shrink-0 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground"
                      >
                        —
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
