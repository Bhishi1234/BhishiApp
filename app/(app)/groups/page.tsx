import Link from "next/link";
import { HowBhishiWorks } from "@/components/groups/how-bhishi-works";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/page-header";
import { getMeetingState } from "@/lib/cycle";
import { formatRupees, groupTypeHindi, groupTypeLabel } from "@/lib/format";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Cycle, Group, Payout } from "@/lib/types";
import { Plus } from "lucide-react";

export default async function GroupsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="px-5 py-8">
        <h1 className="text-2xl font-bold">Connect Supabase</h1>
        <p className="mt-3 text-muted-foreground">
          Copy <code>.env.example</code> to <code>.env.local</code> and run the SQL migrations.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: groups } = await supabase
    .from("groups")
    .select("*")
    .order("created_at", { ascending: false });

  const groupRows = (groups ?? []) as Group[];
  const groupIds = groupRows.map((group) => group.id);

  const [{ data: memberRows }, { data: cycleRows }] = await Promise.all([
    groupIds.length
      ? supabase
          .from("group_members")
          .select("group_id")
          .in("group_id", groupIds)
          .eq("status", "active")
      : Promise.resolve({ data: [] }),
    groupIds.length
      ? supabase.from("cycles").select("*").in("group_id", groupIds).order("cycle_number")
      : Promise.resolve({ data: [] }),
  ]);

  const cycles = (cycleRows ?? []) as Cycle[];
  const cycleIds = cycles.map((cycle) => cycle.id);
  const { data: payoutRows } = cycleIds.length
    ? await supabase.from("payouts").select("*").in("cycle_id", cycleIds)
    : { data: [] };
  const payouts = (payoutRows ?? []) as Payout[];

  const countMap: Record<string, number> = {};
  for (const row of memberRows ?? []) {
    countMap[row.group_id] = (countMap[row.group_id] ?? 0) + 1;
  }

  return (
    <div className="px-5 py-6">
      <PageHeader
        kicker="भिशी"
        title="Your groups"
        subtitle="Monthly hapta, meeting-day chitthi, and who has already received the pool."
      />

      {groupRows.length === 0 ? (
        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="bg-primary px-5 py-5 text-primary-foreground">
              <p className="text-sm font-semibold text-primary-foreground/80">Start a Bhishi</p>
              <p className="mt-1 text-2xl font-bold">Create your first group</p>
              <p className="mt-2 text-sm text-primary-foreground/85">
                10 members means 10 months. One winner each month, until everyone has had a turn.
              </p>
            </div>
            <div className="p-5">
              <Button asChild className="w-full">
                <Link href="/groups/new">Create group</Link>
              </Button>
            </div>
          </Card>
          <HowBhishiWorks compact />
        </div>
      ) : (
        <div className="space-y-3">
          {groupRows.map((group) => {
            const groupCycles = cycles.filter((cycle) => cycle.group_id === group.id);
            const groupPayouts = payouts.filter((payout) =>
              groupCycles.some((cycle) => cycle.id === payout.cycle_id),
            );
            const meeting = getMeetingState(groupCycles, groupPayouts, group.frequency);
            const drawnCount = groupPayouts.length;
            const progress = group.planned_member_count
              ? (drawnCount / group.planned_member_count) * 100
              : 0;

            return (
              <Link key={group.id} href={`/groups/${group.id}`} className="block">
                <Card className="overflow-hidden p-0">
                  <div className="flex">
                    <div className="w-1.5 shrink-0 bg-primary" />
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-semibold">{group.name}</h2>
                          <p className="text-sm text-muted-foreground">
                            {groupTypeLabel(group.type)} · {groupTypeHindi(group.type)}
                          </p>
                        </div>
                        <Badge className="capitalize">{group.status}</Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Monthly hapta</p>
                          <p className="font-semibold">{formatRupees(group.contribution_amount)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Members</p>
                          <p className="font-semibold">
                            {countMap[group.id] ?? 0} / {group.planned_member_count}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="mb-1.5 flex justify-between gap-2 text-xs font-semibold">
                          <span className="text-muted-foreground">
                            {drawnCount} of {group.planned_member_count} months done
                          </span>
                          <span className="shrink-0 text-primary">{meeting.label}</span>
                        </div>
                        <Progress value={progress} />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Link
        href="/groups/new"
        className="fixed right-5 bottom-24 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(196,92,38,0.35)]"
        aria-label="Create group"
      >
        <Plus className="size-7" />
      </Link>
    </div>
  );
}
