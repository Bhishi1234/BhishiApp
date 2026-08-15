import { notFound } from "next/navigation";
import { DeleteGroupButton } from "@/components/groups/delete-group-button";
import { SettingsForm } from "@/components/groups/settings-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getGroupBundle } from "@/lib/group-data";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getGroupBundle(id);
  if (!bundle) notFound();

  return (
    <div className="px-5 py-6">
      <PageHeader
        backHref={`/groups/${id}`}
        backLabel={bundle.group.name}
        title="Group settings"
        subtitle="Notes for your members. The app does not charge late fees or move money."
      />
      <SettingsForm
        groupId={id}
        canEdit={bundle.isAdmin}
        lateFeeNotes={bundle.settings?.late_fee_notes ?? ""}
        dropoutNotes={bundle.settings?.dropout_notes ?? ""}
        reminderDays={bundle.settings?.reminder_days_before ?? 3}
      />
      {bundle.isOwner ? (
        <Card className="mt-8 p-5">
          <h2 className="text-lg font-semibold">Delete group</h2>
          <p className="mt-1 mb-4 text-sm leading-relaxed text-muted-foreground">
            Only the organiser can remove this register. Payments already made between
            people are not reversed.
          </p>
          <DeleteGroupButton groupId={id} groupName={bundle.group.name} />
        </Card>
      ) : null}
    </div>
  );
}
