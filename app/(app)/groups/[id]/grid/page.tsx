import { notFound } from "next/navigation";
import { ContributionCell } from "@/components/groups/contribution-cell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getMeetingState } from "@/lib/cycle";
import { formatDate, formatRupees } from "@/lib/format";
import { getGroupBundle } from "@/lib/group-data";

export default async function GridPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getGroupBundle(id);
  if (!bundle) notFound();

  const { group, members, cycles, contributions, payouts, isAdmin } = bundle;
  const meeting = getMeetingState(cycles, payouts, group.frequency);
  const currentId = meeting.cycle?.id;
  const currentContributions = contributions.filter((row) => row.cycle_id === currentId);
  const paidThisMonth = currentContributions.filter((row) => row.status === "paid").length;

  return (
    <div className="px-5 py-6">
      <PageHeader
        backHref={`/groups/${id}`}
        backLabel={group.name}
        kicker="हप्ता"
        title="Hapta register"
        subtitle={
          isAdmin
            ? "Tap a month card to mark paid, due, or partial. This only updates the notebook."
            : "Payment status for each month. Only the organiser can mark hapta."
        }
      />

      <Card className="mb-4 overflow-hidden p-0">
        <div className="panel-hero px-5 py-4">
          <p className="text-sm font-semibold text-primary">
            {meeting.canDraw ? "This meeting" : "Next hapta"}
          </p>
          <h2 className="mt-1 text-xl font-bold">
            Month {meeting.cycle?.cycle_number ?? 1} · {formatDate(meeting.cycle?.due_date)}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {paidThisMonth} of {members.length} paid · {formatRupees(group.contribution_amount)} each
          </p>
        </div>
      </Card>

      <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
        <Badge className="bg-emerald-50 text-emerald-800">Paid</Badge>
        <Badge className="bg-amber-50 text-amber-800">Partial</Badge>
        <Badge>Due — tap to update</Badge>
      </div>

      <div className="space-y-4">
        {members.map((member) => {
          const rows = contributions.filter((row) => row.member_id === member.id);
          const paidCount = rows.filter((row) => row.status === "paid").length;
          const initial = member.display_name.trim().charAt(0).toUpperCase() || "M";

          return (
            <Card key={member.id} className="p-0">
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{member.display_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {paidCount} of {cycles.length} months paid
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
                        memberName={member.display_name}
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
