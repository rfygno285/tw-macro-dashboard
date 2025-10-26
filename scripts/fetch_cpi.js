import fetch from "node-fetch";
import XLSX from "xlsx";
import fs from "node:fs";

// 建議使用「長期時序」xslx 直連（較穩定）。若失效，請改貼最新連結。
const CPI_URL =
  "https://ws.dgbas.gov.tw/Download.ashx?n=dGNpMS54bHN4&u=LzAwMS9VcGxvYWQvNDY0L3JlbGZpbGUvMTA4NjIvMjI5NDYxL3RjaTEueGxzeA==";

const ab = await (await fetch(CPI_URL)).arrayBuffer();
const wb = XLSX.read(ab, { type: "array" });
const sheet = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(sheet, { defval: null });

const pick = (o, keys) => keys.find(k => k in o);
const out = [];

for (const r of raw) {
  // 偵測年月欄位
  const hasYM = pick(r, ["Year", "年"]) && pick(r, ["Month", "月"]);
  const ymKey = pick(r, ["Year & month", "Year&month", "YearMonth", "年月", "期間"]);
  let y = null, m = null, date = null;

  if (hasYM) {
    y = Number(r[pick(r, ["Year", "年"])]);
    m = Number(r[pick(r, ["Month", "月"])]);
    if (y && m) date = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  } else if (ymKey) {
    const t = String(r[ymKey]).replace(/[年月\.]/g, "/").replace(/-|\s+/g, "/").split("/");
    y = Number(t[0]); m = Number(t[1]);
    if (y && m) date = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  } else if ("Date" in r) {
    date = new Date(r.Date).toISOString().slice(0, 10);
  }

  // 總指數欄位
  const idxKey = pick(r, ["General Index", "總指數", "CPI Index", "CPI"]);
  const cpi = idxKey ? Number(r[idxKey]) : null;

  if (date && cpi) out.push({ date, cpi_index: cpi });
}

fs.mkdirSync("docs/data", { recursive: true });
fs.writeFileSync("docs/data/cpi.json", JSON.stringify(out, null, 2));
console.log("✔ cpi.json updated:", out.length, "rows");
