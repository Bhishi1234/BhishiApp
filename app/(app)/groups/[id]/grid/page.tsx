import { notFound } from "next/navigation";
import { ContributionCell } from "@/components/groups/contribution-cell";
import { PageHeader } from "@/components/layout/page-header";
import { formatDayMonth } from "@/lib/format";
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
      <PageHeader
        backHref={`/groups/${id}`}
        backLabel={group.name}
        title="Hapta register"
        subtitle="Tap a cell to mark paid, unpaid, or partial. This only updates the notebook — money is paid outside."
      />

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="min-w-max text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 bg-card px-3 py-3">Member</th>
              {cycles.map((cycle) => (
                <th key={cycle.id} className="px-3 py-3 font-semibold">
                  <div>M{cycle.cycle_number}</div>
                  <div className="text-[11px] font-medium text-muted-foreground">
                    {formatDayMonth(cycle.due_date)}
                  </div>
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
