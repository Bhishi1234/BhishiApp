"use client";

import { useState } from "react";
import { toast } from "sonner";
import { requestHandsAction } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useT } from "@/components/i18n/locale-provider";

export function RequestHandsForm({
  groupId,
  currentHands,
  maxHands,
}: {
  groupId: string;
  currentHands: number;
  maxHands: number;
}) {
  const { t } = useT();
  const options = Array.from({ length: Math.max(0, maxHands - currentHands) }, (_, i) => currentHands + i + 1);
  const [value, setValue] = useState(String(options[0] ?? currentHands + 1));
  const [pending, setPending] = useState(false);

  if (options.length === 0) return null;

  async function submit() {
    setPending(true);
    const result = await requestHandsAction(groupId, Number(value));
    setPending(false);
    if (result.error) toast.error(result.error);
    else toast.success(t("requestSent"));
  }

  return (
    <Card className="p-5">
      <p className="text-sm font-semibold">{t("requestHands")}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("requestHandsHelp")}</p>
      <div className="mt-3 space-y-1.5">
        <Label htmlFor="want-hands">{t("handsWanted")}</Label>
        <Select id="want-hands" value={value} onChange={(event) => setValue(event.target.value)}>
          {options.map((n) => (
            <option key={n} value={n}>
              {t("handsUnit", { n })}
            </option>
          ))}
        </Select>
      </div>
      <Button className="mt-3 w-full" disabled={pending} onClick={submit}>
        {pending ? t("saving") : t("requestHandsSubmit")}
      </Button>
    </Card>
  );
}
