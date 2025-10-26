// scripts/fetch_unemployment.js
import fetch from "node-fetch";
import XLSX from "xlsx";
import fs from "node:fs";

const OUT = "docs/data/unemployment.json";
// ⛳ TODO：換成 DGBAS「總失業率（月）」xlsx 直連
const UNEMP_URL = "<<<PASTE_DGBAS_UNEMPLOYMENT_XLSX_URL_HERE>>>";

try {
  if (!UNEMP_URL || UNEMP_URL.includes("<<<")) {
    console.warn("[UNEMP] URL not set — skipping");
    fs.mkdirSync("docs/data", { recursive: true });
    fs.writeFileSync(OUT, "[]");
  } else {
    console.log("[UNEMP] GET", UNEMP_URL);
    const resp = await fetch(UNEMP_URL);
    console.log("[UNEMP] status =", resp.status, resp.statusText);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const ab = await resp.arrayBuffer();
    const wb = XLSX.read(ab, { type: "array" });
    console.log("[UNEMP] sheets =", wb.SheetNames);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(sheet, { defval: null });
    console.log("[UNEMP] first row keys =", raw[0] ? Object.keys(raw[0]) : []);

    const pick = (o, keys) => keys.find(k => k in o);
    const out = [];

    for (const r of raw) {
      const hasYM = pick(r, ["Year","年"]) && pick(r, ["Month","月"]);
      const ymKey = pick(r, ["Year & month","Year&month","YearMonth","年月","期間"]);
      let y=null,m=null,date=null;

      if (hasYM) {
        y = Number(r[pick(r, ["Year","年"])]);
        m = Number(r[pick(r, ["Month","月"])]);
        if (y && m) date = new Date(Date.UTC(y, m-1, 1)).toISOString().slice(0,10);
      } else if (ymKey) {
        const t = String(r[ymKey]).replace(/[年月\.]/g,"/").replace(/-|\s+/g,"/").split("/");
        y = Number(t[0]); m = Number(t[1]);
        if (y && m) date = new Date(Date.UTC(y, m-1, 1)).toISOString().slice(0,10);
      } else if ("Date" in r) {
        date = new Date(r.Date).toISOString().slice(0,10);
      }

      const rateKey = pick(r, [
        "Total unemployment rate","total unemployment rate",
        "Unemployment rate","unemployment rate","失業率"
      ]);
      const rate = rateKey ? Number(String(r[rateKey]).replace(/[%\s,]/g,"")) : null;

      if (date && rate != null && !Number.isNaN(rate)) out.push({ date, unemployment_rate: rate });
    }

    fs.mkdirSync("docs/data", { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
    console.log(`✔ unemployment.json updated: ${out.length} rows`);
  }
} catch (err) {
  console.error("[fetch_unemployment] ERROR:", err?.message || err);
  fs.mkdirSync("docs/data", { recursive: true });
  fs.writeFileSync(OUT, "[]");
  process.exitCode = 0;
}
