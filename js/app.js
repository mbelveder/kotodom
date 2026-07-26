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
    <div class="pc-media"${g.img ? ` style="--pc-img:url('${g.img}')"` : ""}>
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
  el.querySelector("button").addEventListener("click", () => {
    if (KD.loadPreset(g.preset)) markChosen(g.preset);
  });
});

/* «выбранная сборка»: карточка плана, который сейчас стоит в конструкторе
   в неизменном виде. Любая ручная правка (перенос, удаление, очистка, отмена,
   сборка от Момо) снимает метку — см. KD.onUserEdit из configurator.js */
let chosenCard = null;
function markChosen(key){
  if (chosenCard) chosenCard.classList.remove("chosen");
  chosenCard = presetList.querySelector(`.preset-card[data-key="${key}"]`);
  if (!chosenCard) return;
  chosenCard.classList.add("chosen");
  /* панель может быть закрыта — список прокручиваем заранее, чтобы при
     открытии выбранный план был сразу на виду */
  presetList.scrollTo({ top: chosenCard.offsetTop - 8 });
}
KD.onUserEdit = () => {
  if (!chosenCard) return;
  chosenCard.classList.remove("chosen");
  chosenCard = null;
};

function presetsOpen(on){
  presetPanel.classList.toggle("open", on);
  studioMain.classList.toggle("presets-open", on);
  presetTab.setAttribute("aria-expanded", on ? "true" : "false");
  /* на телефоне обе панели — шторки снизу: две сразу не помещаются */
  if (on && KD.closeChat && matchMedia("(max-width: 900px)").matches) KD.closeChat();
  /* в конструкторе стоит нетронутый план из витрины — при открытии панели
     коротко подсвечиваем его карточку (после transition, чтобы был виден) */
  if (on && chosenCard) setTimeout(() => {
    if (chosenCard) highlightPreset(chosenCard.dataset.key);
  }, 300);
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
  /* configurator.js спрашивает перед показом баббла Момо: пока гид на экране
     (включая повторное открытие по кнопке), реплики не показываем */
  KD.guideShown = () => !dismissed;
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
  /* по «ОК»/Esc/клику мимо гид уходит, освобождая сцену для сборки/чата */
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    setToggle(false);
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
  /* firstRun — самый первый показ при загрузке: тогда придерживаем реплику Момо.
     Повторный показ по кнопке этого не делает — Момо уже поздоровался */
  const openGuide = firstRun => {
    dismissed = false;
    setToggle(true);
    if (sceneInstr) sceneInstr.open = false;   // схлопываем список инструкций — виден только «ОК, к делу»
    buildGuide.classList.remove("hiding");
    buildGuide.hidden = false;
    /* гид показывает чистую сцену: сайдбар не открываем, стрелка подсказки
       ведёт к закрытой вкладке у левого края (а открытый — закрываем: панель
       z-index 22 накрыла бы «ОК, к делу» в шапке сцены) */
    presetsOpen(false);
    /* гид показывает все подсказки — вернуть и ярлык чата, если тот уже
       отслужил (после закрытия гида он останется, см. js/chat.js) */
    if (KD.reviveChatTip) KD.reviveChatTip();
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
   видна сразу. Сайдбар НЕ открываем — план и так виден в сцене; его карточку
   помечаем и прокручиваем к ней список, чтобы открывший сайдбар сразу увидел
   выбранную сборку */
function buildFromShowcase(key){
  const head = $("#builderHead");
  (head || builderSec).scrollIntoView({ behavior: "smooth", block: "start" });
  if (KD.loadPreset(key)) markChosen(key);
}
SHOWCASE.forEach(g => {
  const el = document.createElement("div");
  el.className = "sc-card";
  el.dataset.key = g.preset;
  const media = g.img
    ? `<img src="${g.img}" alt="Сборка ${g.nm} в интерьере" loading="lazy">`
    : `<div class="sc-mock"><span>${g.kanji}</span></div>`;
  /* описание больше НЕ лежит «стеклом» поверх фото: оно выпадает под карточкой
     на обычном фоне (см. .sc-reveal). «Стекло» осталось за лентой модулей —
     две витрины намеренно раскрываются по-разному */
  el.innerHTML = `
    <div class="sc-media"${g.img ? ` style="--sc-img:url('${g.img}')"` : ""}>
      ${media}
    </div>
    <div class="sc-ft">
      <div class="sc-nm">${g.nm}<span class="sc-pr">${fmt(presetPrice(g.preset))}</span></div>
      <button class="btn btn-ghost" data-p="${g.preset}">Собрать</button>
    </div>
    <div class="sc-reveal"><div><p>${g.ds}</p></div></div>`;
  showcaseGrid.appendChild(el);
  el.querySelector("button").addEventListener("click", () => buildFromShowcase(g.preset));
});

/* ---------- панорамная карусель (первый экран) ---------- */
/* Разметка слайдов статическая — карусель видна и без js. Здесь только
   поведение: стрелки, точки, свайп, клавиатура. Автопрокрутки нет намеренно:
   видео на втором слайде само держит внимание, а автосмена уводила бы кадр
   из-под курсора. */
(function reel(){
  const root = $("#reel");
  if (!root) return;
  const track = $("#reelTrack");
  const slides = Array.from(track.children);
  const dots = Array.from($("#reelDots").children);
  if (slides.length < 2) return;
  let cur = 0;

  function go(n){
    cur = (n + slides.length) % slides.length;
    track.style.transform = `translateX(${-cur * 100}%)`;
    dots.forEach((d, i) => {
      d.classList.toggle("is-on", i === cur);
      d.setAttribute("aria-selected", i === cur ? "true" : "false");
    });
    /* соседние слайды уезжают за кадр — убираем их из фокуса и с экрана
       читалок, иначе Tab уводит курсор в невидимую подпись */
    slides.forEach((s, i) => s.toggleAttribute("inert", i !== cur));
  }
  go(0);

  $("#reelPrev").addEventListener("click", () => go(cur - 1));
  $("#reelNext").addEventListener("click", () => go(cur + 1));
  dots.forEach((d, i) => d.addEventListener("click", () => go(i)));

  /* стрелки клавиатуры — только когда фокус внутри карусели, иначе они
     перехватывали бы обычную прокрутку страницы */
  root.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft"){ e.preventDefault(); go(cur - 1); }
    if (e.key === "ArrowRight"){ e.preventDefault(); go(cur + 1); }
  });

  /* свайп: считаем только заметно горизонтальный жест, чтобы не перехватывать
     вертикальную прокрутку страницы пальцем по фото */
  let sx = 0, sy = 0, down = false;
  const frame = root.querySelector(".reel-frame");
  frame.addEventListener("pointerdown", e => {
    if (!e.isPrimary || e.button !== 0) return;
    down = true; sx = e.clientX; sy = e.clientY;
  });
  frame.addEventListener("pointerup", e => {
    if (!down) return;
    down = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
    go(cur + (dx < 0 ? 1 : -1));
  });
  frame.addEventListener("pointercancel", () => { down = false; });
})();

