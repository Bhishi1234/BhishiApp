"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateSettingsAction } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/components/i18n/locale-provider";

export function SettingsForm({
  groupId,
  canEdit,
  lateFeeNotes,
  dropoutNotes,
  reminderDays,
  selfServePaid,
}: {
  groupId: string;
  canEdit: boolean;
  lateFeeNotes: string;
  dropoutNotes: string;
  reminderDays: number;
  selfServePaid: boolean;
}) {
  const { t } = useT();
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = await updateSettingsAction(formData);
    setPending(false);
    if (result.error) toast.error(result.error);
    else toast.success(t("settingsSaved"));
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />
      <div className="space-y-2">
        <Label htmlFor="lateFeeNotes">{t("lateFeeNotes")}</Label>
        <Textarea
          id="lateFeeNotes"
          name="lateFeeNotes"
          defaultValue={lateFeeNotes}
          disabled={!canEdit}
          placeholder="e.g. ₹50 after the 5th. The app will not collect this."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dropoutNotes">{t("dropoutNotes")}</Label>
        <Textarea
          id="dropoutNotes"
          name="dropoutNotes"
          defaultValue={dropoutNotes}
          disabled={!canEdit}
          placeholder="e.g. A leaving member must find a replacement."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reminderDays">{t("reminderDays")}</Label>
        <Input
          id="reminderDays"
          name="reminderDays"
          type="number"
          min={0}
          max={28}
          defaultValue={reminderDays}
          disabled={!canEdit}
        />
      </div>
      <label className="flex items-start gap-3 rounded-2xl bg-secondary/70 p-4">
        <input
          type="checkbox"
          name="selfServePaid"
          value="true"
          defaultChecked={selfServePaid}
          disabled={!canEdit}
          className="mt-1 size-4 accent-[#2563eb]"
        />
        <span>
          <span className="block text-sm font-semibold">{t("selfServePaid")}</span>
          <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
            {t("selfServePaidHelp")}
          </span>
        </span>
      </label>
      {canEdit ? (
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t("saving") : t("saveNotes")}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">{t("onlyOrganiserNotes")}</p>
      )}
    </form>
  );
}
