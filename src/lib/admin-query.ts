import { NextRequest } from "next/server";

export const ADMIN_TIMEZONE = "Africa/Johannesburg";
export type DateRangePreset = "today" | "this_week" | "this_month" | "custom" | "all";

function numeric(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function zonedNowParts(now = new Date()) {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone: ADMIN_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const pick = (type: string) => Number(values.find((part) => part.type === type)?.value ?? 0);
  return { year: pick("year"), month: pick("month"), day: pick("day") };
}

function startOfAfricaDay(year: number, month: number, day: number) {
  // Africa/Johannesburg is permanently UTC+02:00; database timestamps stay in UTC.
  return new Date(Date.UTC(year, month - 1, day, -2, 0, 0, 0));
}

function parseDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? { year, month, day } : null;
}

export function getAdminQuery(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const preset = (params.get("range") ?? "this_month") as DateRangePreset;
  const range: DateRangePreset = ["today", "this_week", "this_month", "custom", "all"].includes(preset) ? preset : "this_month";
  const pageSize = numeric(params.get("pageSize"), 20, 1, 100);
  const page = numeric(params.get("page"), 1, 1, 100000);
  const q = (params.get("q") ?? "").trim().slice(0, 120);
  const parts = zonedNowParts();
  let from: Date | null = null;
  let to: Date | null = null;

  if (range === "today") {
    from = startOfAfricaDay(parts.year, parts.month, parts.day);
  } else if (range === "this_week") {
    const todayUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    const weekday = (todayUtc.getUTCDay() + 6) % 7;
    todayUtc.setUTCDate(todayUtc.getUTCDate() - weekday);
    from = startOfAfricaDay(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() + 1, todayUtc.getUTCDate());
  } else if (range === "this_month") {
    from = startOfAfricaDay(parts.year, parts.month, 1);
  } else if (range === "custom") {
    const start = parseDate(params.get("from"));
    const end = parseDate(params.get("to"));
    if (start) from = startOfAfricaDay(start.year, start.month, start.day);
    if (end) to = startOfAfricaDay(end.year, end.month, end.day + 1);
    if (from && to && to <= from) { from = null; to = null; }
  }

  return {
    page, pageSize, offset: (page - 1) * pageSize, q, range, from, to,
    fromDate: params.get("from") ?? "", toDate: params.get("to") ?? "",
  };
}

export function pagination(total: number, page: number, pageSize: number) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function validTrackingId(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8,100}$/.test(value) ? value : null;
}

export function safePath(value: unknown) {
  return typeof value === "string" && value.startsWith("/") ? value.slice(0, 300) : "/";
}
