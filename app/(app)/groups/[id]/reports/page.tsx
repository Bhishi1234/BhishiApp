import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StatementButton } from "@/components/groups/statement-button";
import { Card } from "@/components/ui/card";
import { formatRupees } from "@/lib/format";
import { getGroupBundle } from "@/lib/group-data";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getGroupBundle(id);
  if (!bundle) notFound();

  const { group, members, cycles, contributions, payouts } = bundle;

  return (
    <div className="px-5 py-6">
      <Link href={`/groups/${id}`} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold">
        <ArrowLeft className="size-4" /> {group.name}
      </Link>
      <h1 className="text-3xl font-bold">Reports</h1>
      <p className="mt-2 text-muted-foreground">
        A simple statement for the group register. Not a bank statement.
      </p>

      <div className="mt-5">
        <StatementButton
          group={group}
          members={members}
          cycles={cycles}
          contributions={contributions}
        />
      </div>

      <div className="mt-5 space-y-3">
        {members.map((member) => {
          const rows = contributions.filter((row) => row.member_id === member.id);
          const paid = rows.filter((row) => row.status === "paid").length;
          const won = payouts.some((row) => row.winner_member_id === member.id);
          return (
            <Card key={member.id} className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{member.display_name}</p>
                {won ? <span className="text-xs font-semibold text-primary">Received pool</span> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {paid} / {rows.length} cycles paid · {formatRupees(rows.reduce((sum, row) => sum + Number(row.amount_paid), 0))}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
