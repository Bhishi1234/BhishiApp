import { notFound } from "next/navigation";
import { DeleteGroupButton } from "@/components/groups/delete-group-button";
import { SettingsForm } from "@/components/groups/settings-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getGroupBundle } from "@/lib/group-data";
import { parseLocale, t } from "@/lib/i18n";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getGroupBundle(id);
  if (!bundle) notFound();
  const locale = parseLocale(bundle.profile?.locale);

  return (
    <div className="px-5 py-6">
      <PageHeader
        backHref={`/groups/${id}`}
        backLabel={bundle.group.name}
        title={t(locale, "settingsTitle")}
        subtitle={t(locale, "settingsSubtitle")}
      />
      <SettingsForm
        groupId={id}
        canEdit={bundle.isAdmin}
        lateFeeNotes={bundle.settings?.late_fee_notes ?? ""}
        dropoutNotes={bundle.settings?.dropout_notes ?? ""}
        reminderDays={bundle.settings?.reminder_days_before ?? 3}
        selfServePaid={bundle.settings?.self_serve_paid !== false}
      />
      {bundle.isOwner ? (
        <Card className="mt-8 p-5">
          <h2 className="text-lg font-semibold">{t(locale, "deleteGroup")}</h2>
          <p className="mt-1 mb-4 text-sm leading-relaxed text-muted-foreground">
            {t(locale, "deleteGroupBody")}
          </p>
          <DeleteGroupButton groupId={id} groupName={bundle.group.name} />
        </Card>
      ) : null}
    </div>
  );
}
