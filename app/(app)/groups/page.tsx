import Link from "next/link";
import { HowBhishiWorks } from "@/components/groups/how-bhishi-works";
import { HaptaPayCard } from "@/components/groups/hapta-pay-card";
import { PhoneInviteCard } from "@/components/groups/phone-invite-card";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getMeetingState } from "@/lib/cycle";
import { formatDate, formatRupees, groupTypeHindi, groupTypeLabel } from "@/lib/format";
import { getCurrentProfile, getPhoneInvites } from "@/lib/group-data";
import { parseLocale, t } from "@/lib/i18n";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Contribution, Cycle, Group, GroupMember, GroupSettings, Payout, Profile } from "@/lib/types";
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
  const [{ user, profile }, invites, { data: groups }] = await Promise.all([
    getCurrentProfile(),
    getPhoneInvites(),
    supabase.from("groups").select("*").order("created_at", { ascending: false }),
  ]);

  const locale = parseLocale(profile?.locale);
  const groupRows = (groups ?? []) as Group[];
  const groupIds = groupRows.map((group) => group.id);
  const organiserIds = [...new Set(groupRows.map((group) => group.created_by))];

  const [{ data: memberRows }, { data: cycleRows }, { data: settingsRows }, { data: organiserRows }] =
    await Promise.all([
      groupIds.length
        ? supabase
            .from("group_members")
            .select("id, group_id, user_id, role, display_name, hand_number")
            .in("group_id", groupIds)
            .eq("status", "active")
        : Promise.resolve({ data: [] }),
      groupIds.length
        ? supabase.from("cycles").select("*").in("group_id", groupIds).order("cycle_number")
        : Promise.resolve({ data: [] }),
      groupIds.length
        ? supabase.from("group_settings").select("group_id, self_serve_paid").in("group_id", groupIds)
        : Promise.resolve({ data: [] }),
      organiserIds.length
        ? supabase.from("profiles").select("id, full_name, upi_id").in("id", organiserIds)
        : Promise.resolve({ data: [] }),
    ]);

  const cycles = (cycleRows ?? []) as Cycle[];
  const cycleIds = cycles.map((cycle) => cycle.id);
  const { data: payoutRows } = cycleIds.length
    ? await supabase.from("payouts").select("*").in("cycle_id", cycleIds)
    : { data: [] };
  const payouts = (payoutRows ?? []) as Payout[];

  const members = (memberRows ?? []) as Pick<
    GroupMember,
    "id" | "group_id" | "user_id" | "role" | "display_name" | "hand_number"
  >[];
  const myMemberIds = members.filter((row) => row.user_id === user?.id).map((row) => row.id);
  const { data: myContributionRows } = myMemberIds.length
    ? await supabase.from("contributions").select("*").in("member_id", myMemberIds)
    : { data: [] };
  const myContributions = (myContributionRows ?? []) as Contribution[];
  const settingsMap = Object.fromEntries(
    ((settingsRows ?? []) as Pick<GroupSettings, "group_id" | "self_serve_paid">[]).map((row) => [
      row.group_id,
      row.self_serve_paid,
    ]),
  );
  const organiserMap = Object.fromEntries(
    ((organiserRows ?? []) as Pick<Profile, "id" | "full_name" | "upi_id">[]).map((row) => [row.id, row]),
  );

  const countMap: Record<string, number> = {};
  for (const row of members) {
    countMap[row.group_id] = (countMap[row.group_id] ?? 0) + 1;
  }

  const showEmpty = groupRows.length === 0 && invites.length === 0;
  const greeting = profile?.full_name?.trim() || t(locale, "greetingFallback");

  const upcoming = groupRows
    .map((group) => {
      const meeting = getMeetingState(
        cycles.filter((cycle) => cycle.group_id === group.id),
        payouts.filter((payout) =>
          cycles.some((cycle) => cycle.group_id === group.id && cycle.id === payout.cycle_id),
        ),
        group.frequency,
        group.type,
      );
      return { group, meeting };
    })
    .filter((row) => row.meeting.cycle && !row.meeting.drawn)
    .sort((a, b) => (a.meeting.cycle?.due_date ?? "").localeCompare(b.meeting.cycle?.due_date ?? ""));
  const nextDraw = upcoming[0];

  const haptaCards = groupRows.flatMap((group) => {
    const mine = members.filter((row) => row.group_id === group.id && row.user_id === user?.id);
    if (mine.length === 0) return [];
    const meeting = getMeetingState(
      cycles.filter((cycle) => cycle.group_id === group.id),
      payouts.filter((payout) =>
        cycles.some((cycle) => cycle.group_id === group.id && cycle.id === payout.cycle_id),
      ),
      group.frequency,
      group.type,
    );
    const cycle = meeting.cycle;
    if (!cycle) return [];
    const organiser = organiserMap[group.created_by];
    return mine.flatMap((seat) => {
      const contribution = myContributions.find(
        (row) => row.member_id === seat.id && row.cycle_id === cycle.id,
      );
      if (!contribution) return [];
      return [
        {
          group,
          cycle,
          contribution,
          seatLabel: (seat.hand_number ?? 1) > 1 ? ` · hand ${seat.hand_number}` : "",
          organiserName: organiser?.full_name?.trim() || "Organiser",
          organiserUpi: organiser?.upi_id ?? null,
          selfServe: settingsMap[group.id] !== false,
        },
      ];
    });
  });

  return (
    <div className="px-5 py-6">
      <div className="mb-5">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">{t(locale, "dashboard")}</p>
        <h1 className="mt-1 text-[1.85rem] leading-tight font-bold tracking-tight">
          {t(locale, "hello", { name: greeting })}
        </h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
          {t(locale, "dashboardSubtitle")}
        </p>
        <div className="mt-4">
          <LocaleSwitcher compact />
        </div>
      </div>

      {nextDraw ? (
        <Card className="mb-5 overflow-hidden p-0">
          <div className="panel-hero px-5 py-5">
            <p className="text-sm font-semibold text-primary">
              {t(locale, nextDraw.group.type === "bidding" ? "nextLilav" : "nextChitthi")}
            </p>
            <h2 className="mt-1 text-2xl font-bold">{formatDate(nextDraw.meeting.cycle?.due_date, locale)}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {nextDraw.group.name} · {nextDraw.meeting.label}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{nextDraw.meeting.detail}</p>
          </div>
        </Card>
      ) : null}

      {haptaCards.length > 0 ? (
        <div className="mb-6 space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t(locale, "yourHapta")}
          </h2>
          {haptaCards.map((row) => (
            <HaptaPayCard
              key={row.contribution.id}
              contribution={row.contribution}
              groupId={row.group.id}
              groupName={`${row.group.name}${row.seatLabel}`}
              cycleNumber={row.cycle.cycle_number}
              dueDate={row.cycle.due_date}
              amount={row.group.contribution_amount}
              organiserName={row.organiserName}
              organiserUpi={row.organiserUpi}
              selfServe={row.selfServe}
            />
          ))}
        </div>
      ) : null}

      {invites.length > 0 ? (
        <div className="mb-6 space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t(locale, "invitedToJoin")}
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
              <p className="text-sm font-semibold text-primary">{t(locale, "startBhishi")}</p>
              <p className="mt-1 text-2xl font-bold">{t(locale, "createFirst")}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t(locale, "createFirstBody")}</p>
            </div>
            <div className="p-5">
              <Button asChild className="w-full">
                <Link href="/groups/new">{t(locale, "createGroup")}</Link>
              </Button>
            </div>
          </Card>
          <HowBhishiWorks compact />
        </div>
      ) : groupRows.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t(locale, "yourGroups")}
          </h2>
          {groupRows.map((group) => {
            const groupCycles = cycles.filter((cycle) => cycle.group_id === group.id);
            const groupPayouts = payouts.filter((payout) =>
              groupCycles.some((cycle) => cycle.id === payout.cycle_id),
            );
            const meeting = getMeetingState(groupCycles, groupPayouts, group.frequency, group.type);
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
                          <p className="text-muted-foreground">{t(locale, "monthlyHapta")}</p>
                          <p className="font-semibold">{formatRupees(group.contribution_amount)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t(locale, "members")}</p>
                          <p className="font-semibold">
                            {countMap[group.id] ?? 0} / {group.planned_member_count}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="mb-1.5 flex justify-between gap-2 text-xs font-semibold">
                          <span className="text-muted-foreground">
                            {t(locale, "monthsDone", {
                              drawn: drawnCount,
                              total: group.planned_member_count,
                            })}
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
        aria-label={t(locale, "createGroup")}
      >
        <Plus className="size-7" />
      </Link>
    </div>
  );
}
