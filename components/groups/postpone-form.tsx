"use client";

import { useState } from "react";
import { toast } from "sonner";
import { postponeCycleAction } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/i18n/locale-provider";
import { addDays, localISODate } from "@/lib/dates";

export function PostponeForm({
  cycleId,
  groupId,
  currentDue,
}: {
  cycleId: string;
  groupId: string;
  currentDue: string;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const today = localISODate();
  const [due, setDue] = useState(currentDue > today ? addDays(currentDue, 7) : addDays(today, 7));
  const [note, setNote] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await postponeCycleAction({
      cycleId,
      groupId,
      newDue: due,
      note,
    });
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t("postponedToast"));
    setOpen(false);
  }

  return (
    <div className="mt-4">
      {open ? (
        <form onSubmit={save} className="space-y-3 rounded-2xl bg-secondary/70 p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{t("postponeHelp")}</p>
          <div className="space-y-2">
            <Label htmlFor="postpone-date">{t("postponeDate")}</Label>
            <Input
              id="postpone-date"
              type="date"
              min={today}
              value={due}
              onChange={(event) => setDue(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postpone-note">{t("postponeNote")}</Label>
            <Input
              id="postpone-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Ganesh, travel"
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t("saving") : t("postponeSubmit")}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
        </form>
      ) : (
        <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(true)}>
          {t("postponeMonth")}
        </Button>
      )}
    </div>
  );
}
