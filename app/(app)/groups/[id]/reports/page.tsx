import { notFound } from "next/navigation";
import Link from "next/link";
import { StatementButton } from "@/components/groups/statement-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { formatRupees } from "@/lib/format";
import { getGroupBundle } from "@/lib/group-data";
import { parseLocale, t } from "@/lib/i18n";
import { groupByPerson } from "@/lib/people";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getGroupBundle(id);
  if (!bundle) notFound();

  const locale = parseLocale(bundle.profile?.locale);
  const { group, members, cycles, contributions, payouts } = bundle;
  const people = groupByPerson(members);

  return (
    <div className="px-5 py-6">
      <PageHeader
        backHref={`/groups/${id}`}
        backLabel={group.name}
        title={t(locale, "memberStatements")}
        subtitle={t(locale, "statementsSubtitle")}
      />

      <StatementButton
        group={group}
        members={members}
        cycles={cycles}
        contributions={contributions}
      />
      {bundle.membership ? (
        <Button asChild variant="outline" className="mt-3 w-full">
          <Link href={`/groups/${id}/me`}>{t(locale, "yourStatement")}</Link>
        </Button>
      ) : null}

      <div className="mt-5 space-y-3">
        {people.map((person) => {
          const seatIds = new Set(person.seats.map((seat) => seat.id));
          const rows = contributions.filter((row) => seatIds.has(row.member_id));
          const paidMonths = cycles.filter((cycle) => {
            const monthRows = rows.filter((row) => row.cycle_id === cycle.id);
            return monthRows.length > 0 && monthRows.every((row) => row.status === "paid");
          }).length;
          const wonCount = person.seats.filter((seat) =>
            payouts.some((row) => row.winner_member_id === seat.id),
          ).length;
          return (
            <Card key={person.key} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{person.display_name}</p>
                  {person.handCount > 1 ? (
                    <p className="text-xs font-semibold text-primary">
                      {t(locale, "playingHands", { n: person.handCount })}
                    </p>
                  ) : null}
                </div>
                {wonCount === 0 ? (
                  <Badge>{t(locale, "waitingTurn")}</Badge>
                ) : wonCount === person.handCount ? (
                  <Badge className="bg-accent text-accent-foreground">{t(locale, "receivedPoolBadge")}</Badge>
                ) : (
                  <Badge className="bg-accent text-accent-foreground">
                    {t(locale, "handsWon", { won: wonCount, n: person.handCount })}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(locale, "monthsPaid", { paid: paidMonths, total: cycles.length })} ·{" "}
                {formatRupees(rows.reduce((sum, row) => sum + Number(row.amount_paid), 0))}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
