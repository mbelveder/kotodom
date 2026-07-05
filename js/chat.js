/* КотоДом — чат со Смотрителем (SSE через backend) */
"use strict";
(function(){
const $ = s => document.querySelector(s);
const fab = $("#chatFab"), panel = $("#chatPanel"), msgs = $("#chatMsgs"),
      input = $("#chatInput"), send = $("#chatSend"), status = $("#chatStatus");

/* адрес API: ?api=… > config.js (свежий из репозитория) > localStorage.
   config.js важнее localStorage: иначе устаревший сохранённый адрес
   перекрывает только что запушенный туннель */
const qs = new URLSearchParams(location.search).get("api");
if (qs){ localStorage.setItem("kd_api", qs.replace(/\/+$/, "")); }
KD.API = (qs && qs.replace(/\/+$/, "")) || window.KOTODOM_API || localStorage.getItem("kd_api") || "";

const history = [];   // {role, content}
let busy = false, online = false, greeted = false;

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

fab.addEventListener("click", () => {
  panel.classList.toggle("open");
  if (panel.classList.contains("open")){
    input.focus();
    if (!greeted){
      greeted = true;
      add("bot", "Мяу! Я Смотритель — веду этот магазин. Спрашивайте про модули, цены, доставку или вашу сборку в конфигураторе. Отвечаю честно: я ИИ, но в домиках разбираюсь.");
      health();
    }
  }
});

async function ask(){
  const text = input.value.trim();
  if (!text || busy) return;
  input.value = "";
  add("user", text);
  history.push({ role: "user", content: text });

  if (!KD.API){
    add("sys", "Смотритель недоступен: backend не настроен (нет адреса API).");
    return;
  }
  busy = true; send.disabled = true;
  const botEl = add("bot", "");
  botEl.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';

  try{
    const r = await fetch(KD.API + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: history.slice(-12),
        config: KD.configurator ? KD.configurator.summary() : ""
      })
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = "", full = "";
    for(;;){
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
            botEl.textContent = full.replace(/\[\[ESCALATE\]\]/g, "").trimStart();
            msgs.scrollTop = msgs.scrollHeight;
          }
        }catch(_){}
      }
    }
    if (!full){ botEl.textContent = "…Смотритель задумался и промолчал. Попробуйте ещё раз."; }
    else {
      history.push({ role: "assistant", content: full.replace(/\[\[ESCALATE\]\]/g, "").trim() });
      if (full.includes("[[ESCALATE]]")){
        add("sys", "Смотритель позвал человека — владелец магазина получил уведомление в Telegram.");
      }
    }
    setOnline(true);
  }catch(e){
    botEl.textContent = "Не получилось связаться со Смотрителем. Проверьте, запущен ли сервер (server/run.sh).";
    setOnline(false);
  }
  busy = false; send.disabled = false;
  input.focus();
}

send.addEventListener("click", ask);
input.addEventListener("keydown", e => { if (e.key === "Enter") ask(); });
health();
})();
