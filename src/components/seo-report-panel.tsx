"use client";

import { useState } from "react";

type SearchConsoleRow = { query: string; page: string; clicks: number; impressions: number; ctr: number; position: number };
type SearchConsoleReport = { source: string; property: string; startDate: string; endDate: string; rows: SearchConsoleRow[] };

export function SeoReportPanel() {
  const [days, setDays] = useState("28");
  const [report, setReport] = useState<SearchConsoleReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadReport() {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/admin/seo/search-console?days=${days}`);
    const payload = await response.json() as { data?: SearchConsoleReport; error?: string };
    setLoading(false);
    if (!response.ok || !payload.data) { setError(payload.error ?? "无法读取 Google Search Console 数据。"); return; }
    setReport(payload.data);
  }

  return <section><h1>Google SEO 数据</h1><p>从 Google Search Console 实时读取自然搜索表现，服务账号密钥不会下发到浏览器。</p><div className="admin-form"><label>时间范围<select value={days} onChange={(event) => setDays(event.target.value)}><option value="7">最近 7 天</option><option value="28">最近 28 天</option><option value="90">最近 90 天</option></select></label><button className="cta" type="button" onClick={loadReport} disabled={loading}>{loading ? "正在同步…" : "同步 Google SEO 数据"}</button></div>{error && <p className="form-message">{error}</p>}{report && <div className="admin-table"><p>{report.source} · {report.property} · {report.startDate} 至 {report.endDate}</p>{report.rows.length ? report.rows.map((row) => <article key={`${row.query}-${row.page}`}><b>{row.query || "（未返回搜索词）"}</b><span>{row.page}</span><span>点击 {row.clicks} · 展现 {row.impressions} · CTR {(row.ctr * 100).toFixed(1)}% · 平均排名 {row.position.toFixed(1)}</span></article>) : <p>此时间段暂无可用的 Search Console 数据。</p>}</div>}</section>;
}
