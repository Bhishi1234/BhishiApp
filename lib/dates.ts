export function parseISODate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function localISODate(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysUntil(value: string) {
  const due = parseISODate(value);
  const today = startOfToday();
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function isDueOrPast(value: string) {
  return daysUntil(value) <= 0;
}

export function addDays(iso: string, days: number) {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return localISODate(date);
}

export function addMonths(iso: string, months: number) {
  const date = parseISODate(iso);
  const day = date.getDate();
  date.setMonth(date.getMonth() + months);
  if (date.getDate() < day) date.setDate(0);
  return localISODate(date);
}

export function firstDrawDate(startDate: string, frequency: "monthly" | "weekly") {
  return frequency === "weekly" ? addDays(startDate, 7) : addMonths(startDate, 1);
}
