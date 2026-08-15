import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  ActivityEvent,
  Contribution,
  Cycle,
  Group,
  GroupMember,
  GroupSettings,
  Payout,
  Profile,
} from "@/lib/types";

export async function getCurrentProfile() {
  if (!isSupabaseConfigured()) {
    return { user: null, profile: null, supabase: null };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null, supabase };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile: profile as Profile | null, supabase };
}

export async function getGroupBundle(groupId: string) {
  const { user, profile, supabase } = await getCurrentProfile();
  if (!user || !supabase) return null;

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();
  if (!group) return null;

  const [
    { data: members },
    { data: cycles },
    { data: settings },
    { data: myMembership },
  ] = await Promise.all([
    supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .eq("status", "active")
      .order("joined_at"),
    supabase
      .from("cycles")
      .select("*")
      .eq("group_id", groupId)
      .order("cycle_number"),
    supabase.from("group_settings").select("*").eq("group_id", groupId).single(),
    supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  const cycleRows = (cycles ?? []) as Cycle[];
  const cycleIds = cycleRows.map((cycle) => cycle.id);

  const [{ data: contributions }, { data: payouts }] = await Promise.all([
    cycleIds.length
      ? supabase.from("contributions").select("*").in("cycle_id", cycleIds)
      : Promise.resolve({ data: [] }),
    cycleIds.length
      ? supabase.from("payouts").select("*").in("cycle_id", cycleIds)
      : Promise.resolve({ data: [] }),
  ]);

  const membership = myMembership as GroupMember | null;
  const isAdmin = membership?.role === "admin" || membership?.role === "co_admin";

  return {
    user,
    profile,
    group: group as Group,
    members: (members ?? []) as GroupMember[],
    cycles: cycleRows,
    contributions: (contributions ?? []) as Contribution[],
    payouts: (payouts ?? []) as Payout[],
    settings: (settings ?? null) as GroupSettings | null,
    membership,
    isAdmin,
  };
}

export async function getAlerts() {
  const { user, supabase } = await getCurrentProfile();
  if (!user || !supabase) return [];

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)
    .eq("status", "active");

  const groupIds = (memberships ?? []).map((row) => row.group_id);
  if (groupIds.length === 0) return [];

  const [{ data }, { data: groups }] = await Promise.all([
    supabase
      .from("activity_events")
      .select("*")
      .in("group_id", groupIds)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase.from("groups").select("id, name").in("id", groupIds),
  ]);

  const names = Object.fromEntries((groups ?? []).map((row) => [row.id, row.name]));
  return ((data ?? []) as ActivityEvent[]).map((event) => ({
    ...event,
    groupName: names[event.group_id] ?? "Group",
  }));
}
