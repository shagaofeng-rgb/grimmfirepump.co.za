"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import type { Lead, NewsArticle, Product } from "@/lib/site-data";
import { SeoReportPanel } from "@/components/seo-report-panel";

type Tab = "leads" | "products" | "news" | "seo";
const tabLabel: Record<Tab, string> = { leads: "询盘线索", products: "产品管理", news: "新闻管理", seo: "SEO 数据" };

function AdminBrand() {
  return <div className="admin-brand"><Image src="/brand/grimm-pump-logo.png" alt="GRIMM PUMP" width={48} height={48} priority /><span><strong>GRIMM PUMP</strong><small>AFRICA · MANAGEMENT</small></span></div>;
}

export function AdminConsole({ configured }: { configured: boolean }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("leads");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    if (!response.ok) { setError((await response.json() as { error?: string }).error ?? "登录失败，请稍后再试。"); return; }
    setPassword(""); setLoggedIn(true); void load("leads");
  }

  async function load(next: Tab) {
    setTab(next); setError("");
    if (next === "seo") return;
    const response = await fetch(`/api/admin/${next}`);
    if (!response.ok) { setLoggedIn(false); setError("登录状态已失效，请重新登录。"); return; }
    const payload = await response.json() as { data: Lead[] | Product[] | NewsArticle[] };
    if (next === "leads") setLeads(payload.data as Lead[]);
    if (next === "products") setProducts(payload.data as Product[]);
    if (next === "news") setNews(payload.data as NewsArticle[]);
  }

  async function create(event: FormEvent<HTMLFormElement>, type: "products" | "news") {
    event.preventDefault(); setError("");
    const form = event.currentTarget;
    const response = await fetch(`/api/admin/${type}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
    if (!response.ok) { setError((await response.json() as { error?: string }).error ?? "保存失败，请稍后再试。"); return; }
    form.reset(); void load(type);
  }

  if (!configured) return <section className="admin-login-wrap"><div className="admin-login"><AdminBrand /><p className="admin-kicker">系统配置</p><h1>管理后台尚未启用</h1><p>请在生产环境中设置管理员账号、密码和会话密钥后重新部署。</p></div></section>;

  if (!loggedIn) return <section className="admin-login-wrap"><form className="admin-login" onSubmit={login}><AdminBrand /><p className="admin-kicker">安全登录</p><h1>非洲站中文管理后台</h1><p>仅限获授权的内部运营人员使用。</p><label>管理员账号<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label><label>管理员密码<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required /></label><button className="admin-primary" type="submit">进入后台 <span aria-hidden="true">→</span></button>{error && <p className="admin-form-message" role="alert">{error}</p>}</form></section>;

  return <div className="admin-workspace"><header className="admin-topbar"><AdminBrand /><div><span className="admin-user">管理员已登录</span><button className="admin-logout" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); setLoggedIn(false); }}>退出登录</button></div></header><div className="admin-layout"><aside className="admin-sidebar"><p>后台导航</p>{(["leads", "products", "news", "seo"] as Tab[]).map((item) => <button key={item} className={tab === item ? "selected" : ""} onClick={() => void load(item)}>{tabLabel[item]}</button>)}</aside><main className="admin-content"><div className="admin-content-heading"><p className="admin-kicker">GRIMM PUMP · AFRICA</p><h1>{tabLabel[tab]}</h1></div>{error && <p className="admin-form-message" role="alert">{error}</p>}{tab === "leads" && <section><p className="admin-intro">集中查看来自网站询盘表单的客户需求与联系方式。</p><div className="admin-table">{leads.length ? leads.map((lead) => <article key={lead.id}><div><b>{lead.name} · {lead.company}</b><span>{lead.country} · {lead.productInterest}</span></div><a href={`mailto:${lead.email}`}>{lead.email}</a><p>{lead.message}</p></article>) : <div className="admin-empty">暂时没有询盘线索。</div>}</div></section>}{tab === "products" && <section><p className="admin-intro">新增产品前请确认英文名称、分类和简介均适合对外发布。</p><form className="admin-form" onSubmit={(event) => void create(event, "products")}><label>产品名称<input name="name" required placeholder="例如：EDJ Fire Pump Set" /></label><label>产品分类<select name="category" defaultValue="Fire pump systems"><option>Fire pump systems</option><option>Water supply</option><option>Mobile pumping</option><option>Drainage</option></select></label><label>产品简介<textarea name="summary" required placeholder="简洁说明产品适用场景与配置特点" /></label><button className="admin-primary">新增并发布产品</button></form><div className="admin-table">{products.map((item) => <article key={item.id}><div><b>{item.name}</b><span>{item.category}</span></div><p>{item.summary}</p></article>)}</div></section>}{tab === "news" && <section><p className="admin-intro">自动任务每 3 小时检查一次可信 RSS 来源。未通过去重和相关性审核的内容不会自动发布。</p><button className="admin-primary" type="button" onClick={async () => { const response = await fetch("/api/admin/news/run", { method: "POST" }); const result = await response.json() as { error?: string }; setError(result.error ?? "新闻检查已执行，请查看审计记录。"); }}>立即执行新闻检查</button><form className="admin-form" onSubmit={(event) => void create(event, "news")}><label>新闻标题<input name="title" required placeholder="新闻标题" /></label><label>分类<input name="category" required placeholder="例如：Procurement guide" /></label><label>新闻摘要<textarea name="excerpt" required placeholder="新闻摘要；不得伪造事实或来源" /></label><button className="admin-primary">保存新闻草稿</button></form><div className="admin-table">{news.map((item) => <article key={item.id}><div><b>{item.title}</b><span>{item.category}</span></div><p>{item.excerpt}</p></article>)}</div></section>}{tab === "seo" && <SeoReportPanel />}</main></div></div>;
}
