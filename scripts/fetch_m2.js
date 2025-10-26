// scripts/fetch_m2.js
import fetch from "node-fetch";
import XLSX from "xlsx";
import fs from "node:fs";

const OUT = "docs/data/m2.json";
// ⛳ TODO：換成 央行「M1B/M2」的 xls/xlsx 直連（你偏好月末或日平均）
const MONEY_URL = "<<<PASTE_CBC_M1B_M2_XLSX_URL_HERE>>>";

try {
  if (!MONEY_URL || MONEY_URL.includes("<<<")) {
    console.warn("[M2] URL not set — skipping");
    fs.mkdirSync("docs/data", { recursive: true });
    fs.writeFileSync(OUT, "[]");
  } else {
    console.log("[M2] GET", MONEY_URL);
    const resp = await fetch(MONEY_URL);
    console.log("[M2] status =", resp.status, resp.statusText);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const ab = await resp.arrayBuffer();
    const wb = XLSX.read(ab, { type: "array" });
    console.log("[M2] sheets =", wb.SheetNames);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(sheet, { defval: null });
    console.log("[M2] first row keys =", raw[0] ? Object.keys(raw[0]) : []);

    const pick = (o, keys) => keys.find(k => k in o);
    const findM2Key = (obj) => Object.keys(obj).find(k => /\bM2\b/i.test(k));

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

      const k = findM2Key(r);
      const m2 = k ? Number(String(r[k]).replace(/[, ]/g,"")) : null;

      if (date && m2 != null && !Number.isNaN(m2)) out.push({ date, m2 });
    }

    fs.mkdirSync("docs/data", { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
    console.log(`✔ m2.json updated: ${out.length} rows`);
  }
} catch (err) {
  console.error("[fetch_m2] ERROR:", err?.message || err);
  fs.mkdirSync("docs/data", { recursive: true });
  fs.writeFileSync(OUT, "[]");
  process.exitCode = 0;
}
