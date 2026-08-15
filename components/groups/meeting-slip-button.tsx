"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/locale-provider";
import { formatDate, formatRupees } from "@/lib/format";
import type { GroupMember } from "@/lib/types";

export function MeetingSlipButton({
  groupName,
  cycleNumber,
  dueDate,
  poolAmount,
  haptaAmount,
  paid,
  due,
  eligible,
  alreadyWon,
  winnerName,
}: {
  groupName: string;
  cycleNumber: number;
  dueDate: string;
  poolAmount: number | string;
  haptaAmount: number | string;
  paid: string[];
  due: { name: string; lateDays: number }[];
  eligible: string[];
  alreadyWon: string[];
  winnerName: string | null;
}) {
  const { t, locale } = useT();

  async function download() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`${groupName} — meeting slip`, 14, 18);
    doc.setFontSize(10);
    doc.text(`Month ${cycleNumber} · due ${formatDate(dueDate, locale)}`, 14, 26);
    doc.text(`Pool ${formatRupees(poolAmount)} · hapta ${formatRupees(haptaAmount)} each`, 14, 32);
    doc.text("Record-keeping only. This app does not collect or hold money.", 14, 38);

    let y = 50;
    const block = (title: string, lines: string[]) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.text(title, 14, y);
      y += 6;
      doc.setFontSize(10);
      if (lines.length === 0) {
        doc.text("—", 14, y);
        y += 8;
        return;
      }
      for (const line of lines) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 14, y);
        y += 5;
      }
      y += 6;
    };

    block(
      "Paid",
      paid.length ? paid : ["None yet"],
    );
    block(
      "Still due",
      due.map((row) =>
        row.lateDays > 0 ? `${row.name} · ${row.lateDays} day(s) late` : row.name,
      ),
    );
    block("In the box (can still win)", eligible);
    block("Already received the pool", alreadyWon);
    if (winnerName) block("Winner this month", [winnerName]);

    doc.save(`${groupName.replace(/\s+/g, "-")}-month-${cycleNumber}-slip.pdf`);
  }

  return (
    <Button variant="outline" className="w-full" onClick={download}>
      {t("meetingSlip")}
    </Button>
  );
}
