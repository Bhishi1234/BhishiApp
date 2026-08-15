"use client";

import { useState } from "react";
import { toast } from "sonner";
import { leaveGroupAction, replaceMemberAction } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/i18n/locale-provider";

export function LeaveGroupButton({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function leave() {
    setPending(true);
    const result = await leaveGroupAction(groupId);
    setPending(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t("leftToast"));
  }

  return (
    <>
      <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => setOpen(true)}>
        {t("leaveGroup")}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-5">
            <h3 className="text-xl font-bold">{t("leaveGroup")}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("leaveConfirm", { name: groupName })}
            </p>
            <div className="mt-5 space-y-2">
              <Button className="w-full" disabled={pending} onClick={leave}>
                {pending ? t("saving") : t("leaveGroup")}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function ReplaceMemberForm({
  memberId,
  groupId,
}: {
  memberId: string;
  groupId: string;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await replaceMemberAction({
      memberId,
      groupId,
      displayName: name,
      phone,
    });
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t("replacedToast"));
    setOpen(false);
    setName("");
    setPhone("");
  }

  return (
    <div className="mt-3">
      {open ? (
        <form onSubmit={onSubmit} className="space-y-3 rounded-2xl bg-secondary/70 p-3">
          <p className="text-sm leading-relaxed text-muted-foreground">{t("replaceHelp")}</p>
          <div className="space-y-2">
            <Label htmlFor={`replace-name-${memberId}`}>{t("replaceName")}</Label>
            <Input
              id={`replace-name-${memberId}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`replace-phone-${memberId}`}>{t("replacePhone")}</Label>
            <Input
              id={`replace-phone-${memberId}`}
              inputMode="numeric"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t("saving") : t("replaceSubmit")}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
        </form>
      ) : (
        <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(true)}>
          {t("replaceMember")}
        </Button>
      )}
    </div>
  );
}
