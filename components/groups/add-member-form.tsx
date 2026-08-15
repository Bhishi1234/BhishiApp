"use client";

import { useState } from "react";
import { addMemberAction } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddMemberForm({ groupId }: { groupId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await addMemberAction(groupId, name, phone);
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setName("");
    setPhone("");
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="memberName">Name</Label>
        <Input
          id="memberName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Ramesh"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="memberPhone">Phone (optional)</Label>
        <Input
          id="memberPhone"
          inputMode="numeric"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="98765 43210"
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Adding…" : "Add member"}
      </Button>
    </form>
  );
}
