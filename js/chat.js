/* Котоши — чат с Момо: спрятан в аватар, открывается панелью поверх сцены (SSE через backend) */
"use strict";
(function(){
const $ = s => document.querySelector(s);
const msgs = $("#chatMsgs"), input = $("#chatInput"), send = $("#chatSend"),
      status = $("#chatStatus"),
      sugPhys = $("#sugPhys"), sugMind = $("#sugMind"),
      panel = $("#chatPanel"), fab = $("#momoFab"),
      closeBtn = $("#chatX"), studioMain = $("#studioMain");

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
    : '<span class="dot"></span>дремлет';
  status.classList.toggle("off", !v);
}

/* ---------- панель: аватар разворачивается в чат, ✕ сворачивает обратно ---------- */
function openChat(){
  panel.classList.add("open");
  studioMain.classList.add("chat-open");
  fab.setAttribute("aria-expanded", "true");
  msgs.scrollTop = msgs.scrollHeight;
  if (matchMedia("(min-width: 901px)").matches) input.focus();
}
function closeChat(){
  panel.classList.remove("open");
  studioMain.classList.remove("chat-open");
  fab.setAttribute("aria-expanded", "false");
}
fab.addEventListener("click", openChat);
closeBtn.addEventListener("click", closeChat);
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && panel.classList.contains("open")) closeChat();
});
KD.openChat = openChat;

function add(role, text){
  const el = document.createElement("div");
  el.className = "msg " + role;
  el.textContent = text;
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
  return el;
}

/* ---------- бабблы-подсказки: клик кладёт слова прямо в поле сообщения ----------
   физика — сакура, характер — матча; отправка одна — кнопкой у поля */
const SUG_PHYS = [
  "котёнок", "крупный кот (6 кг+)", "пожилой кот", "у нас два кота"
];
const SUG_MIND = [
  "пугливый — прячется", "энергичный — носится",
  "любит высоту", "точит когти о мебель", "скучает один дома"
];
function addToInput(txt){
  const cur = input.value.replace(/[;,\s]+$/, "");
  input.value = cur ? cur + "; " + txt : txt;
  input.focus();
}
function chipRow(host, items, cls){
  host.classList.add(cls);
  items.forEach(txt => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sug";
    b.textContent = txt;
    b.addEventListener("click", () => {
      addToInput(txt);
      b.classList.add("added");
      setTimeout(() => b.classList.remove("added"), 650);
    });
    host.appendChild(b);
  });
}
chipRow(sugPhys, SUG_PHYS, "sug-phys");
chipRow(sugMind, SUG_MIND, "sug-mind");

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
    /* панель сворачивается: сборку видно во всю сцену, Момо ждёт в аватаре */
    closeChat();
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
    add("sys", "Момо сейчас дремлет. Загляните чуть позже — он ответит, как проснётся.");
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
        add("sys", "Момо позвал человека — владелец магазина уже получил сообщение и скоро подключится.");
      }
    }
    setOnline(true);
  }catch(e){
    clearTimeout(watchdog);
    botEl.textContent = e.name === "AbortError"
      ? "Момо долго не отвечает — попробуйте чуть позже. 🐾"
      : "Момо не дозвался — попробуйте ещё раз через минутку. 🐾";
    setOnline(false);
  }
  busy = false; send.disabled = false;
}

send.addEventListener("click", () => ask());
input.addEventListener("keydown", e => { if (e.key === "Enter") ask(); });

/* приветствие ждёт в панели заранее; сервер проверяем при загрузке */
add("bot", "Мяу! Я Момо — консультант этого магазина. Расскажите о питомце — подсказками ниже или своими словами — и я подберу домик и соберу его прямо в сцене.");
health();
})();
