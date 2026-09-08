"use client";

import Image from "next/image";
import { useState, type FormEvent, type ReactNode } from "react";
import { SeoReportPanel } from "@/components/seo-report-panel";

type Tab = "overview" | "products" | "categories" | "news" | "blog" | "automation" | "media" | "leads" | "visitors" | "forms" | "analytics" | "seo" | "pages" | "downloads" | "accounts" | "logs" | "settings";
type Row = Record<string, unknown>;
type PageInfo = { page: number; pageSize: number; total: number; totalPages: number };

const labels: Record<Tab, string> = { overview: "数据概览", products: "产品管理", categories: "产品分类", news: "新闻管理", blog: "Blog 文章管理", automation: "新闻自动化", media: "媒体资源", leads: "客户询盘", visitors: "访问详情", forms: "表单管理", analytics: "访问分析", seo: "SEO 管理", pages: "页面管理", downloads: "下载资料", accounts: "账号与权限", logs: "操作日志", settings: "系统设置" };
const descriptions: Partial<Record<Tab, string>> = {
  products: "按更新时间查询和维护产品目录。", categories: "按更新时间查询分类、URL 标识与排序。", news: "按发布时间查询新闻和行业洞察。", blog: "按发布时间查询 Blog 文章。", automation: "按执行时间查询新闻自动化审计记录。", media: "按创建时间查询已托管媒体。", leads: "按创建时间、状态与归属筛选真实客户询盘。", visitors: "查看匿名访客的会话、路径和已关联询盘。", forms: "按更新时间查询表单接收设置。", analytics: "按访问时间查看真实页面访问汇总。", pages: "按更新时间查询页面与 SEO 配置。", downloads: "按创建时间查询公开下载资料。", accounts: "按创建时间查询内部账号。", logs: "按操作时间查询审计记录。", settings: "按更新时间查询系统运行参数。",
};
const modules: Partial<Record<Tab, string>> = { categories: "categories", automation: "automation", media: "media", forms: "forms", pages: "pages", downloads: "downloads", analytics: "analytics", accounts: "accounts", logs: "logs", settings: "settings" };
const pageSizes: Record<Tab, number> = { overview: 20, products: 20, categories: 20, news: 20, blog: 20, automation: 50, media: 20, leads: 25, visitors: 25, forms: 20, analytics: 20, seo: 20, pages: 20, downloads: 20, accounts: 20, logs: 50, settings: 20 };

