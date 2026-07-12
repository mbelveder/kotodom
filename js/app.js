/* Котоши — готовые сборки, оформление заказа (демо-оплата), Telegram-уведомление */
"use strict";
(function(){
const $ = s => document.querySelector(s);
const back = $("#modalBack"), body = $("#modalBody"), xBtn = $("#modalX");
const fmt = KD.fmt;

/* ---------- готовые сборки: выдвижная панель у конструктора ---------- */
const PRESET_CARDS = [
  { img: "assets/render_start.jpg", preset: "start", nm: "«Новичок»",
    ds: "Первый куб-нора и когтеточка. С этого начинается любой Котоши — остальное докупается, когда захочется." },
  { img: "assets/render_wide.jpg", preset: "wide", nm: "«Проныра»",
    ds: "Два куба, тоннель между ними и гамак сверху — маршрут для пробежек, засад и послеобеденного сна." },
  { img: "assets/render_tower.jpg", preset: "tower", nm: "«Вальяжный»",
    ds: "Куб, смотровая площадка и крыша — вертикальный дом для кота, который любит наблюдать сверху." }
];
const presetPanel = $("#presetPanel"), presetTab = $("#presetTab"),
      presetList = $("#presetList"), studioMain = $("#studioMain");
const presetPrice = key => Object.values(KD.PRESETS[key].cells)
  .reduce((s, t) => s + KD.MODULES[t].price, 0);
PRESET_CARDS.forEach(g => {
  const el = document.createElement("div");
  el.className = "preset-card";
  el.innerHTML = `
    <img src="${g.img}" alt="Конфигурация ${g.nm} в интерьере" loading="lazy"
         onerror="this.style.display='none'">
    <div class="pc-body">
      <div class="pc-nm">${g.nm}<span class="pc-pr">${fmt(presetPrice(g.preset))}</span></div>
      <p class="pc-ds">${g.ds}</p>
      <button class="btn btn-ghost" data-p="${g.preset}">Собрать в конструкторе</button>
    </div>`;
  presetList.appendChild(el);
  /* без прокрутки и закрытия панели: посетитель уже у конструктора,
     а планы удобно примерять один за другим */
  el.querySelector("button").addEventListener("click", () => KD.loadPreset(g.preset));
});
function presetsOpen(on){
  presetPanel.classList.toggle("open", on);
  studioMain.classList.toggle("presets-open", on);
  presetTab.setAttribute("aria-expanded", on ? "true" : "false");
  /* на телефоне обе панели — шторки снизу: две сразу не помещаются */
  if (on && KD.closeChat && matchMedia("(max-width: 900px)").matches) KD.closeChat();
}
KD.closePresets = () => presetsOpen(false);
presetTab.addEventListener("click", () => presetsOpen(true));
$("#presetX").addEventListener("click", () => presetsOpen(false));
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && presetPanel.classList.contains("open")) presetsOpen(false);
});
/* «Готовые» в шапке ведёт к конструктору и сразу разворачивает панель.
   Но пока открыт приветственный гид, панель ушла бы за затемнение — вместо этого
   подсвечиваем нужную подсказку, чтобы взгляд нашёл вкладку сам */
const navPresets = $("#navPresets");
if (navPresets) navPresets.addEventListener("click", () => {
  const guide = $("#buildGuide");
  const guideUp = guide && !guide.hidden && !guide.classList.contains("hiding");
  if (guideUp){
    const tip = guide.querySelector(".bg-tip--presets");
    if (tip){
      tip.classList.remove("lit");   // рестарт вспышки при повторном клике
      void tip.offsetWidth;
      tip.classList.add("lit");
    }
    return;
  }
  presetsOpen(true);
});

/* ---------- приветственный гид конструктора ---------- */
/* растворяющийся слой поверх сцены: подсказывает три пути (готовые сборки,
   сборка самому, чат с Момо). Показываем один раз — дальше не мозолит глаза */
const buildGuide = $("#buildGuide");
/* пока интро открыто — первая реплика Момо (автосборка «Проныры») ждёт,
   иначе она уходила бы в пустоту за затемнением. По умолчанию интро «нет»:
   если гид не показывается (уже видели / нет в DOM), реплика идёт сразу */
const introCbs = [];
let introClosed = true;
KD.onIntroDone = cb => { introClosed ? cb() : introCbs.push(cb); };
const closeIntro = () => {
  if (introClosed) return;
  introClosed = true;
  while (introCbs.length) introCbs.shift()();
};