/* ---------- каталог модулей: горизонтальная лента ---------- */
/* Карточки рендерятся из KD.MODULES + KD.CATALOG, а не пишутся руками:
   цена, описание и габариты живут в одном месте (js/catalog.js). */
const rail = $("#moduleRail");
if (rail){
  KD.CATALOG.forEach(({ type, card }) => {
    const m = KD.MODULES[type];
    if (!m) return;
    const el = document.createElement("article");
    el.className = "mc-card";
    el.dataset.type = type;
    /* описание в покое СКРЫТО (.mc-hover проявляется на ховере/фокусе):
       лента должна читаться как ровный ряд товаров, а не как стена текста */
    el.innerHTML = `
      <div class="mc-media">
        <img src="assets/module-cards/${card}.jpg" alt="Модуль «${m.name}»" loading="lazy" decoding="async">
        <div class="mc-hover">${m.desc}</div>
      </div>
      <div class="mc-body">
        <div class="mc-nm">${m.name}<span class="mc-jp">${m.jp}</span></div>
        <div class="mc-size">${m.size}<span class="mc-prelim">предварительно</span></div>
        <div class="mc-pr">${fmt(m.price)}</div>
        <div class="mc-acts">
          <button class="btn btn-aka" type="button" data-act="build">В конструктор</button>
          <button class="btn btn-ghost" type="button" data-act="cart">В корзину</button>
        </div>
      </div>`;
    rail.appendChild(el);
  });

  /* короткое подтверждение прямо на кнопке: заказ живёт ниже по странице,
     без обратной связи клик выглядел бы «ничего не произошло».
     Исходную подпись запоминаем ОДИН раз: иначе второй быстрый клик принимал
     за неё уже подменённый текст и «Добавлено ✓» залипало навсегда */
  const flashTimers = new WeakMap();
  function flash(btn, text){
    if (!btn.dataset.label) btn.dataset.label = btn.textContent;
    clearTimeout(flashTimers.get(btn));
    btn.textContent = text;
    btn.classList.add("done");
    flashTimers.set(btn, setTimeout(() => {
      btn.textContent = btn.dataset.label;
      btn.classList.remove("done");
    }, 1400));
  }

  rail.addEventListener("click", e => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const type = b.closest(".mc-card").dataset.type;
    if (b.dataset.act === "cart"){
      KD.cart.add(type);
      flash(b, "Добавлено ✓");
      return;
    }
    /* «В конструктор» — кладём модуль в сцену и едем к ней; подсветку места
       делает сам configurator (KD.scene.pulse) */
    const r = KD.addModule(type);
    if (!r.ok){ flash(b, "Нет места"); if (KD.say) KD.say(r.hint, 5000); return; }
    const head = $("#builderHead");
    (head || $("#builder")).scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* стрелки-скроллеры: прокручиваем на пару карточек, гасим на краях */
  const railPrev = $("#railPrev"), railNext = $("#railNext");
  const step = () => {
    const c = rail.querySelector(".mc-card");
    return c ? (c.offsetWidth + 16) * 2 : 560;
  };
  const syncNav = () => {
    const max = rail.scrollWidth - rail.clientWidth;
    railPrev.disabled = rail.scrollLeft < 8;
    railNext.disabled = rail.scrollLeft > max - 8;
  };
  railPrev.addEventListener("click", () => rail.scrollBy({ left: -step() }));
  railNext.addEventListener("click", () => rail.scrollBy({ left: step() }));
  rail.addEventListener("scroll", syncNav, { passive: true });
  window.addEventListener("resize", syncNav);
  syncNav();
}

/* плашка «отдельные модули в заказе» под лентой */
const cartBar = $("#cartBar"), cartNote = $("#cartNote");
if (cartBar){
  const plural = n => n % 10 === 1 && n % 100 !== 11 ? "модуль"
    : ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100) ? "модуля" : "модулей");
  KD.cart.onChange = () => {
    const lines = KD.cart.lines();
    const n = KD.cart.count();
    cartBar.classList.toggle("show", n > 0);
    if (!n) return;
    cartNote.textContent = `${n} ${plural(n)} · ${fmt(lines.reduce((s, l) => s + l.sum, 0))}`;
  };
  KD.cart.onChange();
  $("#cartOrder").addEventListener("click", () => openCheckout());
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
/* Состав заказа приходит из ДВУХ источников: сцена конструктора и модули,
   купленные напрямую из каталога. Заказ при этом один — правила суммы,
   скидки и отправки не меняются, разделены только строки состава. */
