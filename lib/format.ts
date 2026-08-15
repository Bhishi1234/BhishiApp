import { parseISODate } from "@/lib/dates";
import { dateLocale, parseLocale, type AppLocale } from "@/lib/i18n";

export function formatRupees(amount: number | string | null | undefined) {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatDate(
  value: string | Date | null | undefined,
  locale: AppLocale | string = "en",
) {
  if (!value) return "—";
  const date =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10)) && value.length <= 10
      ? parseISODate(value)
      : typeof value === "string"
        ? new Date(value)
        : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(dateLocale(parseLocale(locale)), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDayMonth(value: string | null | undefined, locale: AppLocale | string = "en") {
  if (!value) return "—";
  const date = parseISODate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(dateLocale(parseLocale(locale)), {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function digitsOnly(phone: string) {
  return phone.replace(/\D/g, "");
}

export function indianMobile(phone: string | null | undefined) {
  const digits = digitsOnly(phone ?? "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function formatPhone(phone: string | null | undefined) {
  if (!phone) return "—";
  const digits = digitsOnly(phone);
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

export function groupTypeLabel(type: string) {
  if (type === "lucky_draw") return "Lucky Draw";
  if (type === "bidding") return "Bidding";
  if (type === "loan") return "Loan";
  return type;
}

export function groupTypeHindi(type: string) {
  if (type === "lucky_draw") return "चिठ्ठी भिशी";
  if (type === "bidding") return "लिलाव भिशी";
  if (type === "loan") return "कर्ज भिशी";
  return "";
}