if (buildGuide){
  const SEEN = "kd_guideSeen";
  let seen = false;
  try { seen = localStorage.getItem(SEEN) === "1"; } catch (e) {}
  if (!seen){
    introClosed = false;          // интро на экране — реплика Момо подождёт
    buildGuide.hidden = false;
    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      try { localStorage.setItem(SEEN, "1"); } catch (e) {}
      buildGuide.classList.add("hiding");
      /* done() идемпотентен: убираем слой из DOM после исчезновения и только
         тогда отпускаем первую реплику Момо. transitionend может не прийти
         (фоновая вкладка тормозит анимации, reduced-motion) — дублируем таймером */
      let cleared = false;
      const done = () => {
        if (cleared) return;
        cleared = true;
        buildGuide.hidden = true;
        closeIntro();
      };
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) done();
      else {
        buildGuide.addEventListener("transitionend", done, { once: true });
        setTimeout(done, 650);
      }
    };
    $("#buildGuideOk").addEventListener("click", dismiss);
    /* клик мимо подсказок (по затемнённому фону) тоже закрывает */
    buildGuide.querySelector(".bg-scrim").addEventListener("click", dismiss);
    document.addEventListener("keydown", e => { if (e.key === "Escape") dismiss(); });
  }
}

/* ---------- логотип = кнопка «домой» ---------- */
const homeLink = document.querySelector(".hanko");
if (homeLink) homeLink.addEventListener("click", e => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ---------- ролик: уважаем «поменьше движения» ---------- */
const filmVid = document.getElementById("filmVid");
if (filmVid && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  filmVid.removeAttribute("autoplay");
  filmVid.pause();
}

/* ---------- модалка ---------- */
function open(html){ body.innerHTML = html; back.classList.add("open"); }
function close(){ back.classList.remove("open"); }
xBtn.addEventListener("click", close);
back.addEventListener("click", e => { if (e.target === back) close(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });

/* ---------- оформление ---------- */
function linesTotals(lines){
  const sum = lines.reduce((s, l) => s + l.sum, 0);
  const count = lines.reduce((s, l) => s + l.n, 0);
  const disc = count >= KD.DISCOUNT_FROM ? Math.round(sum * KD.DISCOUNT) : 0;
  return { count, sum, disc, total: sum - disc };
}
function checkoutStep(lines, t, subtitle){
  open(`
    <h3>Ваш Котоши</h3>
    <p class="m-sub">${subtitle || "Проверьте состав и оставьте контакты — Момо примет заказ."}</p>
    <ul class="order-lines">
      ${lines.map(l => `<li><span>${l.name} × ${l.n}</span><span class="n">${fmt(l.sum)}</span></li>`).join("")}
      ${t.disc ? `<li><span>Скидка 5% (от ${KD.DISCOUNT_FROM} модулей)</span><span class="n">−${fmt(t.disc)}</span></li>` : ""}
      <li class="total"><span>Итого</span><span class="n">${fmt(t.total)}</span></li>
    </ul>
    <form id="orderForm">
      <div class="f-row"><label for="fNm">Как вас зовут</label>
        <input id="fNm" required maxlength="80" placeholder="Имя"></div>
      <div class="f-row"><label for="fCt">Telegram или телефон</label>
        <input id="fCt" required maxlength="80" placeholder="@username или +7…"></div>
      <div class="f-row"><label for="fAd">Город и адрес доставки</label>
        <input id="fAd" required maxlength="160" placeholder="Город, улица, дом"></div>
      <div class="f-row"><label for="fCm">Комментарий (кличка кота приветствуется)</label>
        <textarea id="fCm" rows="2" maxlength="300" placeholder="Например: кот Батон, 6 кг, любит высоту"></textarea></div>
      <button class="btn btn-aka" type="submit" style="width:100%">К оплате</button>
      <div class="err-note" id="orderErr"></div>
    </form>
  `);
  $("#orderForm").addEventListener("submit", e => {
    e.preventDefault();
    payStep({
      lines, total: t.total, disc: t.disc,
      customer: {
        name: $("#fNm").value.trim(),
        contact: $("#fCt").value.trim(),
        address: $("#fAd").value.trim(),
        comment: $("#fCm").value.trim()
      }
    });
  });
}

/* заказ того, что собрано в сцене */
$("#btnOrder").addEventListener("click", () => {
  const lines = KD.configurator.orderLines();
  if (!lines.length) return;
  checkoutStep(lines, KD.configurator.totals());
});

/* заказ списком: модули по счёту, без сборки в сцене */
$("#btnBulk").addEventListener("click", () => {
  const qty = {};
  const rows = Object.entries(KD.MODULES).map(([t, m]) => `
    <li><span>${m.name}</span><span class="n">${fmt(m.price)}</span>
      <span class="qty"><button type="button" data-t="${t}" data-d="-1" aria-label="меньше">−</button><b
        id="q_${t}">0</b><button type="button" data-t="${t}" data-d="1" aria-label="больше">+</button></span></li>`).join("");
  open(`
    <h3>Заказать списком</h3>
    <p class="m-sub">Наберите модули по счёту — например, 5 тоннелей и 2 куба. Собирать в сцене не обязательно.</p>
    <ul class="order-lines bulk-lines">${rows}</ul>
    <ul class="order-lines">
      <li id="bulkDisc" style="display:none"><span>Скидка 5% (от ${KD.DISCOUNT_FROM} модулей)</span><span class="n" id="bulkDiscN"></span></li>
      <li class="total"><span>Итого</span><span class="n" id="bulkTotal">0 ₽</span></li>
    </ul>
    <button class="btn btn-aka" id="bulkGo" style="width:100%" disabled>Продолжить</button>
  `);
  const goBtn = $("#bulkGo");
  const bulkLines = () => Object.entries(qty).filter(([, n]) => n > 0)
    .map(([t, n]) => ({ type: t, name: KD.MODULES[t].name, n, price: KD.MODULES[t].price, sum: KD.MODULES[t].price * n }));
  const redraw = () => {
    const t = linesTotals(bulkLines());
    $("#bulkTotal").textContent = fmt(t.total);
    $("#bulkDisc").style.display = t.disc ? "" : "none";
    if (t.disc) $("#bulkDiscN").textContent = "−" + fmt(t.disc);
    goBtn.disabled = !t.count;
    goBtn.textContent = t.count ? `Продолжить · ${fmt(t.total)}` : "Продолжить";
  };
  body.querySelectorAll(".qty button").forEach(b => b.addEventListener("click", () => {
    const t = b.dataset.t;
    qty[t] = Math.min(20, Math.max(0, (qty[t] || 0) + (+b.dataset.d)));
    $("#q_" + t).textContent = qty[t];
    redraw();
  }));
  goBtn.addEventListener("click", () => {
    const lines = bulkLines();
    if (lines.length) checkoutStep(lines, linesTotals(lines), "Модули списком — Момо примет заказ, соберёте сами как захотите.");
  });
});

function payStep(order){
  open(`
    <h3>Оплата</h3>
    <p class="m-sub">Это демо-магазин: кнопка ниже имитирует оплату, деньги не списываются.</p>
    <div class="pay-demo">
      <div>к оплате</div>
      <div class="big">${fmt(order.total)}</div>
      <div>ЮKassa · демо-режим</div>
    </div>
    <button class="btn btn-aka" id="payBtn" style="width:100%">Оплатить ${fmt(order.total)}</button>
    <div class="err-note" id="payErr"></div>
  `);
  $("#payBtn").addEventListener("click", async () => {
    const btn = $("#payBtn"), err = $("#payErr");
    btn.disabled = true; btn.textContent = "Проводим оплату…";
    err.textContent = "";
    try{
      if (!KD.API) throw new Error("no-api");
      const r = await fetch(KD.API + "/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
        signal: AbortSignal.timeout(15000)
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      successStep(j.orderId || "КШ-????");
    }catch(e){
      btn.disabled = false; btn.textContent = `Оплатить ${fmt(order.total)}`;
      err.textContent = e.message === "no-api"
        ? "Момо сейчас дремлет и не может принять заказ. Попробуйте чуть позже."
        : "Не получилось с первого раза. Попробуйте ещё раз через минуту.";
    }
  });
}

function successStep(orderId){
  open(`
    <div class="success-cat">
      <img src="assets/logo-momo.png?v=2" alt="">
    </div>
    <h3 style="text-align:center">Заказ принят!</h3>
    <div class="order-id">${orderId}</div>
    <p class="m-sub" style="text-align:center">Момо уже отправил заказ владельцу в Telegram.
       Момо шлёт довольное «мяу» и просит собрать домик поскорее.</p>
    <button class="btn btn-aka" style="width:100%" onclick="document.getElementById('modalBack').classList.remove('open')">Отлично!</button>
  `);
}
})();
