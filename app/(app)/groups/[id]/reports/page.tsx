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
        {members.map((member) => {
          const rows = contributions.filter((row) => row.member_id === member.id);
          const paid = rows.filter((row) => row.status === "paid").length;
          const won = payouts.some((row) => row.winner_member_id === member.id);
          return (
            <Card key={member.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{member.display_name}</p>
                {won ? (
                  <Badge className="bg-accent text-accent-foreground">{t(locale, "receivedPoolBadge")}</Badge>
                ) : (
                  <Badge>{t(locale, "waitingTurn")}</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(locale, "monthsPaid", { paid, total: rows.length })} ·{" "}
                {formatRupees(rows.reduce((sum, row) => sum + Number(row.amount_paid), 0))}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
