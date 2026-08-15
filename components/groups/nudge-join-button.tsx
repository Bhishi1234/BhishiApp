"use client";

import { useT } from "@/components/i18n/locale-provider";
import { joinAppMessage, whatsappShareUrl } from "@/lib/whatsapp";

export function NudgeJoinButton({
  name,
  phone,
  groupName,
}: {
  name: string;
  phone: string | null;
  groupName: string;
}) {
  const { t } = useT();

  function nudge() {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const message = joinAppMessage({
      memberName: name,
      groupName,
      link: `${site}/signup`,
    });
    window.open(whatsappShareUrl(message, phone), "_blank");
  }

  return (
    <button
      type="button"
      onClick={nudge}
      className="mt-3 w-full rounded-xl bg-secondary px-3 py-2 text-sm font-semibold"
    >
      {t("nudgeJoin")}
    </button>
  );
}
