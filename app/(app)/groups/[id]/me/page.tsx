import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getMeetingState } from "@/lib/cycle";
import { daysLate } from "@/lib/dates";
import { formatDate, formatRupees, seatName } from "@/lib/format";
import { getGroupBundle } from "@/lib/group-data";
import { parseLocale, t } from "@/lib/i18n";

export default async function MyStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getGroupBundle(id);
  if (!bundle?.membership) notFound();

  const { group, cycles, contributions, payouts, profile, mySeats } = bundle;
  const locale = parseLocale(profile?.locale);
  const meeting = getMeetingState(cycles, payouts, group.frequency);
  const current = meeting.cycle;

  return (
    <div className="px-5 py-6">
      <PageHeader
        backHref={`/groups/${id}`}
        backLabel={group.name}
        title={t(locale, "yourStatement")}
        subtitle={mySeats.map((seat) => seatName(seat)).join(" · ")}
      />

      <div className="space-y-5">
        {mySeats.map((seat) => {
          const rows = contributions.filter((row) => row.member_id === seat.id);
          const paid = rows.filter((row) => row.status === "paid").length;
          const wonPayout = payouts.find((row) => row.winner_member_id === seat.id);
          const wonCycle = cycles.find((cycle) => cycle.id === wonPayout?.cycle_id);
          const currentRow = rows.find((row) => row.cycle_id === current?.id);
          const currentPaid = currentRow?.status === "paid";

          return (
            <div key={seat.id}>
              {mySeats.length > 1 ? (
                <p className="mb-2 text-sm font-semibold text-primary">{seatName(seat)}</p>
              ) : null}
              <Card className="overflow-hidden p-0">
                <div className="panel-hero px-5 py-5">
                  <p className="text-lg font-semibold">
                    {t(locale, "youPaidLine", { paid, total: rows.length || cycles.length })}
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                    {wonCycle
                      ? t(locale, "youWonMonth", { n: wonCycle.cycle_number })
                      : t(locale, "youWaitingTurn")}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    {currentPaid
                      ? t(locale, "thisMonthOk")
                      : t(locale, "thisMonthDue", { amount: formatRupees(group.contribution_amount) })}
                  </p>
                </div>
              </Card>

              <div className="mt-3 space-y-2">
                {cycles.map((cycle) => {
                  const row = rows.find((item) => item.cycle_id === cycle.id);
                  const won = wonPayout?.cycle_id === cycle.id;
                  const late =
                    row && row.status !== "paid" && row.status !== "partial" ? daysLate(cycle.due_date) : 0;
                  return (
                    <Card key={cycle.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="font-semibold">
                          {t(locale, "monthN", { n: cycle.cycle_number })} · {formatDate(cycle.due_date, locale)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatRupees(row?.amount_paid ?? 0)} /{" "}
                          {formatRupees(row?.amount_due ?? group.contribution_amount)}
                        </p>
                      </div>
                      {won ? (
                        <Badge className="bg-accent text-accent-foreground">{t(locale, "receivedPoolBadge")}</Badge>
                      ) : row?.status === "paid" ? (
                        <Badge className="bg-emerald-50 text-emerald-800">{t(locale, "paid")}</Badge>
                      ) : late > 0 ? (
                        <Badge className="bg-red-50 text-red-800">
                          {late === 1 ? t(locale, "dayLate") : t(locale, "daysLate", { n: late })}
                        </Badge>
                      ) : (
                        <Badge>{t(locale, "due")}</Badge>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
