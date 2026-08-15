"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  function remind() {
    const names = unpaid.map((member) => member.name).join(", ");
    const message = reminderMessage({
      memberName: names || "friends",
      groupName,
      amount: formatRupees(amount),
      dueDate: formatDate(dueDate),
      upiId,
    });
    const firstPhone = unpaid.find((member) => member.phone)?.phone;
    window.open(whatsappShareUrl(message, firstPhone), "_blank");
  }

  return (
    <Button variant="secondary" size="icon" onClick={remind} aria-label="Reminder">
      <Bell />
    </Button>
  );
}
