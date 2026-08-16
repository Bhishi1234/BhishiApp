import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { formatRupees, seatName } from "@/lib/format";
import { getGroupBundle } from "@/lib/group-data";
import { parseLocale, t } from "@/lib/i18n";
import { settlementForPerson, settlementForSeat } from "@/lib/settlement";

export default async function SettlementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getGroupBundle(id);
  if (!bundle) notFound();

  const locale = parseLocale(bundle.profile?.locale);
  const hapta = Number(bundle.group.contribution_amount);
  const people = new Map<string, typeof bundle.members>();
  for (const member of bundle.members) {
    const key = member.user_id || member.phone || member.id;
    const list = people.get(key) ?? [];
    list.push(member);
    people.set(key, list);
  }

  return (
    <div className="px-5 py-6">
      <PageHeader
        backHref={`/groups/${id}/members`}
        backLabel={t(locale, "membersTitle")}
        title={t(locale, "settlementTitle")}
        subtitle={t(locale, "settlementSubtitle")}
      />

      <p className="mb-4 rounded-2xl bg-secondary px-4 py-3 text-sm leading-relaxed text-muted-foreground">
        {t(locale, "calcOnly")}
      </p>

      <div className="space-y-5">
        {[...people.values()].map((seats) => {
          const rows = seats.map((member) => ({
            member,
            calc: settlementForSeat({
              member,
              cycles: bundle.cycles,
              contributions: bundle.contributions,
              payouts: bundle.payouts,
              hapta,
              plannedHands: bundle.group.planned_member_count,
            }),
          }));
          const combined = settlementForPerson(rows.map((row) => row.calc));
          return (
            <Card key={seats[0].id} className="p-5">
              <p className="text-lg font-semibold">{seats[0].display_name}</p>
              {seats.length > 1 ? (
                <p className="mt-1 text-sm font-semibold text-primary">
                  {t(locale, "playingHands", { n: seats.length })}
                </p>
              ) : null}
              {seats.length > 1 ? (
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <Stat label={t(locale, "refundIfLeave")} value={formatRupees(combined.refundIfLeave)} />
                  <Stat label={t(locale, "stillOwes")} value={formatRupees(combined.stillOwesIfLeave)} />
                </div>
              ) : null}
              <div className="mt-4 space-y-3">
                {rows.map(({ member, calc }) => (
                  <div key={member.id} className="rounded-2xl bg-muted px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{seatName(member)}</p>
                      <Badge>{calc.won ? t(locale, "receivedPoolBadge") : t(locale, "stillEligible")}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {calc.won ? t(locale, "settlementWon") : t(locale, "settlementNotWon")}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <Stat label={t(locale, "paidIn")} value={formatRupees(calc.paidIn)} />
                      <Stat label={t(locale, "poolGot")} value={formatRupees(calc.poolReceived)} />
                      <Stat label={t(locale, "remainingMonths")} value={String(calc.remainingMonths)} />
                      <Stat
                        label={calc.won ? t(locale, "stillOwes") : t(locale, "refundIfLeave")}
                        value={formatRupees(calc.won ? calc.stillOwesIfLeave : calc.refundIfLeave)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
