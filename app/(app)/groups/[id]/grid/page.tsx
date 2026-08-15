import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ContributionCell } from "@/components/groups/contribution-cell";
import { getGroupBundle } from "@/lib/group-data";

export default async function GridPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getGroupBundle(id);
  if (!bundle) notFound();

  const { group, members, cycles, contributions, isAdmin } = bundle;

  return (
    <div className="px-5 py-6">
      <Link href={`/groups/${id}`} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold">
        <ArrowLeft className="size-4" /> {group.name}
      </Link>
      <h1 className="text-3xl font-bold">Payments</h1>
      <p className="mt-2 text-muted-foreground">
        Tap a cell to mark paid, unpaid, or partial. This only updates the register.
      </p>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="min-w-max text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 bg-card px-3 py-3">Member</th>
              {cycles.map((cycle) => (
                <th key={cycle.id} className="px-3 py-3 font-semibold">
                  R{cycle.cycle_number}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b border-border last:border-0">
                <td className="sticky left-0 bg-card px-3 py-2 font-medium">
                  {member.display_name}
                </td>
                {cycles.map((cycle) => {
                  const contribution = contributions.find(
                    (row) => row.member_id === member.id && row.cycle_id === cycle.id,
                  );
                  return (
                    <td key={cycle.id} className="px-2 py-2">
                      {contribution ? (
                        <ContributionCell
                          contribution={contribution}
                          groupId={group.id}
                          canEdit={isAdmin}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
