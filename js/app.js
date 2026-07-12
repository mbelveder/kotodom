/* Котоши — готовые сборки, оформление заказа (демо-оплата), Telegram-уведомление */
"use strict";
(function(){
const $ = s => document.querySelector(s);
const back = $("#modalBack"), body = $("#modalBody"), xBtn = $("#modalX");
const fmt = KD.fmt;

/* ---------- готовые сборки: витрина над hero + выдвижная панель у конструктора ---------- */
/* три сфотографированы, три — сложнее, ещё без съёмки (см. .sc-mock в css) */
const SHOWCASE = [
  { img: "assets/render_start.jpg", preset: "start", nm: "«Новичок»",
    ds: "Первый куб-нора и когтеточка. С этого начинается любой Котоши — остальное докупается, когда захочется." },
  { img: "assets/render_wide.jpg", preset: "wide", nm: "«Проныра»",
    ds: "Два куба, тоннель между ними и гамак сверху — маршрут для пробежек, засад и послеобеденного сна." },
  { img: "assets/render_tower.jpg", preset: "tower", nm: "«Вальяжный»",
    ds: "Куб, смотровая площадка и крыша — вертикальный дом для кота, который любит наблюдать сверху." },
  { img: "assets/render_manor.jpg", preset: "manor", nm: "«Резиденция»",
    ds: "Два куба, тоннель, гамак, смотровая башня с крышей — и когтеточка с игрушкой на сдачу. Целая резиденция для кота с большими планами." },
  { img: "assets/render_watch.jpg", preset: "watch", nm: "«Дозорный»",
    ds: "Фундамент и двойная смотровая башня с гамаком у подножья — для кота, который любит видеть всё, а спать не отходя от поста." },
  { img: "assets/render_zoomies.jpg", preset: "zoomies", nm: "«Непоседа»",
    ds: "Три куба с тоннелями в ряд, широкий гамак и башня с крышей — маршрут для кота, которому вечно неймётся." }
];
const presetPanel = $("#presetPanel"), presetTab = $("#presetTab"),
      presetList = $("#presetList"), studioMain = $("#studioMain"),
      showcaseGrid = $("#showcaseGrid"), builderSec = $("#builder");
const presetPrice = key => Object.values(KD.PRESETS[key].cells)
  .reduce((s, t) => s + KD.MODULES[t].price, 0);
SHOWCASE.forEach(g => {
  const el = document.createElement("div");
  el.className = "preset-card";
  el.dataset.key = g.preset;
  /* описание переехало на фото «жидким стеклом» (проявляется на ховере) —
     карточка стала ниже, в узкой панели помещается больше сборок.
     Для трёх сборок без фото (см. SHOWCASE) — тот же мокап с иероглифом, что в витрине над hero */
  const pcMedia = g.img
    ? `<img src="${g.img}" alt="Конфигурация ${g.nm} в интерьере" loading="lazy"
         onerror="this.closest('.pc-media').classList.add('no-img')">`
    : `<div class="sc-mock"><span>${g.kanji}</span></div>`;
  el.innerHTML = `
    <div class="pc-media">
      ${pcMedia}
      <div class="pc-hover">${g.ds}</div>
    </div>
    <div class="pc-body">
      <div class="pc-nm">${g.nm}<span class="pc-pr">${fmt(presetPrice(g.preset))}</span></div>
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
/* «Готовые сборки» в шапке теперь ведёт на витрину над hero (#gallery, обычная
   якорная ссылка) — панель у сцены она больше не форсит, поэтому старый
   guide-aware обработчик клика по navPresets здесь не нужен */

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
  let dismissed = true;   // гид скрыт по умолчанию, пока его не показали
  /* клик «Собрать» в витрине над hero показывает гид поверх уже открытого
     сайдбара (сайдбар при этом виден, но притемнён/расфокусирован затемнением
     гида) — так посетитель узнаёт, где сайдбар и как выглядит подсвеченная
     сборка, не возвращаясь в раздел «Готовые сборки». По «ОК»/Esc/клику мимо
     гид уходит и забирает с собой сайдбар — сцена остаётся свободной для
     ручной сборки или чата */
  let closePresetsOnDismiss = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    try { localStorage.setItem(SEEN, "1"); } catch (e) {}
    buildGuide.classList.add("hiding");
    if (closePresetsOnDismiss){
      closePresetsOnDismiss = false;
      presetsOpen(false);
    }
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
  /* firstRun — самый первый показ при загрузке: тогда придерживаем реплику Момо.
     Повторный показ по кнопке этого не делает — Момо уже поздоровался */
  const openGuide = firstRun => {
    dismissed = false;
    buildGuide.classList.remove("hiding");
    buildGuide.hidden = false;
    if (firstRun) introClosed = false;   // интро на экране — реплика Момо подождёт
  };
  /* слушатели закрытия вешаем один раз; работают и для первого показа, и для
     повторного по кнопке. Esc реагирует, только пока гид на экране */
  $("#buildGuideOk").addEventListener("click", dismiss);
  buildGuide.querySelector(".bg-scrim").addEventListener("click", dismiss); // клик мимо подсказок
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !buildGuide.hidden) dismiss();
  });

  /* первый показ — один раз на браузер (по localStorage) */
  let seen = false;
  try { seen = localStorage.getItem(SEEN) === "1"; } catch (e) {}
  if (!seen) openGuide(true);

  /* маленькая кнопка «показать подсказки снова» под конструктором */
  const reopen = $("#guideReopen");
  if (reopen) reopen.addEventListener("click", () => openGuide(false));

  KD.showGuideOverPresets = () => {
    closePresetsOnDismiss = true;
    openGuide(false);
  };
}

/* ---------- витрина «готовые сборки» над hero: фото/мокап + подпись «жидким стеклом» ---------- */
function highlightPreset(key){
  const card = presetList.querySelector(`.preset-card[data-key="${key}"]`);
  if (!card) return;
  card.classList.remove("hl");
  void card.offsetWidth; // перезапуск анимации, если подсветили тот же план дважды подряд
  card.classList.add("hl");
  /* скроллим только сам список (его собственный overflow-y), а не card.scrollIntoView:
     панель — absolute внутри ещё едущей секции конструктора, и scrollIntoView
     на вложенном элементе задевает и document-скролл, гоняя всю страницу */
  presetList.scrollTo({ top: card.offsetTop - 8, behavior: "smooth" });
}
/* клик по «Собрать» в витрине: сюда ведёт настоящий переход в конструктор —
   в отличие от кнопок сборки внутри самого конструктора, тут прокрутка уместна.
   Скроллим до заголовка-разделителя «くみたて конструктор», а не до верха секции —
   он сидит прямо на студии, и так студия оказывается видна сразу, без отступа под текст */
function buildFromShowcase(key){
  const head = $("#builderHead");
  (head || builderSec).scrollIntoView({ behavior: "smooth", block: "start" });
  presetsOpen(true);
  KD.loadPreset(key);
  if (KD.showGuideOverPresets) KD.showGuideOverPresets();
  /* подсветку — после transition панели (.28s): раньше scrollIntoView читает
     ещё не осевшие координаты (панель на пути из translateX(112%)) и уводит
     всю страницу непредсказуемо далеко */
  setTimeout(() => highlightPreset(key), 320);
}
SHOWCASE.forEach(g => {
  const el = document.createElement("div");
  el.className = "sc-card";
  const media = g.img
    ? `<img src="${g.img}" alt="Сборка ${g.nm} в интерьере" loading="lazy">`
    : `<div class="sc-mock"><span>${g.kanji}</span></div>`;
  el.innerHTML = `
    <div class="sc-media">
      ${media}
      <div class="sc-cap">${g.ds}</div>
    </div>
    <div class="sc-ft">
      <div class="sc-nm">${g.nm}<span class="sc-pr">${fmt(presetPrice(g.preset))}</span></div>
      <button class="btn btn-ghost" data-p="${g.preset}">Собрать</button>
    </div>`;
  showcaseGrid.appendChild(el);
  el.querySelector("button").addEventListener("click", () => buildFromShowcase(g.preset));
});

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
