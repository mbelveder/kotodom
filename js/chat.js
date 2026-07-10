/* Котоши — чат с Момо: сайдбар конфигуратора (SSE через backend) */
"use strict";
(function(){
const $ = s => document.querySelector(s);
const msgs = $("#chatMsgs"), input = $("#chatInput"), send = $("#chatSend"),
      status = $("#chatStatus"), sugg = $("#chatSugg"),
      sugPhys = $("#sugPhys"), sugMind = $("#sugMind");

/* адрес API: ?api=… > config.js (свежий из репозитория) > localStorage.
   config.js важнее localStorage: иначе устаревший сохранённый адрес
   перекрывает только что запушенный туннель */
const qs = new URLSearchParams(location.search).get("api");
if (qs){ localStorage.setItem("kd_api", qs.replace(/\/+$/, "")); }
KD.API = (qs && qs.replace(/\/+$/, "")) || window.KOTOSHI_API || localStorage.getItem("kd_api") || "";

const history = [];   // {role, content}
let busy = false, online = false;
/* если сервер вообще недоступен (спит, туннель мёртв) — fetch() к нему может висеть
   бесконечно без единой ошибки; без этого таймаута индикатор "печатает…" не гаснет никогда */
const CHAT_STALL_MS = 25_000;

async function health(){
  if (!KD.API){ setOnline(false); return; }
  try{
    const r = await fetch(KD.API + "/api/health", { signal: AbortSignal.timeout(6000) });
    setOnline(r.ok);
  }catch(_){ setOnline(false); }
}
function setOnline(v){
  online = v;
  status.innerHTML = v
    ? '<span class="dot"></span>на связи'
    : '<span class="dot"></span>спит (сервер офлайн)';
  status.classList.toggle("off", !v);
}

function add(role, text){
  const el = document.createElement("div");
  el.className = "msg " + role;
  el.textContent = text;
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
  return el;
}

/* ---------- бабблы-подсказки: физика (сакура) + характер (матча) ---------- */
const SUG_PHYS = [
  "котёнок", "крупный кот (6 кг и больше)", "пожилой, бережём суставы", "у нас два кота"
];
const SUG_MIND = [
  "пугливый — любит прятаться", "энергичный — носится по дому",
  "наблюдатель — любит высоту", "точит когти о мебель", "скучает, пока никого нет"
];
const picked = new Set();
function chipRow(host, items, cls){
  host.classList.add(cls);
  items.forEach(txt => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sug";
    b.textContent = txt;
    b.addEventListener("click", () => {
      b.classList.toggle("on");
      b.classList.contains("on") ? picked.add(txt) : picked.delete(txt);
      sendBtn.classList.toggle("show", picked.size > 0);
    });
    host.appendChild(b);
  });
}
chipRow(sugPhys, SUG_PHYS, "sug-phys");
chipRow(sugMind, SUG_MIND, "sug-mind");

const sendBtn = document.createElement("button");
sendBtn.type = "button";
sendBtn.className = "sug-send";
sendBtn.textContent = "Подобрать домик 🐾";
sugg.appendChild(sendBtn);
sendBtn.addEventListener("click", () => {
  const extra = input.value.trim();
  if (!picked.size && !extra) return;
  let desc = [...picked].join("; ") + (extra ? (picked.size ? ". " : "") + extra : "");
  desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  if (!/[.!?]$/.test(desc)) desc += ".";
  desc += " Подберите, пожалуйста, подходящий домик.";
  input.value = "";
  collapseSugg();
  ask(desc);
});

/* после первой отправки подсказки сворачиваются в кнопку */
const toggleBtn = document.createElement("button");
toggleBtn.type = "button";
toggleBtn.className = "sug-toggle";
toggleBtn.textContent = "🐾 подсказки о питомце";
sugg.parentNode.insertBefore(toggleBtn, sugg.nextSibling);
function collapseSugg(){
  picked.clear();
  sugg.querySelectorAll(".sug.on").forEach(b => b.classList.remove("on"));
  sendBtn.classList.remove("show");
  sugg.classList.add("hidden");
  toggleBtn.classList.add("show");
}
toggleBtn.addEventListener("click", () => {
  sugg.classList.remove("hidden");
  toggleBtn.classList.remove("show");
});

/* ---------- предложение Момо: маркер [[BUILD:индекс:тип,…]] → кнопка ---------- */
const BUILD_RE = /\[\[BUILD:([^\]]*)\]\]/;
function parseBuild(full){
  const m = full.match(BUILD_RE);
  if (!m) return null;
  const cells = {};
  m[1].split(",").forEach(pair => {
    const [i, t] = pair.split(":").map(s => s.trim());
    if (/^\d+$/.test(i) && KD.MODULES[t]) cells[i] = t;
  });
  return Object.keys(cells).length ? cells : null;
}
function offerBuild(botEl, cells){
  const b = document.createElement("button");
  b.className = "msg-build";
  b.textContent = "🛠 Собрать в конфигураторе";
  b.addEventListener("click", () => {
    if (!KD.applyConfig || !KD.applyConfig(cells)) return;
    b.disabled = true;
    b.textContent = "Собрано — смотрите сцену";
    document.getElementById("sceneWrap").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  botEl.appendChild(b);
  msgs.scrollTop = msgs.scrollHeight;
}

/* маркеры убираем из текста; хвост вида «[[…» прячем на время стрима */
const stripMarkers = s => s.replace(/\[\[(ESCALATE|ATTACK)\]\]/g, "").replace(BUILD_RE, "");
const stripPartial = s => stripMarkers(s).replace(/\[\[[^\]]*$/, "");

async function ask(textOverride){
  const text = (textOverride || input.value).trim();
  if (!text || busy) return;
  if (!textOverride) input.value = "";
  add("user", text);
  history.push({ role: "user", content: text });

  if (!KD.API){
    add("sys", "Момо недоступен: backend не настроен (нет адреса API).");
    return;
  }
  busy = true; send.disabled = true;
  const botEl = add("bot", "");
  botEl.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';

  const ctrl = new AbortController();
  let watchdog;
  const armWatchdog = () => { clearTimeout(watchdog); watchdog = setTimeout(() => ctrl.abort(), CHAT_STALL_MS); };

  try{
    armWatchdog();
    const r = await fetch(KD.API + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: history.slice(-12),
        config: KD.configurator ? KD.configurator.summary() : ""
      }),
      signal: ctrl.signal
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = "", full = "";
    for(;;){
      armWatchdog();
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const ln of lines){
        if (!ln.startsWith("data: ")) continue;
        const data = ln.slice(6).trim();
        if (data === "[DONE]") continue;
        try{
          const j = JSON.parse(data);
          const d = j.choices && j.choices[0] && j.choices[0].delta;
          if (d && d.content){
            full += d.content;
            botEl.textContent = stripPartial(full).trimStart();
            msgs.scrollTop = msgs.scrollHeight;
          }
        }catch(_){}
      }
    }
    clearTimeout(watchdog);
    if (!full){ botEl.textContent = "…Момо задумался и промолчал. Попробуйте ещё раз."; }
    else {
      botEl.textContent = stripMarkers(full).trim();
      history.push({ role: "assistant", content: stripMarkers(full).trim() });
      const cells = parseBuild(full);
      if (cells) offerBuild(botEl, cells);
      // [[ATTACK]] намеренно без видимой пометки — атакующему знать не нужно
      if (full.includes("[[ESCALATE]]")){
        add("sys", "Момо позвал человека — владелец магазина получил уведомление в Telegram.");
      }
    }
    setOnline(true);
  }catch(e){
    clearTimeout(watchdog);
    botEl.textContent = e.name === "AbortError"
      ? "Момо долго не отвечает — сервер сейчас недоступен. Попробуйте чуть позже."
      : "Не получилось связаться с Момо. Проверьте, запущен ли сервер (server/run.sh).";
    setOnline(false);
  }
  busy = false; send.disabled = false;
}

send.addEventListener("click", () => ask());
input.addEventListener("keydown", e => { if (e.key === "Enter") ask(); });

/* сайдбар виден сразу — здороваемся и проверяем сервер при загрузке */
add("bot", "Мяу! Я Момо — консультант этого магазина. Расскажите о питомце — бабблами ниже или своими словами — и я подберу домик. Ну или спрашивайте про модули, цены и доставку.");
health();
})();
