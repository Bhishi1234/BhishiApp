"use client";

import { useState } from "react";
import { toast } from "sonner";
import { signOutAction } from "@/app/actions/auth";
import { updateProfileAction } from "@/app/actions/profile";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { useT } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import type { Profile } from "@/lib/types";

export function ProfileForm({
  profile,
  email,
  setup = false,
}: {
  profile: Profile;
  email: string | undefined;
  setup?: boolean;
}) {
  const { t, locale } = useT();
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = await updateProfileAction(formData);
    setPending(false);
    if (result.error) toast.error(result.error);
    else toast.success(t("profileSaved"));
  }

  async function copyId() {
    await navigator.clipboard.writeText(profile.id);
    toast.success("User ID copied");
  }

  const support = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;

  return (
    <div className="space-y-6">
      <LocaleSwitcher />

      <form action={onSubmit} className="space-y-4">
        {setup ? <input type="hidden" name="setup" value="1" /> : null}
        <input type="hidden" name="locale" value={locale} />
        <div className="space-y-2">
          <Label htmlFor="fullName">{t("name")}</Label>
          <Input id="fullName" name="fullName" defaultValue={profile.full_name ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{t("mobileNumber")}</Label>
          <Input
            id="phone"
            name="phone"
            inputMode="numeric"
            defaultValue={profile.phone ?? ""}
            placeholder="10-digit mobile number"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="upiId">{t("upiId")}</Label>
          <Input
            id="upiId"
            name="upiId"
            defaultValue={profile.upi_id ?? ""}
            placeholder="name@okicici"
          />
          <p className="text-xs text-muted-foreground">{t("noUpi")}</p>
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t("saving") : setup ? t("saveAndContinue") : t("saveProfile")}
        </Button>
      </form>

      <div className="rounded-2xl bg-card p-4 text-sm">
        <p className="text-muted-foreground">Member since</p>
        <p className="font-semibold">{formatDate(profile.created_at, locale)}</p>
        <p className="mt-3 text-muted-foreground">Internal user ID</p>
        <button type="button" onClick={copyId} className="mt-1 break-all text-left font-mono text-xs">
          {profile.id}
        </button>
      </div>

      {support ? (
        <Button asChild variant="outline" className="w-full">
          <a href={`https://wa.me/${support.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        </Button>
      ) : null}

      <form action={signOutAction}>
        <Button type="submit" variant="ghost" className="w-full">
          {t("signOut")}
        </Button>
      </form>
    </div>
  );
}
