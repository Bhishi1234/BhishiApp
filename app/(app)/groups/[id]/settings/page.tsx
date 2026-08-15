import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SettingsForm } from "@/components/groups/settings-form";
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
      <Link href={`/groups/${id}`} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold">
        <ArrowLeft className="size-4" /> {bundle.group.name}
      </Link>
      <h1 className="text-3xl font-bold">Settings</h1>
      <p className="mt-2 text-muted-foreground">
        These notes are for your group. The app does not enforce late fees or drop-outs.
      </p>
      <div className="mt-5">
        <SettingsForm
          groupId={id}
          canEdit={bundle.isAdmin}
          lateFeeNotes={bundle.settings?.late_fee_notes ?? ""}
          dropoutNotes={bundle.settings?.dropout_notes ?? ""}
          reminderDays={bundle.settings?.reminder_days_before ?? 3}
        />
      </div>
    </div>
  );
}
