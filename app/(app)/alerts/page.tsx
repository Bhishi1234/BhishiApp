import { AlertsFeed } from "@/components/alerts/alerts-feed";
import { getAlerts } from "@/lib/group-data";

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const events = await getAlerts();

  return (
    <div className="px-5 py-6">
      <h1 className="text-3xl font-bold">Alerts</h1>
      <p className="mt-2 text-muted-foreground">
        Activity from all your groups. Nothing is sent automatically.
      </p>
      <AlertsFeed events={events} filter={filter ?? "all"} />
    </div>
  );
}