const composition = () => ({
  scene: KD.configurator.orderLines(),
  cart: KD.cart.lines()
});
const allLines = c => c.scene.concat(c.cart);

const lineRow = l => `<li><span class="nm">${l.name} × ${l.n}</span><span class="n">${fmt(l.sum)}</span></li>`;
/* у прямых покупок есть счётчик: одну позицию можно взять несколько раз
   и убрать, не выходя из модалки */
const cartRow = l => `<li>
    <span class="nm">${l.name}</span>
    <span class="qty" data-t="${l.type}">
      <button type="button" data-d="-1" aria-label="Убрать один ${l.name}">−</button>
      <span class="q">${l.n}</span>
      <button type="button" data-d="1" aria-label="Добавить один ${l.name}">+</button>
      <button type="button" class="rm" data-d="0" aria-label="Убрать «${l.name}» из заказа">✕</button>
    </span>
    <span class="n">${fmt(l.sum)}</span>
  </li>`;

function compositionHTML(){
  const c = composition();
  const t = linesTotals(allLines(c));
  const two = c.scene.length && c.cart.length;   // заголовки групп нужны только когда групп правда две
  return `
    ${c.scene.length ? `${two ? `<div class="og-t">Сборка из конструктора</div>` : ""}
      <ul class="order-lines">${c.scene.map(lineRow).join("")}</ul>` : ""}
    ${c.cart.length ? `${two ? `<div class="og-t">Отдельные модули</div>` : ""}
      <ul class="order-lines">${c.cart.map(cartRow).join("")}</ul>` : ""}
    <ul class="order-lines">
      ${t.disc ? `<li><span>Скидка 5% (от ${KD.DISCOUNT_FROM} модулей)</span><span class="n">−${fmt(t.disc)}</span></li>` : ""}
      <li class="total"><span>Итого</span><span class="n">${fmt(t.total)}</span></li>
    </ul>`;
}

function openCheckout(subtitle){
  const t0 = linesTotals(allLines(composition()));
  if (!t0.count) return;
  open(`
    <h3>Ваш Котоши</h3>
    <p class="m-sub">${subtitle || "Проверьте состав и оставьте контакты — Момо примет заказ."}</p>
    <div id="orderComp">${compositionHTML()}</div>
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
  /* счётчик количества перерисовывает ТОЛЬКО состав: поля формы уже могут быть
     заполнены, полная перерисовка модалки стирала бы введённое */
  const comp = $("#orderComp");
  comp.addEventListener("click", e => {
    const b = e.target.closest("button[data-d]");
    if (!b) return;
    const type = b.closest(".qty").dataset.t;
    const d = +b.dataset.d;
    const cur = (KD.cart.lines().find(l => l.type === type) || {}).n || 0;
    KD.cart.set(type, d === 0 ? 0 : cur + d);
    comp.innerHTML = compositionHTML();
    /* корзину могли обнулить до пустого заказа — тогда закрываем модалку */
    if (!linesTotals(allLines(composition())).count) close();
  });
  $("#orderForm").addEventListener("submit", e => {
    e.preventDefault();
    const c = composition();
    const t = linesTotals(allLines(c));
    payStep({
      /* lines — прежний плоский формат для сервера (его трогать рано);
         groups отдаём рядом, чтобы владелец видел, что собрано, а что докуплено */
      lines: allLines(c), total: t.total, disc: t.disc,
      groups: { build: c.scene, extra: c.cart },
      customer: {
        name: $("#fNm").value.trim(),
        contact: $("#fCt").value.trim(),
        address: $("#fAd").value.trim(),
        comment: $("#fCm").value.trim()
      }
    });
  });
}

/* заказ: сцена конструктора + отдельные модули из каталога */
$("#btnOrder").addEventListener("click", () => openCheckout());

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
