// scripts/fetch_taibir.js
import fetch from "node-fetch";
import fs from "node:fs";

const OUT = "docs/data/taibir.json";
const URL = "https://www.cbc.gov.tw/public/data/OpenData/WebF2.csv"; // 央行隔拆利率（示意）

try {
  console.log("[TAIBIR] GET", URL);
  const resp = await fetch(URL);
  console.log("[TAIBIR] status =", resp.status, resp.statusText);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  const txt = await resp.text();
  if (!txt.trim()) throw new Error("empty response");

  // 處理 BOM
  const csv = txt.replace(/^\uFEFF/, "");
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(/,|;|\t/).map(s => s.trim());
  const rows = lines.slice(1).map(r => {
    const c = r.split(/,|;|\t/).map(s => s.trim());
    return Object.fromEntries(headers.map((h, i) => [h, c[i]]));
  });

  // 嘗試不同欄名
  const out = rows.map(d => {
    const dateStr = d.Date || d["日期"] || d["date"];
    const rateStr = d["O/N Call Loan Rate"] ?? d["隔夜拆款利率"] ?? d["ONCallLoanRate"];
    const date = dateStr ? new Date(dateStr) : null;
    const rate = rateStr != null ? Number(String(rateStr).replace(/[, ]/g, "")) : null;
    if (!date || Number.isNaN(date.getTime()) || rate == null || Number.isNaN(rate)) return null;
    return { date: date.toISOString().slice(0, 10), taibir_on: rate };
  }).filter(Boolean);

  fs.mkdirSync("docs/data", { recursive: true });
  fs.writeFileSync
