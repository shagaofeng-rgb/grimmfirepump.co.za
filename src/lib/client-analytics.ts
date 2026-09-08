"use client";

export type VisitorContext = {
  visitorId: string;
  sessionId: string;
  referrer: string | null;
  utm: Record<string, string>;
};

const VISITOR_KEY = "grimm_visitor_id";
const SESSION_KEY = "grimm_visit_session";
const SESSION_IDLE_MS = 30 * 60 * 1000;

function id() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function readJson(value: string | null) {
  try { return value ? JSON.parse(value) as { id?: string; lastSeen?: number } : null; } catch { return null; }
}

function safeReferrer() {
  if (!document.referrer) return null;
  try {
    const url = new URL(document.referrer);
    return `${url.origin}${url.pathname}`;
  } catch { return null; }
}

function utm() {
  const query = new URLSearchParams(window.location.search);
  return Object.fromEntries(["source", "medium", "campaign", "term", "content"].flatMap((name) => {
    const value = query.get(`utm_${name}`);
    return value ? [[name, value.slice(0, 160)]] : [];
  }));
}

export function getVisitorContext(): VisitorContext {
  let visitorId = localStorage.getItem(VISITOR_KEY);
  if (!visitorId) {
    visitorId = id();
    localStorage.setItem(VISITOR_KEY, visitorId);
    document.cookie = `grimm_visitor_id=${encodeURIComponent(visitorId)}; Path=/; Max-Age=34128000; SameSite=Lax; Secure`;
  }

  const existing = readJson(sessionStorage.getItem(SESSION_KEY));
  const now = Date.now();
  const sessionId = existing?.id && existing.lastSeen && now - existing.lastSeen < SESSION_IDLE_MS ? existing.id : id();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: sessionId, lastSeen: now }));
  return { visitorId, sessionId, referrer: safeReferrer(), utm: utm() };
}

export function trackSiteEvent(eventType: string, path = window.location.pathname, extras: Record<string, unknown> = {}) {
  const context = getVisitorContext();
  return fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({ path, eventType, ...context, ...extras }),
  });
}
