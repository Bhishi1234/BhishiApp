import { dateLocale, parseLocale, type AppLocale } from "@/lib/i18n";

export const IST_ZONE = "Asia/Kolkata";

function istParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

/** datetime-local value meaning that clock time in India. */
export function toIstInput(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const p = istParts(date);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Parse a datetime-local string as Indian Standard Time. */
export function istInputToIso(local: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) {
    throw new Error("Pick a date and time");
  }
  return new Date(`${local}:00+05:30`).toISOString();
}

export function formatIstDateTime(value: string | Date | null | undefined, locale: AppLocale | string = "en") {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  const text = new Intl.DateTimeFormat(dateLocale(parseLocale(locale)), {
    timeZone: IST_ZONE,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${text} IST`;
}

export function nowIstLabel(locale: AppLocale | string = "en") {
  return formatIstDateTime(new Date(), locale);
}

export function defaultIstWindow() {
  const open = toIstInput(new Date());
  const close = toIstInput(new Date(Date.now() + 60 * 60 * 1000));
  return { open, close };
}
