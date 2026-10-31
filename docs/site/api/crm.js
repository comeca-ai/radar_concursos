// Vercel serverless (Hobby/free). Sem dependências: JWT de service account via node:crypto.
// Modos: webhook (GROK_CRM_WEBHOOK_URL) > sheets (service account) > none (503).
const crypto = require("crypto");
const SHEET_ID = process.env.CRM_SHEET_ID || "1_0zMomqK23OO1W-9AT9rywkkuuZt1iUHeMw4jKmqSik";
const COLS = "status,marcado_em,fonte,municipio,orgao,objeto,valor_estimado,data_encerramento,modalidade,url_pncp,id_controle,notas,cnpj_orgao,ano,sequencial,prazo,vencedor,valor_homologado,data_resultado,fim_contrato".split(",");
const STATUS = ["Interessado", "Em proposta", "Enviado", "Descartado"];
const ORIGINS = /^https:\/\/radar-concursos[a-z0-9-]*\.vercel\.app$|^http:\/\/localhost(:\d+)?$/;

function creds() {
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key = process.env.GOOGLE_PRIVATE_KEY;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try { const j = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON); email = j.client_email; key = j.private_key; } catch (e) {}
  }
  return email && key ? { email, key: key.replace(/\\n/g, "\n") } : null;
}
function webhookUrl() {
  if (process.env.GROK_CRM_WEBHOOK_URL && !/^\[REDACTED\]$/i.test(process.env.GROK_CRM_WEBHOOK_URL)) return process.env.GROK_CRM_WEBHOOK_URL;
  if (process.env.GROK_CRM_WEBHOOK_URL_B64) {
    try { return Buffer.from(process.env.GROK_CRM_WEBHOOK_URL_B64, "base64").toString("utf8"); } catch (e) { return ""; }
  }
  return "";
}
const mode = () => (webhookUrl() ? "webhook" : creds() ? "sheets" : "none");

async function token(c) {
  const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url"), now = Math.floor(Date.now() / 1000);
  const unsigned = b64({ alg: "RS256", typ: "JWT" }) + "." + b64({ iss: c.email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  const jwt = unsigned + "." + crypto.createSign("RSA-SHA256").update(unsigned).sign(c.key, "base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" + jwt });
  const j = await r.json(); if (!j.access_token) throw new Error("auth: " + (j.error_description || j.error)); return j.access_token;
}
async function gs(tk, path, init = {}) {
  const r = await fetch("https://sheets.googleapis.com/v4/spreadsheets/" + SHEET_ID + path, { ...init, headers: { Authorization: "Bearer " + tk, "Content-Type": "application/json" } });
  const j = await r.json(); if (!r.ok) throw new Error("sheets: " + (j.error && j.error.message)); return j;
}
async function readRows(tk) {
  const v = (await gs(tk, "/values/A2:T")).values || [];
  return v.map((r, i) => ({ _row: i + 2, ...Object.fromEntries(COLS.map((c, k) => [c, r[k] ?? ""])) }));
}
async function sheetsWrite(body) {
  const tk = await token(creds()), have = await readRows(tk), byUrl = Object.fromEntries(have.map(r => [r.url_pncp, r]));
  const data = [], append = [];
  for (const row of body.rows) {
    const cur = byUrl[row.url_pncp];
    if (body.action === "remove") { if (cur) data.push({ range: "A" + cur._row, values: [["Descartado"]] }); continue; }
    if (body.action === "update_status" && cur) { data.push({ range: "A" + cur._row, values: [[row.status]] }); continue; }
    const vals = COLS.map(c => row[c] ?? (cur ? cur[c] : ""));
    cur ? data.push({ range: `A${cur._row}:T${cur._row}`, values: [vals] }) : append.push(vals);
  }
  if (data.length) await gs(tk, "/values:batchUpdate", { method: "POST", body: JSON.stringify({ valueInputOption: "USER_ENTERED", data }) });
  if (append.length) await gs(tk, "/values/A:T:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS", { method: "POST", body: JSON.stringify({ values: append }) });
  return { updated: data.length, appended: append.length };
}
async function webhook(body) {
  const h = { "Content-Type": "application/json" };
  if (process.env.GROK_CRM_WEBHOOK_HEADER) { const [k, ...v] = process.env.GROK_CRM_WEBHOOK_HEADER.split(":"); h[k.trim()] = v.join(":").trim(); }
  else if (process.env.GROK_CRM_WEBHOOK_KEY) h.Authorization = "Bearer " + process.env.GROK_CRM_WEBHOOK_KEY;
  const r = await fetch(webhookUrl(), { method: "POST", headers: h, body: JSON.stringify({ ...body, sheet_id: SHEET_ID, columns: COLS }) });
  if (!r.ok) throw new Error("webhook HTTP " + r.status); return { forwarded: true };
}
function clean(b) {
  if (!b || !["upsert", "update_status", "remove"].includes(b.action) || !Array.isArray(b.rows) || !b.rows.length || b.rows.length > 200) return null;
  const rows = b.rows.filter(r => r && /^https:\/\/pncp\.gov\.br\//.test(r.url_pncp || "")).map(r => {
    const o = {}; for (const c of COLS) if (r[c] != null) o[c] = String(r[c]).slice(0, 2000);
    if (o.status && !STATUS.includes(o.status)) o.status = "Interessado"; return o;
  });
  return rows.length ? { action: b.action, rows, source: String(b.source || "").slice(0, 200) } : null;
}
module.exports = async (req, res) => {
  const o = req.headers.origin || "";
  if (ORIGINS.test(o)) res.setHeader("Access-Control-Allow-Origin", o);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type"); res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  const m = mode();
  try {
    if (req.method === "GET") {
      let rows = [];
      if (creds() && req.query && req.query.rows !== "0") rows = (await readRows(await token(creds()))).map(({ _row, ...r }) => r).filter(r => r.url_pncp);
      return res.status(200).json({ ok: true, mode: m, rows });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
    if (m === "none") return res.status(503).json({ error: "crm_not_configured" });
    let b = req.body; if (typeof b === "string") try { b = JSON.parse(b); } catch (e) { b = null; }
    const body = clean(b); if (!body) return res.status(400).json({ error: "invalid_payload" });
    const out = m === "webhook" ? await webhook(body) : await sheetsWrite(body);
    return res.status(200).json({ ok: true, mode: m, ...out });
  } catch (e) { return res.status(502).json({ error: "crm_write_failed", mode: m, detail: String(e.message || e).slice(0, 200) }); }
};
