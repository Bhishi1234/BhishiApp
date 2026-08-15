import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatRupees, groupTypeHindi, groupTypeLabel } from "@/lib/format";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Group } from "@/lib/types";

export default async function GroupsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="px-5 py-8">
        <h1 className="text-2xl font-bold">Connect Supabase</h1>
        <p className="mt-3 text-muted-foreground">
          Copy <code>.env.example</code> to <code>.env.local</code>, add your
          project URL and anon key, then run the SQL in{" "}
          <code>supabase/migrations/00001_init.sql</code>.
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
  const counts = await Promise.all(
    groupRows.map(async (group) => {
      const { count } = await supabase
        .from("group_members")
        .select("id", { count: "exact", head: true })
        .eq("group_id", group.id)
        .eq("status", "active");
      return [group.id, count ?? 0] as const;
    }),
  );
  const countMap = Object.fromEntries(counts);

  return (
    <div className="px-5 py-6">
      <div className="mb-6">
        <p className="text-sm font-semibold text-primary">Your groups</p>
        <h1 className="text-3xl font-bold">Bhishi</h1>
      </div>

      {groupRows.length === 0 ? (
        <Card className="p-6">
          <h2 className="text-xl font-semibold">No groups yet</h2>
          <p className="mt-2 text-muted-foreground">
            Create a Lucky Draw or Bidding group. Add members, track who paid,
            and keep the register on your phone.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {groupRows.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`} className="block">
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{group.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {groupTypeLabel(group.type)} · {groupTypeHindi(group.type)}
                    </p>
                  </div>
                  <Badge>{group.status}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Members</p>
                    <p className="font-semibold">
                      {countMap[group.id] ?? 0} / {group.planned_member_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Each cycle</p>
                    <p className="font-semibold">
                      {formatRupees(group.contribution_amount)}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Link
        href="/groups/new"
        className="fixed right-5 bottom-24 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        aria-label="Create group"
      >
        <Plus className="size-7" />
      </Link>
    </div>
  );
}
