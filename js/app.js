/* Котоши — готовые сборки, оформление заказа (демо-оплата), Telegram-уведомление */
"use strict";
(function(){
const $ = s => document.querySelector(s);
const back = $("#modalBack"), body = $("#modalBody"), xBtn = $("#modalX");
const fmt = KD.fmt;

/* ---------- готовые сборки: витрина над hero + выдвижная панель у конструктора домиков ---------- */
/* три сфотографированы, три — сложнее, ещё без съёмки (см. .sc-mock в css) */
const SHOWCASE = [
  { img: "assets/render_start.jpg", preset: "start", nm: "«Новичок»",
    ds: "Первый куб-нора и когтеточка. С этого начинается любой Котоши — остальное докупается, когда захочется." },
  { img: "assets/render_wide.jpg", preset: "wide", nm: "«Проныра»",
    ds: "Два куба, тоннель между ними и гамак сверху — маршрут для пробежек, засад и послеобеденного сна." },
  { img: "assets/render_tower.jpg", preset: "tower", nm: "«Вальяжный»",
    ds: "Куб, смотровая площадка и крыша — вертикальный дом для кота, который любит наблюдать сверху." },
  { img: "assets/render_manor.jpg", preset: "manor", nm: "«Резиденция»",
    ds: "Два куба с тоннелем, гамак, смотровая башня с крышей и когтеточка — целая резиденция для кота с большими планами." },
  { img: "assets/render_watch.jpg", preset: "watch", nm: "«Дозорный»",
    ds: "Четыре куба-фундамент, башня-каланча с крышей, гамак, когтеточка и чаша-лежанка на возвышении — самый большой комплекс: видно всё, а вздремнуть можно где угодно." },
  { img: "assets/render_zoomies.jpg", preset: "zoomies", nm: "«Непоседа»",
    ds: "Башня с крышей под самый потолок и высокий пьедестал с чашей-лежанкой рядом — вертикаль для кота, которому вечно надо быть выше всех." }
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
      <button class="btn btn-ghost" data-p="${g.preset}">Собрать в конструкторе домиков</button>
    </div>`;
  presetList.appendChild(el);
  /* без прокрутки и закрытия панели: посетитель уже у конструктора домиков,
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

/* ---------- приветственный гид конструктора домиков ---------- */
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
  /* summary «Инструкция» в шапке сцены — пока гид открыт, подменяет подпись на
     «ОК, к делу» и берёт на себя закрытие (шапка стоит поверх затемнения, см.
     .scene-head z-index); отдельной кнопки закрытия внизу гида больше нет.
     Кнопка «показать подсказки ещё раз» лежит внутри <details> и реоткрывает гид */
  const sceneInstr = $("#sceneInstr");
  const toggle = $("#guideToggle");
  const reopen = $("#guideReopen");
  const setToggle = open => {
    if (!sceneInstr || !toggle) return;
    sceneInstr.classList.toggle("is-guide-open", open);
    toggle.textContent = open ? "ОК, к делу" : "Инструкция";
  };
  /* гид открывает сайдбар «готовые сборки» под собой — подсказка «Используйте
     готовые сборки» показывает реальную панель. По «ОК»/Esc/клику мимо гид
     уходит и медленно уводит сайдбар, освобождая сцену для ручной сборки/чата */
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    setToggle(false);
    try { localStorage.setItem(SEEN, "1"); } catch (e) {}
    buildGuide.classList.add("hiding");
    /* сайдбар «готовые сборки» открыт под гидом — на «ОК» он уезжает медленно,
       так видно, куда он прячется (см. .preset-panel.slow-hide) */
    if (presetPanel.classList.contains("open")){
      presetPanel.classList.add("slow-hide");
      presetsOpen(false);
      const unslow = () => presetPanel.classList.remove("slow-hide");
      presetPanel.addEventListener("transitionend", unslow, { once: true });
      setTimeout(unslow, 1000);
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
    setToggle(true);
    if (sceneInstr) sceneInstr.open = false;   // схлопываем список инструкций — виден только «ОК, к делу»
    buildGuide.classList.remove("hiding");
    buildGuide.hidden = false;
    presetsOpen(true);   // показываем сайдбар под гидом — «ОК» его медленно уберёт
    if (firstRun) introClosed = false;   // интро на экране — реплика Момо подождёт
  };
  /* пока гид открыт, клик по summary не разворачивает <details>, а закрывает гид —
     иначе (гид уже закрыт) работает как обычный тумблер инструкции */
  if (toggle) toggle.addEventListener("click", e => {
    if (!dismissed) { e.preventDefault(); dismiss(); }
  });
  /* кнопка «показать подсказки ещё раз» внутри развёрнутой инструкции — реоткрывает гид */
  if (reopen) reopen.addEventListener("click", () => openGuide(false));
  /* слушатель закрытия вешаем один раз; работает и для первого показа, и для
     повторного по кнопке. Esc реагирует, только пока гид на экране */
  buildGuide.querySelector(".bg-scrim").addEventListener("click", dismiss); // клик мимо подсказок
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !buildGuide.hidden) dismiss();
  });

  /* первый показ — один раз на браузер (по localStorage) */
  let seen = false;
  try { seen = localStorage.getItem(SEEN) === "1"; } catch (e) {}
  if (!seen) openGuide(true);
}

/* ---------- витрина «готовые сборки» над hero: фото/мокап + подпись «жидким стеклом» ---------- */
function highlightPreset(key){
  const card = presetList.querySelector(`.preset-card[data-key="${key}"]`);
  if (!card) return;
  card.classList.remove("hl");
  void card.offsetWidth; // перезапуск анимации, если подсветили тот же план дважды подряд
  card.classList.add("hl");
  /* скроллим только сам список (его собственный overflow-y), а не card.scrollIntoView:
     панель — absolute внутри ещё едущей секции конструктора домиков, и scrollIntoView
     на вложенном элементе задевает и document-скролл, гоняя всю страницу */
  presetList.scrollTo({ top: card.offsetTop - 8, behavior: "smooth" });
}
/* клик по «Собрать» в витрине: сюда ведёт настоящий переход в конструктор домиков —
   в отличие от кнопок сборки внутри самого конструктора домиков, тут прокрутка уместна.
   Скроллим до заголовка конструктора домиков на сцене, а не до верха секции — так студия
   видна сразу. Приветственный гид тут НЕ показываем: сайдбар просто открывается
   и остаётся открытым, чтобы примерять планы один за другим */
function buildFromShowcase(key){
  const head = $("#builderHead");
  (head || builderSec).scrollIntoView({ behavior: "smooth", block: "start" });
  presetsOpen(true);
  KD.loadPreset(key);
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
