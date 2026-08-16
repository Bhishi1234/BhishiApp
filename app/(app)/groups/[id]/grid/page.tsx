import { notFound } from "next/navigation";
import { ContributionCell } from "@/components/groups/contribution-cell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getMeetingState } from "@/lib/cycle";
import { formatDate, formatRupees } from "@/lib/format";
import { getGroupBundle } from "@/lib/group-data";
import { parseLocale, t } from "@/lib/i18n";
import { combineCycleContributions, groupByPerson } from "@/lib/people";

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
  const meeting = getMeetingState(cycles, payouts, group.frequency, group.type);
  const currentId = meeting.cycle?.id;
  const currentContributions = contributions.filter((row) => row.cycle_id === currentId);
  const paidThisMonth = currentContributions.filter((row) => row.status === "paid").length;
  const selfServe = settings?.self_serve_paid !== false;
  const people = groupByPerson(members);
  const mySeatIds = new Set(mySeats.map((seat) => seat.id));

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
        {people.map((person) => {
          const seatIds = new Set(person.seats.map((seat) => seat.id));
          const rows = contributions.filter((row) => seatIds.has(row.member_id));
          const paidMonths = cycles.filter((cycle) => {
            const monthRows = rows.filter((row) => row.cycle_id === cycle.id);
            return monthRows.length > 0 && monthRows.every((row) => row.status === "paid");
          }).length;
          const initial = person.display_name.trim().charAt(0).toUpperCase() || "M";
          const canClaim = selfServe && person.seats.some((seat) => mySeatIds.has(seat.id));

          return (
            <Card key={person.key} className="p-0">
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{person.display_name}</p>
                  {person.handCount > 1 ? (
                    <p className="text-xs font-semibold text-primary">
                      {t(locale, "playingHands", { n: person.handCount })}
                    </p>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    {t(locale, "monthsPaid", { paid: paidMonths, total: cycles.length })}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="flex w-max gap-3 px-5 py-4">
                  {cycles.map((cycle) => {
                    const monthRows = rows.filter((row) => row.cycle_id === cycle.id);
                    const contribution = combineCycleContributions(monthRows);
                    const unpaidIds = monthRows
                      .filter((row) => row.status !== "paid")
                      .map((row) => row.id);
                    return contribution ? (
                      <ContributionCell
                        key={cycle.id}
                        contribution={contribution}
                        extraIds={
                          unpaidIds.length > 0 && unpaidIds.length < monthRows.length
                            ? unpaidIds
                            : monthRows.map((row) => row.id)
                        }
                        groupId={group.id}
                        canEdit={isAdmin}
                        canClaim={canClaim}
                        memberName={person.display_name}
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
