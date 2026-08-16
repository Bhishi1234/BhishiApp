import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getMeetingState } from "@/lib/cycle";
import { daysLate } from "@/lib/dates";
import { formatDate, formatRupees } from "@/lib/format";
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
  const meeting = getMeetingState(cycles, payouts, group.frequency, group.type);
  const current = meeting.cycle;
  const seatIds = new Set(mySeats.map((seat) => seat.id));
  const myRows = contributions.filter((row) => seatIds.has(row.member_id));
  const paidMonths = cycles.filter((cycle) => {
    const monthRows = myRows.filter((row) => row.cycle_id === cycle.id);
    return monthRows.length > 0 && monthRows.every((row) => row.status === "paid");
  }).length;
  const wonCount = mySeats.filter((seat) =>
    payouts.some((row) => row.winner_member_id === seat.id),
  ).length;
  const currentRows = myRows.filter((row) => row.cycle_id === current?.id);
  const currentDue = currentRows
    .filter((row) => row.status !== "paid")
    .reduce((sum, row) => sum + Math.max(Number(row.amount_due) - Number(row.amount_paid), 0), 0);
  const currentPaid = currentRows.length > 0 && currentRows.every((row) => row.status === "paid");
  const unpaidHands = currentRows.filter((row) => row.status !== "paid").length;

  return (
    <div className="px-5 py-6">
      <PageHeader
        backHref={`/groups/${id}`}
        backLabel={group.name}
        title={t(locale, "yourStatement")}
        subtitle={
          mySeats.length > 1
            ? t(locale, "playingHands", { n: mySeats.length })
            : mySeats[0]?.display_name
        }
      />

      <Card className="overflow-hidden p-0">
        <div className="panel-hero px-5 py-5">
          <p className="text-lg font-semibold">
            {t(locale, "youPaidLine", { paid: paidMonths, total: cycles.length })}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            {wonCount === 0
              ? t(locale, "youWaitingTurn")
              : mySeats.length > 1
                ? t(locale, "handsWon", { won: wonCount, n: mySeats.length })
                : t(locale, "youWonMonth", {
                    n: cycles.find((cycle) =>
                      payouts.some((row) => row.cycle_id === cycle.id && row.winner_member_id === mySeats[0]?.id),
                    )?.cycle_number ?? 1,
                  })}
          </p>
          <p className="mt-3 text-sm font-semibold text-foreground">
            {currentPaid
              ? t(locale, "thisMonthOk")
              : mySeats.length > 1
                ? t(locale, "dueForHands", {
                    amount: formatRupees(currentDue || Number(group.contribution_amount) * unpaidHands),
                    n: unpaidHands || mySeats.length,
                  })
                : t(locale, "thisMonthDue", {
                    amount: formatRupees(currentDue || group.contribution_amount),
                  })}
          </p>
        </div>
      </Card>

      <div className="mt-3 space-y-2">
        {cycles.map((cycle) => {
          const rows = myRows.filter((item) => item.cycle_id === cycle.id);
          const amountPaid = rows.reduce((sum, row) => sum + Number(row.amount_paid), 0);
          const amountDue = rows.reduce(
            (sum, row) => sum + Number(row.amount_due || group.contribution_amount),
            0,
          );
          const allPaid = rows.length > 0 && rows.every((row) => row.status === "paid");
          const won = payouts.some(
            (row) => row.cycle_id === cycle.id && seatIds.has(row.winner_member_id),
          );
          const late =
            rows.some((row) => row.status !== "paid" && row.status !== "partial")
              ? daysLate(cycle.due_date)
              : 0;
          return (
            <Card key={cycle.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-semibold">
                  {t(locale, "monthN", { n: cycle.cycle_number })} · {formatDate(cycle.due_date, locale)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatRupees(amountPaid)} / {formatRupees(amountDue || Number(group.contribution_amount) * mySeats.length)}
                  {mySeats.length > 1
                    ? ` · ${t(locale, "playingHands", { n: mySeats.length })}`
                    : ""}
                </p>
              </div>
              {won ? (
                <Badge className="bg-accent text-accent-foreground">{t(locale, "receivedPoolBadge")}</Badge>
              ) : allPaid ? (
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
}
