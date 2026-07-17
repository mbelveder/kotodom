/* Котоши — чат с Момо: спрятан в аватар, открывается панелью поверх сцены (SSE через backend) */
"use strict";
(function(){
const $ = s => document.querySelector(s);
const msgs = $("#chatMsgs"), input = $("#chatInput"), send = $("#chatSend"),
      status = $("#chatStatus"), sugg = $("#chatSugg"), sugHide = $("#sugHide"),
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
/* первый байт стрима на здоровой сети приходит за секунды; 10 секунд полной
   тишины после заголовков — признак сети, где SSE буферизуется целиком */
const FIRST_BYTE_MS = 10_000;
let sseBroken = false; // сеть «съедает» стрим — до конца визита ходим без него

/* адрес из config.js мог устареть в кэше браузера или Pages (быстрый туннель
   периодически меняется): при сбое тянем свежий config.js с самого сайта
   (same-origin, мимо кэша) и, если адрес сменился, переключаемся на него.
   Иначе на «чужом» компьютере Момо молчит, пока кэш не протухнет */
async function refreshApi(){
  if (qs) return false; // адрес задан явно через ?api= — не перекрываем
  try{
    const r = await fetch(`config.js?fresh=${Date.now()}`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const m = (await r.text()).match(/KOTOSHI_API\s*=\s*"([^"]+)"/);
    const fresh = m && m[1].replace(/\/+$/, "");
    if (fresh && fresh !== KD.API){
      KD.API = fresh;
      localStorage.setItem("kd_api", fresh);
      return true;
    }
  }catch(_){}
  return false;
}

async function ping(){
  try{
    const r = await fetch(KD.API + "/api/health", { signal: AbortSignal.timeout(6000) });
    return r.ok;
  }catch(_){ return false; }
}
async function health(){
  if (!KD.API){ setOnline(false); return; }
  let ok = await ping();
  if (!ok && await refreshApi()) ok = await ping();
  setOnline(ok);
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
  if (KD.hideSay) KD.hideSay(); // независимая реплика рядом с открытым чатом путает
  /* на телефоне обе панели — шторки снизу: две сразу не помещаются */
  if (KD.closePresets && matchMedia("(max-width: 900px)").matches) KD.closePresets();
  msgs.scrollTop = msgs.scrollHeight;
  /* preventScroll: поле ещё едет в панели из-за правого края — без него браузер
     доскролливал страницу к полю посреди transition, и сцена дёргалась */
  if (matchMedia("(min-width: 901px)").matches) input.focus({ preventScroll: true });
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
KD.closeChat = closeChat;

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
  "любит высоту", "точит когти о мебель"
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

/* «скрыть» сворачивает подсказки; вернуть — маленькой кнопкой над полем ввода */
const sugToggle = document.createElement("button");
sugToggle.type = "button";
sugToggle.className = "sug-toggle";
sugToggle.textContent = "🐾 подсказки";
sugg.parentNode.insertBefore(sugToggle, sugg.nextSibling);
const hideSugg = () => { sugg.classList.add("hidden"); sugToggle.classList.add("show"); };
sugHide.addEventListener("click", hideSugg);
sugToggle.addEventListener("click", () => {
  sugg.classList.remove("hidden");
  sugToggle.classList.remove("show");
});
/* после первого отправленного сообщения подсказки сворачиваем сами — в переписке
   место дорогое. Один раз: дальше посетитель сам управляет ими кнопкой «подсказки» */
let suggCollapsed = false;
function collapseHintsOnce(){
  if (suggCollapsed) return;
  suggCollapsed = true;
  hideSugg();
}

/* ---------- предложение Момо: маркер [[BUILD:индекс:тип,…]] → кнопка ---------- */
const BUILD_RE = /\[\[BUILD:([^\]]*)\]\]/;
function parseBuild(full){
  const m = full.match(BUILD_RE);
  if (!m) return null;
  const cells = {};
  let conflict = false;
  /* модель иногда даёт двум разным модулям один и тот же индекс (например,
     оставляет старый гамак в ячейке 8 и тут же ставит туда новую башню) —
     без этой проверки второе значение молча стирает первое в объекте cells,
     и клиент теряет модуль, даже не зная об этом. Оставляем первое значение
     (обычно это уже существующий модуль, который клиент не просил убирать)
     и отдельно сообщаем о конфликте, вместо того чтобы тихо его потерять. */
  m[1].split(",").forEach(pair => {
    const [i, t] = pair.split(":").map(s => s.trim());
    if (!(/^\d+$/.test(i) && KD.MODULES[t])) return;
    if (Object.prototype.hasOwnProperty.call(cells, i)){
      if (cells[i] !== t) conflict = true;
      return;
    }
    cells[i] = t;
  });
  return Object.keys(cells).length ? { cells, conflict } : null;
}
function offerBuild(botEl, build){
  const b = document.createElement("button");
  b.className = "msg-build";
  b.textContent = "🛠 Собрать в конструкторе домиков";
  b.addEventListener("click", () => {
    if (!KD.applyConfig || !KD.applyConfig(build.cells)) return;
    b.disabled = true;
    b.textContent = "Собрано — смотрите сцену";
    /* чат остаётся открытым: сборка видна рядом, разговор продолжается */
  });
  botEl.appendChild(b);
  if (build.conflict){
    add("sys", "Момо перепутал ячейки — предложил два модуля в одно место. Оставили тот, что был раньше; если что-то не так, передвиньте модули вручную.");
  }
  msgs.scrollTop = msgs.scrollHeight;
}

/* маркеры убираем из текста; хвост вида «[[…» прячем на время стрима.
   � — апстрим иногда рвёт utf-8 внутри токена и присылает
   символы-заменители прямо в дельтах; вычищаем, чтобы не показывать «��» */
const stripMarkers = s => s.replace(/\[\[(ESCALATE|ATTACK)\]\]/g, "").replace(BUILD_RE, "").replace(/�+/g, "");
const stripPartial = s => stripMarkers(s).replace(/\[\[[^\]]*$/, "");

async function ask(textOverride){
  const text = (textOverride || input.value).trim();
  if (!text || busy) return;
  if (!textOverride) input.value = "";
  add("user", text);
  history.push({ role: "user", content: text });
  collapseHintsOnce();

  if (!KD.API){
    add("sys", "Момо сейчас дремлет. Загляните чуть позже — он ответит, как проснётся.");
    return;
  }
  busy = true; send.disabled = true;
  const botEl = add("bot", "");
  botEl.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
  const payload = extra => JSON.stringify(Object.assign({
    messages: history.slice(-12),
    config: KD.configurator ? KD.configurator.cellsSummary() : ""
  }, extra));
  const finish = full => {
    botEl.textContent = stripMarkers(full).trim();
    history.push({ role: "assistant", content: stripMarkers(full).trim() });
    const build = parseBuild(full);
    if (build) offerBuild(botEl, build);
    // [[ATTACK]] намеренно без видимой пометки — атакующему знать не нужно
    if (full.includes("[[ESCALATE]]")){
      add("sys", "Момо позвал человека — владелец магазина уже получил сообщение и скоро подключится.");
    }
  };

  let done = false;
  /* попытка 1: обычный стрим (SSE) — если сеть его не «съедает» */
  const ctrl = new AbortController();
  let watchdog, gotHeaders = false, sawBytes = false;
  const armWatchdog = ms => { clearTimeout(watchdog); watchdog = setTimeout(() => ctrl.abort(), ms); };
  if (!sseBroken) try{
    armWatchdog(CHAT_STALL_MS);
    const r = await fetch(KD.API + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload(),
      signal: ctrl.signal
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    gotHeaders = true;
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = "", full = "";
    const takeLine = ln => {
      if (!ln.startsWith("data: ")) return;
      const data = ln.slice(6).trim();
      if (data === "[DONE]") return;
      try{
        const j = JSON.parse(data);
        const d = j.choices && j.choices[0] && j.choices[0].delta;
        if (d && d.content){
          full += d.content;
          botEl.textContent = stripPartial(full).trimStart();
          msgs.scrollTop = msgs.scrollHeight;
        }
      }catch(_){}
    };
    for(;;){
      /* до первого байта ждём недолго: тишина после заголовков — буферизация */
      armWatchdog(sawBytes ? CHAT_STALL_MS : FIRST_BYTE_MS);
      const { done: eof, value } = await reader.read();
      if (eof) break;
      sawBytes = true;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      lines.forEach(takeLine);
    }
    /* дожимаем декодер и последнюю строку без завершающего \n */
    buf += dec.decode();
    if (buf) takeLine(buf);
    clearTimeout(watchdog);
    if (full) finish(full);
    else botEl.textContent = "…Момо задумался и промолчал. Попробуйте ещё раз.";
    setOnline(true);
    done = true;
  }catch(_){
    clearTimeout(watchdog);
  }

  /* попытка 2: стрим не дошёл. Две типовые причины: (а) адрес туннеля успел
     смениться — обновляем из свежего config.js; (б) антивирус или прокси
     в этой сети буферизует SSE целиком, и клиент не видит ни байта до конца
     генерации — просим обычный JSON одним куском, его такие сети отдают */
  if (!done){
    if (gotHeaders && !sawBytes) sseBroken = true; // заголовки дошли, тело — нет
    await refreshApi();
    botEl.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    try{
      const r = await fetch(KD.API + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload({ stream: false }),
        signal: AbortSignal.timeout(100_000)
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      const txt = (j.text || "").trim();
      if (txt) finish(txt);
      else botEl.textContent = "…Момо задумался и промолчал. Попробуйте ещё раз.";
      setOnline(true);
    }catch(e){
      botEl.textContent = (e.name === "AbortError" || e.name === "TimeoutError")
        ? "Момо долго не отвечает — попробуйте чуть позже. 🐾"
        : "Момо не дозвался — попробуйте ещё раз через минутку. 🐾";
      setOnline(false);
    }
  }
  busy = false; send.disabled = false;
}

send.addEventListener("click", () => ask());
input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) ask(); });

/* приветствие ждёт в панели заранее. Адрес сервера сразу сверяем со свежим
   config.js (мимо кэша): подключённый <script> мог протухнуть в кэше браузера
   или Pages, и тогда без сверки чат стучит в мёртвый туннель */
add("bot", "Мяу! Я Момо — консультант этого магазина. Расскажите о питомце — подсказками ниже или своими словами — и я подберу домик и соберу его прямо в сцене.");
(async () => { await refreshApi(); health(); })();
})();
