"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateSettingsAction } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SettingsForm({
  groupId,
  canEdit,
  lateFeeNotes,
  dropoutNotes,
  reminderDays,
}: {
  groupId: string;
  canEdit: boolean;
  lateFeeNotes: string;
  dropoutNotes: string;
  reminderDays: number;
}) {
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = await updateSettingsAction(formData);
    setPending(false);
    if (result.error) toast.error(result.error);
    else toast.success("Settings saved");
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />
      <div className="space-y-2">
        <Label htmlFor="lateFeeNotes">Late hapta notes</Label>
        <Textarea
          id="lateFeeNotes"
          name="lateFeeNotes"
          defaultValue={lateFeeNotes}
          disabled={!canEdit}
          placeholder="e.g. ₹50 after the 5th. The app will not collect this."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dropoutNotes">Drop-out / replacement notes</Label>
        <Textarea
          id="dropoutNotes"
          name="dropoutNotes"
          defaultValue={dropoutNotes}
          disabled={!canEdit}
          placeholder="e.g. A leaving member must find a replacement."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reminderDays">Remind this many days before due date</Label>
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
      {canEdit ? (
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving…" : "Save notes"}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">Only the organiser can edit these notes.</p>
      )}
    </form>
  );
}
