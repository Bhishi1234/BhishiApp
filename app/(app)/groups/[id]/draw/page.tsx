import Link from "next/link";
import { notFound } from "next/navigation";
import { LuckyDraw } from "@/components/groups/lucky-draw";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getMeetingState } from "@/lib/cycle";
import { formatDate } from "@/lib/format";
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
  const meeting = getMeetingState(cycles, payouts, group.frequency);
  const current = meeting.cycle;
  const wonIds = new Set(payouts.map((row) => row.winner_member_id));
  const eligible = members.filter((member) => !wonIds.has(member.id));
  const alreadyWon = members
    .filter((member) => wonIds.has(member.id))
    .map((member) => member.display_name);
  const existing = current ? payouts.find((row) => row.cycle_id === current.id) : undefined;
  const winner = members.find((member) => member.id === existing?.winner_member_id);

  return (
    <div className="px-5 py-6">
      <PageHeader
        backHref={`/groups/${id}`}
        backLabel={group.name}
        kicker="चिठ्ठी"
        title={group.type === "lucky_draw" ? "Monthly chitthi" : "Bidding"}
        subtitle="One name is drawn each month. Anyone who has already received the pool stays out."
      />

      {group.type !== "lucky_draw" ? (
        <Card className="p-5">
          <h2 className="text-xl font-semibold">Bidding comes next</h2>
          <p className="mt-2 text-muted-foreground">
            Track hapta here for now. The lilav screen will be added after the lucky-draw month loop is solid.
          </p>
        </Card>
      ) : members.length < 2 ? (
        <Card className="p-5">
          Add at least one more member before the first meeting.
          <Button asChild className="mt-4 w-full">
            <Link href={`/groups/${id}/members`}>Add members</Link>
          </Button>
        </Card>
      ) : existing ? (
        <Card className="p-5 text-center">
          <p className="text-sm font-semibold text-primary">Month {current?.cycle_number} locked</p>
          <p className="mt-2 text-4xl font-bold">{winner?.display_name}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            This month&apos;s chitthi is done. The next draw opens on the next due date —
            not before.
          </p>
        </Card>
      ) : !meeting.canDraw ? (
        <Card className="p-5">
          <p className="text-sm font-semibold text-primary">{meeting.label}</p>
          <h2 className="mt-2 text-2xl font-bold">Due {formatDate(current?.due_date)}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            In a traditional Bhishi the chitthi is drawn at the monthly meeting, after
            hapta is collected. The app follows that: one draw per month, only on or
            after the due date.
          </p>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href={`/groups/${id}/grid`}>Mark this month&apos;s hapta</Link>
          </Button>
        </Card>
      ) : !isAdmin ? (
        <Card className="p-5">Only the organiser can draw the chitthi on meeting day.</Card>
      ) : !current ? (
        <Card className="p-5">No open month right now.</Card>
      ) : (
        <LuckyDraw
          cycleId={current.id}
          groupId={group.id}
          cycleNumber={current.cycle_number}
          eligible={eligible}
          alreadyWon={alreadyWon}
        />
      )}
    </div>
  );
}
