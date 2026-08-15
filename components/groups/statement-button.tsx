"use client";

import { Button } from "@/components/ui/button";
import { formatDate, formatRupees } from "@/lib/format";
import type { Contribution, Cycle, Group, GroupMember } from "@/lib/types";

export function StatementButton({
  group,
  members,
  cycles,
  contributions,
}: {
  group: Group;
  members: GroupMember[];
  cycles: Cycle[];
  contributions: Contribution[];
}) {
  async function download() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`${group.name} — statement`, 14, 18);
    doc.setFontSize(10);
    doc.text(
      "Record-keeping only. This app does not collect or hold money.",
      14,
      26,
    );

    let y = 38;
    for (const member of members) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.text(member.display_name, 14, y);
      y += 6;
      doc.setFontSize(10);
      for (const cycle of cycles) {
        const row = contributions.find(
          (item) => item.member_id === member.id && item.cycle_id === cycle.id,
        );
        const line = `Round ${cycle.cycle_number} · ${formatDate(cycle.due_date)} · ${row?.status ?? "—"} · ${formatRupees(row?.amount_paid ?? 0)} / ${formatRupees(row?.amount_due ?? group.contribution_amount)}`;
        doc.text(line, 14, y);
        y += 5;
      }
      y += 6;
    }

    doc.save(`${group.name.replace(/\s+/g, "-")}-statement.pdf`);
  }

  return (
    <Button variant="outline" className="w-full" onClick={download}>
      Download PDF statement
    </Button>
  );
}
