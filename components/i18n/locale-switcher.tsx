"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateLocaleAction } from "@/app/actions/profile";
import { useT } from "@/components/i18n/locale-provider";
import { APP_LOCALES, type AppLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useT();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function choose(next: AppLocale) {
    if (next === locale || pending) return;
    setLocale(next);
    setPending(true);
    const result = await updateLocaleAction(next);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      setLocale(locale);
      return;
    }
    toast.success(t("localeSaved"));
    router.refresh();
  }

  const labels: Record<AppLocale, string> = {
    en: t("english"),
    hi: t("hindi"),
    mr: t("marathi"),
  };

  return (
    <div className={compact ? "" : "space-y-2"}>
      {compact ? null : (
        <p className="text-sm font-semibold text-foreground">{t("language")}</p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {APP_LOCALES.map((item) => (
          <button
            key={item}
            type="button"
            disabled={pending}
            onClick={() => choose(item)}
            className={cn(
              "h-11 rounded-xl text-sm font-semibold",
              locale === item
                ? "bg-primary text-white shadow-[0_8px_16px_rgba(37,99,235,0.25)]"
                : "bg-secondary text-foreground",
            )}
          >
            {labels[item]}
          </button>
        ))}
      </div>
    </div>
  );
}