function Brand() { return <div className="admin-brand"><Image src="/brand/grimm-pump-logo.png" alt="GRIMM PUMP" width={48} height={48}/><span><strong>GRIMM PUMP</strong><small>AFRICA · MANAGEMENT</small></span></div>; }
function toSlug(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function date(value: unknown) { return value ? new Intl.DateTimeFormat("zh-CN", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" }).format(new Date(String(value))) : "—"; }
function summary(row: Row) { return Object.entries(row).filter(([key]) => !["id", "name", "title", "path", "email", "action", "content", "message"].includes(key)).slice(0, 4).map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`).join(" · "); }

export function AdminConsole({ configured }: { configured: boolean }) {
  const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [logged, setLogged] = useState(false);
  const [tab, setTab] = useState<Tab>("overview"); const [data, setData] = useState<Row[]>([]); const [overview, setOverview] = useState<Record<string, number>>({});
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const [q, setQ] = useState(""); const [range, setRange] = useState("this_month"); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(20); const [pageInfo, setPageInfo] = useState<PageInfo>({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [journey, setJourney] = useState<Row | null>(null);

  async function login(event: FormEvent) {
    event.preventDefault(); setError("");
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "登录失败"); return; }
    setPassword(""); setLogged(true); void load("overview", { page: 1 });
  }

  function endpoint(next: Tab) {
    return next === "overview" ? "/api/admin/overview" : next === "products" ? "/api/admin/products" : next === "news" ? "/api/admin/news" : next === "blog" ? "/api/admin/blog" : next === "leads" ? "/api/admin/leads" : next === "visitors" ? "/api/admin/visitors" : modules[next] ? `/api/admin/management/${modules[next]}` : null;
  }

  async function load(next: Tab, overrides: Partial<{ page: number; pageSize: number; q: string; range: string; from: string; to: string }> = {}) {
    setTab(next); setError(""); setJourney(null);
    const nextPage = overrides.page ?? page; const nextSize = overrides.pageSize ?? pageSize; const nextQ = overrides.q ?? q; const nextRange = overrides.range ?? range; const nextFrom = overrides.from ?? from; const nextTo = overrides.to ?? to;
    setPage(nextPage); setPageSize(nextSize);
    const target = endpoint(next); if (!target) return;
    const params = new URLSearchParams({ page: String(nextPage), pageSize: String(nextSize), q: nextQ, range: nextRange });
    if (nextFrom) params.set("from", nextFrom); if (nextTo) params.set("to", nextTo);
    setLoading(true);
    try {
      const response = await fetch(`${target}?${params}`, { cache: "no-store" }); const result = await response.json();
      if (!response.ok) { setError(result.error ?? "无法读取数据"); return; }
      if (next === "overview") setOverview(result.data ?? {}); else { setData(result.data ?? []); setPageInfo(result.pagination ?? { page: nextPage, pageSize: nextSize, total: (result.data ?? []).length, totalPages: 1 }); }
    } catch { setError("网络异常，暂时无法读取数据。"); } finally { setLoading(false); }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const resource = tab === "products" ? "/api/admin/products" : tab === "news" ? "/api/admin/news" : modules[tab] ? `/api/admin/management/${modules[tab]}` : null; if (!resource) return;
    const response = await fetch(resource, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }); const result = await response.json();
    if (!response.ok) { setError(result.error ?? "保存失败"); return; } event.currentTarget.reset(); void load(tab, { page: 1 });
  }
  async function saveLead(id: string, form: HTMLFormElement) {
    const response = await fetch("/api/admin/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...Object.fromEntries(new FormData(form)) }) }); const result = await response.json();
    if (!response.ok) { setError(result.error ?? "保存跟进失败"); return; } void load("leads");
  }
  async function deleteRecord(id: string) {
    const resource = tab === "leads" ? "/api/admin/leads" : tab === "products" ? "/api/admin/products" : tab === "news" ? "/api/admin/news" : tab === "blog" ? "/api/admin/blog" : modules[tab] ? `/api/admin/management/${modules[tab]}` : "";
    if (!resource || !window.confirm(tab === "leads" ? "确认隐藏该线索？数据会保留在恢复记录中。" : "确认删除该记录？")) return;
    const response = await fetch(`${resource}?id=${encodeURIComponent(id)}`, { method: "DELETE" }); const result = await response.json();
    if (!response.ok) { setError(result.error ?? "删除失败"); return; } void load(tab);
  }
  async function showJourney(visitorId: string) {
    setLoading(true); setError("");
    try { const response = await fetch(`/api/admin/visitors?id=${encodeURIComponent(visitorId)}`); const result = await response.json(); if (!response.ok) { setError(result.error ?? "无法读取访问详情"); return; } setJourney(result.data ?? null); }
    catch { setError("无法读取访问详情。"); } finally { setLoading(false); }
  }

  const formFields: Partial<Record<Tab, ReactNode>> = {
    products: <><label>产品名称<input name="name" required/></label><label>产品分类<select name="category"><option>Fire pump systems</option><option>Water supply</option><option>Mobile pumping</option><option>Drainage</option></select></label><label>产品简介<textarea name="summary" required/></label></>,
    news: <><label>新闻标题<input name="title" required/></label><label>分类<input name="category" required/></label><label>新闻摘要<textarea name="excerpt" required/></label></>,
    categories: <><label>分类名称<input name="name" required onBlur={event => { const slug = event.currentTarget.form?.elements.namedItem("slug") as HTMLInputElement | null; if (slug && !slug.value) slug.value = toSlug(event.currentTarget.value); }}/></label><label>URL 标识<input name="slug" required placeholder="fire-pump-systems"/></label><label>说明<textarea name="description"/></label></>,
    media: <><label>资源名称<input name="title" required/></label><label>资源网址<input name="url" type="url" required/></label><label>替代文字<input name="alt"/></label><label>类型<select name="type"><option value="image">图片</option><option value="document">文档</option><option value="video">视频</option></select></label></>,
    forms: <><label>表单名称<input name="name" required/></label><label>接收邮箱<input name="email" type="email" required/></label></>,
    pages: <><label>页面路径<input name="path" placeholder="/about" required/></label><label>页面名称<input name="label" required/></label><label>SEO 标题<input name="title"/></label><label>SEO 描述<textarea name="description"/></label></>,
    downloads: <><label>资料名称<input name="title" required/></label><label>公开下载网址<input name="url" type="url" required/></label><label>说明<textarea name="description"/></label></>,
    settings: <><label>设置键<input name="key" required placeholder="company.whatsapp"/></label><label>设置值<textarea name="value" required/></label></>,
  };

  if (!configured) return <section className="admin-login-wrap"><div className="admin-login"><Brand/><h1>管理后台尚未启用</h1><p>生产环境尚未配置管理员账号。</p></div></section>;
  if (!logged) return <section className="admin-login-wrap"><form className="admin-login" onSubmit={login}><Brand/><p className="admin-kicker">安全登录</p><h1>非洲站中文管理后台</h1><p>仅限获得授权的内部运营人员使用。</p><label>管理员账号<input value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" required/></label><label>管理员密码<input value={password} onChange={event => setPassword(event.target.value)} type="password" autoComplete="current-password" required/></label><button className="admin-primary">进入后台 →</button>{error && <p className="admin-form-message">{error}</p>}</form></section>;

  const showDataTools = tab !== "seo";
  return <div className="admin-workspace"><header className="admin-topbar"><Brand/><button className="admin-logout" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); setLogged(false); }}>退出登录</button></header><div className="admin-layout"><aside className="admin-sidebar"><p>网站运营后台</p>{(Object.keys(labels) as Tab[]).map(item => <button key={item} className={tab === item ? "selected" : ""} onClick={() => { setPage(1); setPageSize(pageSizes[item]); void load(item, { page: 1, pageSize: pageSizes[item] }); }}>{labels[item]}</button>)}</aside><main className="admin-content"><div className="admin-content-heading"><p className="admin-kicker">GRIMM PUMP AFRICA · OPERATIONS</p><h1>{labels[tab]}</h1></div>{descriptions[tab] && <p className="admin-intro">{descriptions[tab]}</p>}{error && <p className="admin-form-message">{error}</p>}
    {showDataTools && <section className="admin-querybar" aria-label="数据筛选"><label>关键词<input value={q} onChange={event => setQ(event.target.value)} placeholder="名称、路径、来源或状态"/></label><label>时间范围<select value={range} onChange={event => setRange(event.target.value)}><option value="today">今天</option><option value="this_week">本周</option><option value="this_month">本月</option><option value="custom">自定义</option><option value="all">全部时间</option></select></label>{range === "custom" && <><label>开始日期<input type="date" value={from} onChange={event => setFrom(event.target.value)}/></label><label>结束日期<input type="date" value={to} onChange={event => setTo(event.target.value)}/></label></>}<button className="admin-primary" onClick={() => void load(tab, { page: 1, q, range, from, to })}>查询</button><span className="admin-timezone">按南非时间（Africa/Johannesburg）统计</span></section>}
    {tab === "overview" ? <div className="admin-metrics">{Object.entries(overview).map(([key, value]) => <article key={key}><b>{value}</b><span>{{ products: "产品", categories: "分类", news: "新闻", leads: "询盘", views: "页面浏览", visitors: "访客", sessions: "会话", conversions: "提交转化", downloads: "下载资料" }[key] ?? key}</span></article>)}</div> : tab === "seo" ? <SeoReportPanel/> : <>{formFields[tab] && <form className="admin-form" onSubmit={create}>{formFields[tab]}<button className="admin-primary">保存</button></form>}
    <div className="admin-table">{loading ? <div className="admin-empty">正在读取真实数据…</div> : tab === "leads" && data.length ? data.map((row, index) => <form className="admin-lead-card" key={String(row.id ?? index)} onSubmit={event => { event.preventDefault(); void saveLead(String(row.id), event.currentTarget); }}><div className="admin-lead-heading"><div><b>{String(row.name ?? "未命名客户")}</b><span>{String(row.company ?? "—")} · {String(row.country ?? "—")} · {String(row.email ?? "—")}</span></div><span className="admin-score">{String(row.productInterest ?? "一般询盘")}</span></div><p>{String(row.message ?? "未填写需求内容")}</p><span className="admin-lead-meta">{String(row.sourcePage ?? "网站表单")} · {date(row.createdAt)}</span>{typeof row.visitorId === "string" && <button type="button" className="admin-link-button" onClick={() => void showJourney(String(row.visitorId))}>查看该客户全部访问路径</button>}<div className="admin-lead-grid"><label>跟进状态<select name="status" defaultValue={String(row.status ?? "new")}><option value="new">新询盘</option><option value="contacted">已联系</option><option value="qualified">已判定</option><option value="quoted">已报价</option><option value="closed">已成交 / 关闭</option><option value="spam">垃圾线索</option><option value="archived">已归档</option></select></label><label>意向等级<select name="priority" defaultValue={String(row.priority ?? "unrated")}><option value="A">A 高意向</option><option value="B">B 中意向</option><option value="C">C 低意向</option><option value="unrated">未判断</option></select></label><label>销售负责人<input name="salesOwner" defaultValue={String(row.salesOwner ?? "")}/></label><label>内部备注<textarea name="internalNote" defaultValue={String(row.internalNote ?? "")}/></label></div><div className="admin-row-actions"><button className="admin-primary">保存跟进</button><button type="button" className="admin-danger" onClick={() => void deleteRecord(String(row.id))}>隐藏线索</button></div></form>) : tab === "visitors" && data.length ? data.map((row, index) => <article key={String(row.id ?? index)}><div><b>访客 {String(row.id).slice(0, 10)}…</b><span>首次：{date(row.firstSeenAt)} · 最近：{date(row.lastSeenAt)} · 会话 {String(row.sessions ?? 0)} · 事件 {String(row.events ?? 0)} · 最近页面 {String(row.lastPath ?? "—")}</span></div><button className="admin-link-button" onClick={() => void showJourney(String(row.id))}>查看访问详情</button></article>) : data.length ? data.map((row, index) => <article key={String(row.id ?? row.key ?? index)}><div><b>{String(row.name ?? row.title ?? row.path ?? row.email ?? row.action ?? row.key ?? "记录")}</b><span>{summary(row)}</span></div>{!["analytics", "logs", "automation"].includes(tab) && <button className="admin-danger" type="button" onClick={() => void deleteRecord(String(row.id ?? row.key))}>删除</button>}</article>) : <div className="admin-empty">该筛选范围内暂时没有数据。</div>}</div>
    {tab !== "overview" && tab !== "seo" && <nav className="admin-pagination" aria-label="分页"><span>共 {pageInfo.total} 条</span><label>每页<select value={pageSize} onChange={event => void load(tab, { page: 1, pageSize: Number(event.target.value) })}>{[20, 25, 50, 100].map(size => <option key={size}>{size}</option>)}</select></label><button disabled={page <= 1 || loading} onClick={() => void load(tab, { page: page - 1 })}>上一页</button><span>{pageInfo.page} / {pageInfo.totalPages}</span><button disabled={page >= pageInfo.totalPages || loading} onClick={() => void load(tab, { page: page + 1 })}>下一页</button></nav>}</>}
    {journey && <section className="admin-journey" aria-live="polite"><div className="admin-journey-heading"><div><p className="admin-kicker">匿名访客详情</p><h2>完整访问路径</h2></div><button className="admin-danger" onClick={() => setJourney(null)}>关闭</button></div><p>首次访问：{date((journey.profile as Row | null)?.firstSeenAt)} · 最近访问：{date((journey.profile as Row | null)?.lastSeenAt)}</p><h3>会话</h3><ol>{((journey.sessions as Row[] | undefined) ?? []).map(session => <li key={String(session.id)}>{date(session.startedAt)}：{String(session.entryPath)} → {String(session.exitPath)}</li>)}</ol><h3>页面与事件时间线</h3><ol>{((journey.events as Row[] | undefined) ?? []).map(event => <li key={String(event.id)}>{date(event.createdAt)} · {String(event.eventType)} · {String(event.path)}</li>)}</ol><h3>关联询盘</h3>{((journey.leads as Row[] | undefined) ?? []).length ? <ol>{(journey.leads as Row[]).map(lead => <li key={String(lead.id)}>{String(lead.name)} · {String(lead.company)} · {String(lead.status)} · {date(lead.createdAt)}</li>)}</ol> : <p>该匿名访客尚未提交可关联的询盘。</p>}</section>}</main></div></div>;
}
