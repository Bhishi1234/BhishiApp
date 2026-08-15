import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LuckyDraw } from "@/components/groups/lucky-draw";
import { Card } from "@/components/ui/card";
import { getGroupBundle } from "@/lib/group-data";

export default async function DrawPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getGroupBundle(id);
  if (!bundle) notFound();

  const { group, members, cycles, payouts, isAdmin } = bundle;
  const current =
    cycles.find((cycle) => cycle.status === "open") ??
    cycles.find((cycle) => cycle.status === "drawn");
  const wonIds = new Set(payouts.map((row) => row.winner_member_id));
  const eligible = members.filter((member) => !wonIds.has(member.id));
  const alreadyWon = members
    .filter((member) => wonIds.has(member.id))
    .map((member) => member.display_name);
  const existing = payouts.find((row) => row.cycle_id === current?.id);
  const winner = members.find((member) => member.id === existing?.winner_member_id);

  return (
    <div className="px-5 py-6">
      <Link href={`/groups/${id}`} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold">
        <ArrowLeft className="size-4" /> {group.name}
      </Link>
      <h1 className="text-3xl font-bold">
        {group.type === "lucky_draw" ? "Lucky draw" : "Bidding"}
      </h1>

      {group.type !== "lucky_draw" ? (
        <Card className="mt-5 p-5">
          <h2 className="text-xl font-semibold">Bidding comes next</h2>
          <p className="mt-2 text-muted-foreground">
            This group is set up for bidding. You can already track members and
            payments. The bid screen will be added after the lucky-draw loop is
            working for you.
          </p>
        </Card>
      ) : members.length < 2 ? (
        <Card className="mt-5 p-5">
          Add at least 1 more member before starting a round.
        </Card>
      ) : existing ? (
        <Card className="mt-5 p-5">
          <p className="text-sm text-muted-foreground">Round {current?.cycle_number} winner</p>
          <p className="mt-2 text-3xl font-bold">{winner?.display_name}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Locked in. People who already received the pool are excluded next time.
          </p>
        </Card>
      ) : !isAdmin ? (
        <Card className="mt-5 p-5">Only the organiser can run the draw.</Card>
      ) : !current ? (
        <Card className="mt-5 p-5">No open round right now.</Card>
      ) : (
        <div className="mt-5">
          <LuckyDraw
            cycleId={current.id}
            groupId={group.id}
            eligible={eligible}
            alreadyWon={alreadyWon}
          />
        </div>
      )}
    </div>
  );
}
