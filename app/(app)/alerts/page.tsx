import { AlertsFeed } from "@/components/alerts/alerts-feed";
import { PageHeader } from "@/components/layout/page-header";
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
      <PageHeader
        kicker="सूचना"
        title="Alerts"
        subtitle="Winners, hapta, and member changes from your groups. Nothing is sent automatically."
      />
      <AlertsFeed events={events} filter={filter ?? "all"} />
    </div>
  );
}
