"use client";

import { Bell } from "lucide-react";
import { useT } from "@/components/i18n/locale-provider";
import { formatDate, formatRupees } from "@/lib/format";
import { reminderMessage, whatsappShareUrl } from "@/lib/whatsapp";

export function ReminderButton({
  unpaid,
  groupName,
  amount,
  dueDate,
  upiId,
}: {
  unpaid: { name: string; phone: string | null }[];
  groupName: string;
  amount: number | string;
  dueDate: string;
  upiId?: string | null;
}) {
  const { t, locale } = useT();

  function remind() {
    const names = unpaid.map((member) => member.name).join(", ");
    const message = reminderMessage({
      memberName: names || "friends",
      groupName,
      amount: formatRupees(amount),
      dueDate: formatDate(dueDate, locale),
      upiId,
    });
    const firstPhone = unpaid.find((member) => member.phone)?.phone;
    window.open(whatsappShareUrl(message, firstPhone), "_blank");
  }

  return (
    <button
      type="button"
      onClick={remind}
      className="flex min-h-[4.5rem] w-full flex-col items-center justify-center gap-1.5 rounded-2xl bg-secondary/80 px-2 text-center text-sm font-semibold"
    >
      <Bell className="size-5" />
      {t("reminder")}
    </button>
  );
}
