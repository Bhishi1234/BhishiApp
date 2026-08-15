export function buildUpiPayUrl(input: {
  pa: string | null | undefined;
  pn?: string | null;
  amount: number | string;
  note: string;
}) {
  const pa = input.pa?.trim() ?? "";
  if (!pa) return null;
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const params = new URLSearchParams();
  params.set("pa", pa);
  params.set("pn", (input.pn?.trim() || "Bhishi").slice(0, 50));
  params.set("am", amount.toFixed(2));
  params.set("cu", "INR");
  params.set("tn", input.note.replace(/\s+/g, " ").trim().slice(0, 50));
  return `upi://pay?${params.toString()}`;
}

export function haptaUpiNote(groupName: string, cycleNumber: number) {
  const short = groupName.replace(/\s+/g, " ").trim().slice(0, 28);
  return `${short} M${cycleNumber}`;
}
