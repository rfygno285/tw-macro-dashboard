import fetch from "node-fetch";
import fs from "node:fs";

const url = "https://www.cbc.gov.tw/public/data/OpenData/WebF2.csv"; // 央行開放資料（示意）
const csv = await (await fetch(url)).text();

const lines = csv.trim().split(/\r?\n/);
const headers = lines[0].split(",").map(s => s.trim());
const rows = lines.slice(1).map(r => {
  const c = r.split(",").map(s => s.trim());
  return Object.fromEntries(headers.map((h, i) => [h, c[i]]));
});

// 嘗試不同欄名
const out = rows.map(d => {
  const date = new Date(d.Date || d["日期"] || d["date"]);
  const rate = Number(
    d["O/N Call Loan Rate"] ??
    d["隔夜拆款利率"] ??
    d["ONCallLoanRate"]
  );
  return (isFinite(date) && !Number.isNaN(rate))
    ? { date: date.toISOString().slice(0,10), taibir_on: rate }
    : null;
}).filter(Boolean);

fs.mkdirSync("docs/data", { recursive: true });
fs.writeFileSync("docs/data/taibir.json", JSON.stringify(out, null, 2));
console.log("✔ taibir.json updated:", out.length, "rows");
