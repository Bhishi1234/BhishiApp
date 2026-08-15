import { AlertsFeed } from "@/components/alerts/alerts-feed";
import { PageHeader } from "@/components/layout/page-header";
import { getAlerts, getCurrentProfile } from "@/lib/group-data";
import { parseLocale, t } from "@/lib/i18n";

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const [{ profile }, events] = await Promise.all([getCurrentProfile(), getAlerts()]);
  const locale = parseLocale(profile?.locale);

  return (
    <div className="px-5 py-6">
      <PageHeader
        kicker="सूचना"
        title={t(locale, "alertsTitle")}
        subtitle={t(locale, "alertsSubtitle")}
      />
      <AlertsFeed events={events} filter={filter ?? "all"} />
    </div>
  );
}
