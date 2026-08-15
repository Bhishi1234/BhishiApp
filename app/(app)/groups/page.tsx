import Link from "next/link";
import { HowBhishiWorks } from "@/components/groups/how-bhishi-works";
import { PhoneInviteCard } from "@/components/groups/phone-invite-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getMeetingState } from "@/lib/cycle";
import { formatDate, formatRupees, groupTypeHindi, groupTypeLabel } from "@/lib/format";
import { getCurrentProfile, getPhoneInvites } from "@/lib/group-data";
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
  const [{ profile }, invites, { data: groups }] = await Promise.all([
    getCurrentProfile(),
    getPhoneInvites(),
    supabase.from("groups").select("*").order("created_at", { ascending: false }),
  ]);

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

  const hasPhone = Boolean(profile?.phone);
  const showEmpty = groupRows.length === 0 && invites.length === 0;
  const greeting = profile?.full_name?.trim() || "there";

  const upcoming = groupRows
    .map((group) => {
      const meeting = getMeetingState(
        cycles.filter((cycle) => cycle.group_id === group.id),
        payouts.filter((payout) =>
          cycles.some((cycle) => cycle.group_id === group.id && cycle.id === payout.cycle_id),
        ),
        group.frequency,
      );
      return { group, meeting };
    })
    .filter((row) => row.meeting.cycle && !row.meeting.drawn)
    .sort((a, b) => (a.meeting.cycle?.due_date ?? "").localeCompare(b.meeting.cycle?.due_date ?? ""));
  const nextDraw = upcoming[0];

  return (
    <div className="px-5 py-6">
      <div className="mb-5">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">Dashboard</p>
        <h1 className="mt-1 text-[1.85rem] leading-tight font-bold tracking-tight">
          Hello, {greeting}
        </h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
          Hapta, chitthi, and who has already received the pool — in one register.
        </p>
      </div>

      {nextDraw ? (
        <Card className="mb-5 overflow-hidden p-0">
          <div className="panel-hero px-5 py-5">
            <p className="text-sm font-semibold text-primary">Next chitthi</p>
            <h2 className="mt-1 text-2xl font-bold">{formatDate(nextDraw.meeting.cycle?.due_date)}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {nextDraw.group.name} · {nextDraw.meeting.label}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{nextDraw.meeting.detail}</p>
          </div>
        </Card>
      ) : null}

      {!hasPhone ? (
        <Card className="mb-4 p-4">
          <p className="font-semibold">Add your mobile number</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            If someone added you to a Bhishi by phone, the invite appears here after you save
            that number on your profile.
          </p>
          <Button asChild variant="outline" className="mt-3 w-full">
            <Link href="/profile">Add phone in Profile</Link>
          </Button>
        </Card>
      ) : null}

      {invites.length > 0 ? (
        <div className="mb-6 space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Invited to join
          </h2>
          {invites.map((invite) => (
            <PhoneInviteCard key={invite.member_id} invite={invite} />
          ))}
        </div>
      ) : null}

      {showEmpty ? (
        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="panel-hero px-5 py-5">
              <p className="text-sm font-semibold text-primary">Start a Bhishi</p>
              <p className="mt-1 text-2xl font-bold">Create your first group</p>
              <p className="mt-2 text-sm text-muted-foreground">
                The first chitthi opens one month after the start date. Then one winner each
                month, until everyone has had a turn.
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
      ) : groupRows.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Your groups
          </h2>
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
                    <div className="w-1.5 shrink-0 bg-gradient-to-b from-[#60a5fa] to-[#2563eb]" />
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
      ) : null}

      <Link
        href="/groups/new"
        className="fixed right-5 bottom-24 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-[0_10px_24px_rgba(37,99,235,0.35)]"
        aria-label="Create group"
      >
        <Plus className="size-7" />
      </Link>
    </div>
  );
}
