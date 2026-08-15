import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { ActivityEvent, ActivityKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const chips: { id: string; label: string; kind?: ActivityKind }[] = [
  { id: "all", label: "All" },
  { id: "winner", label: "Winners", kind: "winner" },
  { id: "member", label: "Members", kind: "member" },
  { id: "round", label: "Rounds", kind: "round" },
  { id: "payment", label: "Payments", kind: "payment" },
];

export function AlertsFeed({
  events,
  filter,
}: {
  events: (ActivityEvent & { groupName?: string })[];
  filter: string;
}) {
  const visible =
    filter === "all" ? events : events.filter((event) => event.kind === filter);

  return (
    <div className="mt-5">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {chips.map((chip) => (
          <Link
            key={chip.id}
            href={chip.id === "all" ? "/alerts" : `/alerts?filter=${chip.id}`}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold",
              filter === chip.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            {chip.label}
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card className="mt-4 p-6">
          <h2 className="text-xl font-semibold">No Alerts Yet</h2>
          <p className="mt-2 text-muted-foreground">
            Activities from your groups will appear here.
          </p>
        </Card>
      ) : (
        <div className="mt-4 space-y-3">
          {visible.map((event) => (
            <Link key={event.id} href={`/groups/${event.group_id}`}>
              <Card className="p-4">
                <p className="text-xs font-semibold text-primary">{event.groupName}</p>
                <p className="mt-1 font-semibold">{event.title}</p>
                {event.body ? (
                  <p className="mt-1 text-sm text-muted-foreground">{event.body}</p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDate(event.created_at)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
