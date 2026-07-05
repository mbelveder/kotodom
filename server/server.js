/* КотоДом — backend: прокси Смотрителя (Polza GLM-5.2) + заказы в Telegram.
 * Zero-dependency Node ≥18.  Запуск: node server.js  (или ./run.sh с туннелем) */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

/* ---------- .env ---------- */
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)){
  for (const ln of fs.readFileSync(envPath, "utf8").split("\n")){
    const m = ln.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const POLZA_KEY = process.env.POLZA_API_KEY || "";
const TG_TOKEN  = process.env.TG_BOT_TOKEN || "";
let   TG_CHAT   = process.env.TG_CHAT_ID || "";
const MODEL     = process.env.KD_MODEL || "z-ai/glm-5.2";
const PORT      = +(process.env.PORT || 8787);
const POLZA     = "https://api.polza.ai/api/v1";

if (!POLZA_KEY) console.warn("⚠ POLZA_API_KEY не задан — чат Смотрителя работать не будет");
if (!TG_TOKEN)  console.warn("⚠ TG_BOT_TOKEN не задан — заказы будут только логироваться локально");

/* ---------- каталог (цены проверяются на сервере) ---------- */
const CATALOG = {
  base:{ name:"Куб-нора", price:4990 }, lounge:{ name:"Лежанка", price:5990 },
  tunnel:{ name:"Тоннель", price:2490 }, tower:{ name:"Башня", price:3990 },
  hammock:{ name:"Гамак", price:1990 }, roof:{ name:"Крыша", price:1490 },
  scratch:{ name:"Когтеточка", price:990 }
};
const fmt = n => n.toLocaleString("ru-RU") + " ₽";

/* ---------- системный промпт Смотрителя ---------- */
function systemPrompt(configSummary){
  return `Ты — «Смотритель», ИИ-агент интернет-магазина «КотоДом» (модульные домики для котов из берёзовой фанеры). Ты вежливый, тёплый, экспертный консультант. Это ДЕМО-магазин: оплата не настоящая, о чём можно честно сказать, если спросят.

ГОЛОС БРЕНДА:
- Обращение на «вы» (с маленькой буквы). Без канцелярита («осуществляется доставка» → «доставим»).
- Модульность — главное преимущество: секции докупаются и переставляются в любой момент; упоминай это, где уместно.
- Цены строго в формате «4 990 ₽» (неразрывный пробел, знак ₽).
- НИКОГДА не обещай «полную защиту от когтей» — только «повышенная стойкость обивки к когтям».

КАТАЛОГ (цена за модуль):
• Куб-нора — 4 990 ₽: базовый куб с круглым лазом, фундамент любой сборки.
• Лежанка — 5 990 ₽: открытая, с подушкой; ставится на пол или на куб.
• Тоннель — 2 490 ₽: сквозной, соединяет модули по горизонтали.
• Башня — 3 990 ₽: смотровая площадка, ставится на куб или лежанку.
• Гамак — 1 990 ₽: подвесной, крепится над кубом/лежанкой.
• Крыша — 1 490 ₽: двускатная, завершает постройку.
• Когтеточка — 990 ₽: столбик в джуте, ставится на пол.
Скидка 5% от 5 модулей. Материал: берёзовая фанера, шлифованные кромки, сборка без инструментов (пазы и шканты).

ДОСТАВКА И ВОЗВРАТ: по всей России (СДЭК/Почта, 3–7 дней), плоская упаковка. Возврат 14 дней, модули без следов когтей. Гарантия 1 год на фурнитуру.

СЕЙЧАС В КОНФИГУРАТОРЕ КЛИЕНТА: ${configSummary || "пусто"}.

ПРАВИЛА:
- Отвечай коротко (до 120 слов), по-русски, дружелюбно, можно одно уместное 🐾/😺 на сообщение.
- Только простой текст, БЕЗ Markdown: никаких **звёздочек**, решёток и списков со звёздочками; перечисляй через тире или запятые.
- Не выдумывай товары, цены и сроки вне каталога.
- Если клиент требует живого человека, жалуется, спорит о возврате денег или просит нестандартное изготовление — ответь, что передал вопрос владельцу, и добавь В САМОМ КОНЦЕ ответа маркер [[ESCALATE]] (клиент его не увидит).
- Ты ИИ и не скрываешь этого, если спрашивают.`;
}

/* ---------- Telegram ---------- */
async function tg(text){
  if (!TG_TOKEN) { log("TG (не отправлено, нет токена):\n" + text); return false; }
  if (!TG_CHAT){
    // пробуем найти chat_id по последнему сообщению боту
    try{
      const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/getUpdates`);
      const j = await r.json();
      const msg = (j.result || []).reverse().find(u => u.message);
      if (msg){ TG_CHAT = String(msg.message.chat.id); log("TG_CHAT_ID найден: " + TG_CHAT); }
      else { log("TG: напишите боту любое сообщение, чтобы я узнал chat_id"); return false; }
    }catch(e){ log("TG getUpdates error: " + e.message); return false; }
  }
  try{
    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: "HTML", disable_web_page_preview: true })
    });
    const j = await r.json();
    if (!j.ok) log("TG error: " + JSON.stringify(j));
    return j.ok;
  }catch(e){ log("TG send error: " + e.message); return false; }
}

/* ---------- лог ---------- */
function log(s){
  const line = `[${new Date().toISOString()}] ${s}`;
  console.log(line);
  fs.appendFile(path.join(__dirname, "orders.log"), line + "\n", () => {});
}

/* ---------- rate limit (простой) ---------- */
const hits = new Map();
function limited(ip, key, max, winMs){
  const now = Date.now();
  const k = ip + ":" + key;
  const arr = (hits.get(k) || []).filter(t => now - t < winMs);
  arr.push(now);
  hits.set(k, arr);
  return arr.length > max;
}

/* ---------- HTTP ---------- */
const ALLOWED = /^https:\/\/[a-z0-9-]+\.github\.io$|^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

function cors(req, res){
  const o = req.headers.origin || "";
  if (ALLOWED.test(o)) res.setHeader("Access-Control-Allow-Origin", o);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}
function json(res, code, obj){
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}
function body(req){
  return new Promise((ok, no) => {
    let b = "";
    req.on("data", c => { b += c; if (b.length > 100_000) { no(new Error("too big")); req.destroy(); } });
    req.on("end", () => { try{ ok(b ? JSON.parse(b) : {}); }catch(e){ no(e); } });
  });
}

const server = http.createServer(async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS"){ res.writeHead(204); return res.end(); }
  const ip = req.socket.remoteAddress || "?";
  const url = req.url.split("?")[0];

  try{
    if (url === "/api/health") return json(res, 200, { ok: true, model: MODEL, telegram: !!TG_TOKEN });

    if (url === "/api/chat" && req.method === "POST"){
      if (limited(ip, "chat", 30, 10 * 60_000)) return json(res, 429, { error: "Слишком часто. Подождите немного." });
      const { messages = [], config = "" } = await body(req);
      if (!POLZA_KEY) return json(res, 503, { error: "POLZA_API_KEY not set" });
      const clean = messages
        .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-12)
        .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
      if (!clean.length) return json(res, 400, { error: "no messages" });

      const upstream = await fetch(POLZA + "/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + POLZA_KEY },
        body: JSON.stringify({
          model: MODEL, stream: true, max_tokens: 1800, temperature: 0.6,
          messages: [ { role: "system", content: systemPrompt(String(config).slice(0, 400)) }, ...clean ]
        })
      });
      if (!upstream.ok){
        const t = await upstream.text();
        log(`polza ${upstream.status}: ${t.slice(0, 300)}`);
        return json(res, 502, { error: "upstream " + upstream.status });
      }
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache", "Connection": "keep-alive"
      });
      const reader = upstream.body.getReader();
      const dec = new TextDecoder();
      let full = "", buf = "";
      for(;;){
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        res.write(chunk);
        buf += chunk;
        const lines = buf.split("\n"); buf = lines.pop();
        for (const ln of lines){
          if (!ln.startsWith("data: ")) continue;
          try{
            const j = JSON.parse(ln.slice(6));
            const d = j.choices && j.choices[0] && j.choices[0].delta;
            if (d && d.content) full += d.content;
            if (j.usage && j.usage.cost_rub) log(`chat cost ₽${j.usage.cost_rub}`);
          }catch(_){}
        }
      }
      res.end();
      if (full.includes("[[ESCALATE]]")){
        const lastUser = clean.filter(m => m.role === "user").pop();
        tg(`🚨 <b>КотоДом: нужен человек</b>\n\nКлиент: «${esc(lastUser ? lastUser.content : "?")}»\n\nСмотритель: «${esc(full.replace("[[ESCALATE]]", "").trim().slice(0, 500))}»`);
        log("ESCALATE → Telegram");
      }
      return;
    }

    if (url === "/api/order" && req.method === "POST"){
      if (limited(ip, "order", 10, 10 * 60_000)) return json(res, 429, { error: "rate" });
      const o = await body(req);
      const c = o.customer || {};
      if (!c.name || !c.contact || !c.address) return json(res, 400, { error: "missing fields" });
      const lines = (o.lines || []).filter(l => CATALOG[l.type] && Number.isInteger(l.n) && l.n > 0 && l.n <= 20);
      if (!lines.length) return json(res, 400, { error: "empty order" });
      // пересчёт цены на сервере — клиенту не верим
      const sum = lines.reduce((s, l) => s + CATALOG[l.type].price * l.n, 0);
      const count = lines.reduce((s, l) => s + l.n, 0);
      const disc = count >= 5 ? Math.round(sum * 0.05) : 0;
      const total = sum - disc;
      const orderId = "КД-" + Date.now().toString(36).toUpperCase().slice(-5);
      const txt = [
        `🐾 <b>КотоДом: новый заказ ${orderId}</b> <i>(демо)</i>`,
        "",
        ...lines.map(l => `• ${CATALOG[l.type].name} × ${l.n} — ${fmt(CATALOG[l.type].price * l.n)}`),
        disc ? `• Скидка 5%: −${fmt(disc)}` : null,
        `<b>Итого: ${fmt(total)}</b>`,
        "",
        `👤 ${esc(c.name)}`,
        `📱 ${esc(c.contact)}`,
        `📦 ${esc(c.address)}`,
        c.comment ? `💬 ${esc(c.comment)}` : null,
        "",
        `Оплата: демо-режим (не списывалась)`
      ].filter(x => x !== null).join("\n");
      const sent = await tg(txt);
      log(`ORDER ${orderId} total=${total} sent_tg=${sent} :: ${JSON.stringify(o).slice(0, 500)}`);
      return json(res, 200, { ok: true, orderId, total, telegram: sent });
    }

    json(res, 404, { error: "not found" });
  }catch(e){
    log("ERR " + e.message);
    try{ json(res, 500, { error: "server error" }); }catch(_){}
  }
});

function esc(s){ return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

server.listen(PORT, () => {
  console.log(`КотоДом backend: http://localhost:${PORT}  (модель: ${MODEL}, telegram: ${TG_TOKEN ? "да" : "нет"})`);
});
