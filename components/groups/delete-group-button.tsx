"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteGroupAction } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteGroupButton({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    const result = await deleteGroupAction(groupId, value);
    if (result?.error) {
      toast.error(result.error);
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" className="w-full border-destructive/30 text-destructive" onClick={() => setOpen(true)}>
        Delete this group
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-destructive/20 bg-red-50/70 p-4">
      <p className="text-sm leading-relaxed text-destructive">
        This removes the register for <strong>{groupName}</strong> — members, payments, and draws.
        Money already exchanged between people is not affected.
      </p>
      <div className="space-y-2">
        <Label htmlFor="confirmName">Type the group name to confirm</Label>
        <Input
          id="confirmName"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={groupName}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Keep group
        </Button>
        <Button
          type="button"
          className="bg-destructive text-white hover:bg-[#931b12]"
          disabled={pending || value.trim() !== groupName}
          onClick={remove}
        >
          {pending ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </div>
  );
}
