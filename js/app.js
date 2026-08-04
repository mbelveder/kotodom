/* Котоши — готовые сборки, оформление заказа (демо-оплата), Telegram-уведомление */
"use strict";
(function(){
const $ = s => document.querySelector(s);
const back = $("#modalBack"), body = $("#modalBody"), xBtn = $("#modalX");
const fmt = KD.fmt;

/* ---------- готовые сборки: витрина над hero + выдвижная панель у конструктора домиков ---------- */
/* у всех шести есть рендер в assets/render_*.jpg; ветка с .sc-mock (иероглиф
   вместо фото) в витрине осталась на случай новой сборки без съёмки */
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
/* Карточка плана — целиком одна кнопка. Раньше внутри неё жили описание
   «жидким стеклом» на ховере и отдельная кнопка «Собрать в конструкторе
   домиков»; и то и другое съедало высоту в узкой панели, а кнопка вдобавок
   повторяла то, что делает вся карточка. Осталось фото, имя и цена; что
   карточка кликабельна, видно по ховеру — она приподнимается, а на фото
   проявляется «Собрать». Описание сборки читается в витрине над hero. */
SHOWCASE.forEach(g => {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "preset-card";
  el.dataset.key = g.preset;
  el.setAttribute("aria-label", `Собрать сборку ${g.nm} в конструкторе`);
  el.innerHTML = `
    <div class="pc-media">
      <img src="${g.img}" alt="" loading="lazy"
           onerror="this.closest('.pc-media').classList.add('no-img')">
      <span class="pc-go" aria-hidden="true">Собрать</span>
    </div>
    <div class="pc-body">
      <div class="pc-nm">${g.nm}<span class="pc-pr">${fmt(presetPrice(g.preset))}</span></div>
    </div>`;
  presetList.appendChild(el);
  /* без прокрутки и закрытия панели: посетитель уже у конструктора домиков,
     а планы удобно примерять один за другим */
  el.addEventListener("click", () => {
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
/* Переход в конструктор из витрины и из каталога — один и тот же жест, поэтому
   и едем одинаково: до заголовка конструктора, а не до верха секции, — так
   студия видна сразу. (Кнопки сборки ВНУТРИ самого конструктора никуда не
   скроллят: посетитель уже на месте.) */
function goToBuilder(){
  ($("#builderHead") || builderSec).scrollIntoView({ behavior: "smooth", block: "start" });
}
/* клик по «Собрать в конструкторе» в витрине. Сайдбар НЕ открываем — план и так
   виден в сцене; его карточку помечаем и прокручиваем к ней список, чтобы
   открывший сайдбар сразу увидел выбранную сборку */
function buildFromShowcase(key){
  goToBuilder();
  if (KD.loadPreset(key)) markChosen(key);
}
/* клик по «Добавить в конструктор» в каталоге. Отличие от витрины ровно одно и
   намеренное: сборка встаёт всегда, а отдельному модулю может не найтись места —
   тогда никуда не едем, а объясняем прямо на кнопке, что случилось.
   before() зовут из развёрнутого просмотра, чтобы закрыть его ДО прокрутки:
   пока оверлей открыт, body заперт (overflow:hidden) и ехать некуда. Закрываем
   только после успеха — иначе «Нет места» вспыхнуло бы на уже снятой кнопке */
function addFromCatalog(type, btn, before){
  const r = KD.addModule(type);
  if (!r.ok){ flash(btn, "Нет места"); if (KD.say) KD.say(r.hint, 5000); return false; }
  if (before) before();
  goToBuilder();
  return true;
}
SHOWCASE.forEach(g => {
  const el = document.createElement("div");
  el.className = "sc-card";
  el.dataset.key = g.preset;
  const media = g.img
    ? `<img src="${g.img}" alt="Сборка ${g.nm} в интерьере" loading="lazy">`
    : `<div class="sc-mock"><span>${g.kanji}</span></div>`;
  /* Описание с карточки убрано совсем: на ховере оно перекрывало соседей и
     мешало сравнивать сборки. Читается в развёрнутом просмотре — туда же
     переехала и вся длинная копирайтерская часть */
  /* «развернуть» есть только у сборок с настоящим рендером: мокап с иероглифом
     во весь экран показывать нечего */
  const zoom = g.img
    ? `<button class="sc-open" type="button" aria-label="Открыть сборку ${g.nm} во весь экран">
         <span class="sc-open-i"><span class="zi" aria-hidden="true">⤢</span>Развернуть</span>
       </button>`
    : "";
  el.innerHTML = `
    <div class="sc-media">
      ${media}
      ${zoom}
    </div>
    <div class="sc-ft">
      <div class="sc-nm">${g.nm}<span class="sc-pr">${fmt(presetPrice(g.preset))}</span></div>
      <button class="btn btn-ghost" data-p="${g.preset}">Собрать в конструкторе</button>
    </div>`;
  showcaseGrid.appendChild(el);
  el.querySelector(".sc-ft button").addEventListener("click", () => buildFromShowcase(g.preset));
  const zoomBtn = el.querySelector(".sc-open");
  if (zoomBtn) zoomBtn.addEventListener("click", () => openShowcase(g, zoomBtn));
});

/* ---------- полноэкранный просмотр: одна оболочка на витрину и на каталог ---------- */
/* Карточка показывает картинку, имя и цену; всё остальное — здесь. Содержимое
   правой части собирается на лету, поэтому кнопки у сборки и у модуля разные. */
const lightbox = (function(){
  const back = $("#lbBack");
  if (!back) return { open(){} };
  const box = back.querySelector(".lb"), img = $("#lbImg"),
        info = $("#lbInfo"), xBtn2 = $("#lbX");
  let returnTo = null;

  /* opts: { src, alt, ratio, width, name, meta, desc, actions:[{label,cls,on}] } */
  function open(opts){
    returnTo = opts.trigger || null;
    img.src = opts.src;
    img.alt = opts.alt || "";
    /* --lb-ar для aspect-ratio, --lb-arn числом: в calc() дробь не умножить */
    const ratio = opts.ratio || "1376/768";
    const [rw, rh] = ratio.split("/").map(Number);
    box.style.setProperty("--lb-ar", ratio);
    box.style.setProperty("--lb-arn", rh ? (rw / rh).toFixed(4) : "1");
    box.style.setProperty("--lb-w", opts.width || "1100px");
    info.innerHTML = `
      <div class="lb-nm"><span id="lbName">${opts.name}</span>${opts.meta || ""}</div>
      <p class="lb-ds">${opts.desc}</p>
      <div class="lb-acts"></div>`;
    const acts = info.querySelector(".lb-acts");
    (opts.actions || []).forEach(a => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn " + (a.cls || "btn-ghost");
      b.textContent = a.label;
      b.addEventListener("click", () => a.on(b));
      acts.appendChild(b);
    });
    back.hidden = false;
    /* фон под оверлеем прокручиваться не должен; ширину полосы прокрутки
       возвращаем паддингом, иначе страница дёргается на её исчезновении */
    const gap = window.innerWidth - document.documentElement.clientWidth;
    if (gap > 0) document.body.style.paddingRight = gap + "px";
    document.body.style.overflow = "hidden";
    (acts.firstChild || xBtn2).focus();
  }
  function close(){
    if (back.hidden) return;
    back.hidden = true;
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
    if (returnTo && returnTo.isConnected) returnTo.focus();
    returnTo = null;
  }

  xBtn2.addEventListener("click", close);
  back.addEventListener("click", e => { if (e.target === back) close(); });
  /* Esc закрывает, Tab не выпускает фокус наружу. Кнопки собираются заново на
     каждое открытие, поэтому список остановок считаем в момент нажатия */
  document.addEventListener("keydown", e => {
    if (back.hidden) return;
    if (e.key === "Escape"){ e.stopPropagation(); close(); return; }
    if (e.key !== "Tab") return;
    const stops = [xBtn2].concat(Array.from(info.querySelectorAll("button")));
    const i = stops.indexOf(document.activeElement);
    e.preventDefault();
    stops[(i + (e.shiftKey ? stops.length - 1 : 1) + stops.length) % stops.length].focus();
  }, true);

  return { open, close };
})();

/* короткое подтверждение прямо на кнопке: заказ живёт ниже по странице, без
   обратной связи клик выглядел бы «ничего не произошло». Исходную подпись
   запоминаем ОДИН раз: иначе второй быстрый клик принимал за неё уже
   подменённый текст и «Добавлено ✓» залипало навсегда */
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

function openShowcase(g, trigger){
  lightbox.open({
    trigger, src: g.img, alt: `Сборка ${g.nm} в интерьере`,
    ratio: "1376/768", width: "1100px",
    name: g.nm, meta: `<span class="lb-pr">${fmt(presetPrice(g.preset))}</span>`,
    desc: g.ds,
    actions: [{ label: "Собрать в конструкторе", cls: "btn-aka",
                on: () => { lightbox.close(); buildFromShowcase(g.preset); } }]
  });
}

/* модуль: рендер квадратный, поэтому оболочка уже — иначе картинка занимала бы
   весь экран по высоте. Тут же полное описание, которого нет в карточке */
function openModule(type, card, trigger){
  const m = KD.MODULES[type];
  lightbox.open({
    trigger, src: `assets/module-cards/${card}.jpg`, alt: `Модуль «${m.name}»`,
    ratio: "1/1", width: "760px",
    name: m.name,
    meta: `<span class="lb-jp">${m.jp}</span><span class="lb-pr">${fmt(m.price)}</span>
           <span class="lb-size">${m.size}<span class="mc-prelim">предварительно</span></span>`,
    desc: m.desc,
    /* в развёрнутом просмотре кнопка залита (btn-aka), а на карточке — ghost:
       здесь она одна на весь экран и ей положено быть главной. У сборки в
       витрине ровно так же — см. openShowcase() */
    actions: [
      { label: "Добавить в конструктор", cls: "btn-aka",
        on: b => addFromCatalog(type, b, lightbox.close) }
    ]
  });
}
/* Ту же развёрнутую карточку открывает конструктор — кнопкой «Инфо» в меню
   модуля (см. .em-info в configurator.js). Описание, габариты и цена живут в
   одном месте: показывать их по второму разу отдельной вёрсткой внутри сцены
   значило бы держать два текста про один модуль. */
KD.openModuleCard = (type, trigger) => {
  const c = KD.CATALOG.find(c => c.type === type);
  if (!c || !KD.MODULES[type]) return false;
  openModule(type, c.card, trigger || null);
  return true;
};

/* ---------- выбор цвета ткани на снимке модуля (секция «Продукт») ---------- */
/* ПАРКОВКА: разметка #colorShot из index.html снята — в секции стоит один
   статичный кадр. Инициализатор ниже на такой странице просто выходит на
   проверке в первых строках. Код оставлен целиком, потому что к переключателю
   планируем вернуться; стили .cs-* так же ждут в css/style.css. */
/* Три кадра сняты в одной точке и различаются только тоном ковролина и подушки,
   поэтому переключение читается как смена материала на одном предмете. Разметка
   статическая: без js виден терракотовый кадр — это рабочее состояние, а не
   поломка. Соседние кадры подгружаются заранее, чтобы первый клик не мигал. */
(function colorShot(){
  const root = $("#colorShot");
  const pick = $("#colorShotPick");
  const img  = $("#colorShotImg");
  const prev = $("#colorShotPrev");
  if (!root || !pick || !img) return;

  /* alt пересобираем целиком, а не заменяем слово в строке: цвет стоит в ней
     дважды и в разных падежах («…ковролином» / «…подушкой») */
  const ALT = {
    terracotta: ["терракотовым", "терракотовой"],
    sage:       ["шалфейным",    "шалфейной"],
    charcoal:   ["угольным",     "угольной"],
  };
  const altText = col => `Модуль «Крыша»: домик из берёзовой фанеры с ${ALT[col][0]} `
    + `ковролином на скате, джутовым коньком и плоской ${ALT[col][1]} подушкой внутри`;
  const src = col => `assets/product-color-${col}.jpg?v=2`;
  const swatches = Array.from(pick.querySelectorAll(".cs-sw"));

  /* предзагрузка соседних кадров — но только когда снимок доехал до экрана,
     чтобы не отбирать канал у первого экрана страницы */
  const preload = () => swatches.forEach(b => { new Image().src = src(b.dataset.col); });
  if ("IntersectionObserver" in window){
    const io = new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting)){ preload(); io.disconnect(); }
    }, { rootMargin: "200px" });
    io.observe(root);
  } else preload();

  /* стартовый цвет — угольный: он же стоит в разметке и в src картинки.
     Менять надо в трёх местах сразу, иначе первый клик уедет не туда */
  let cur = "charcoal";
  function set(col){
    if (col === cur || !ALT[col]) return;
    const outgoing = img.currentSrc || img.src;
    cur = col;
    swatches.forEach(b => {
      const on = b.dataset.col === col;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
    });
    /* Меняем src только когда следующий кадр уже в кэше: иначе <img> успевает
       очиститься и в переходе мелькает фон. Пока новый проявляется, уходящий
       держит слой .cs-prev — получается перекрёстное затухание, а не рывок. */
    let swapped = false;
    const swap = () => {
      if (swapped) return;               // у кэшированной картинки complete и onload оба верны
      swapped = true;
      if (prev){
        prev.style.backgroundImage = `url("${outgoing}")`;
        prev.style.transition = "none";
        prev.style.opacity = "1";
        void prev.offsetWidth;           // форсируем reflow до снятия непрозрачности
      }
      img.src = src(col);
      img.alt = altText(col);
      if (prev) requestAnimationFrame(() => {
        prev.style.transition = "";      // возвращаем длительность из css
        prev.style.opacity = "0";
      });
    };
    const next = new Image();
    next.onload = next.onerror = swap;
    next.src = src(col);
    if (next.complete) swap();
  }

  pick.addEventListener("click", e => {
    const b = e.target.closest(".cs-sw");
    if (b) set(b.dataset.col);
  });
  /* стрелками — как в любом radiogroup: образцы это один выбор, а не три кнопки */
  pick.addEventListener("keydown", e => {
    const i = swatches.indexOf(document.activeElement);
    if (i < 0) return;
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1
            : e.key === "ArrowLeft"  || e.key === "ArrowUp"   ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const nx = swatches[(i + d + swatches.length) % swatches.length];
    nx.focus(); set(nx.dataset.col);
  });
})();

/* ---------- галерея кадров в секции «Продукт» ---------- */
/* Раньше это была панорамная карусель на первом экране; секция снята, а код
   переехал вместе с разметкой в правую колонку hero — id и классы там те же.
   Разметка слайдов статическая, первый кадр виден и без js; здесь только
   поведение: стрелки, точки, свайп, клавиатура и автолистание (фото 7 секунд,
   ролик 15 — см. msOf ниже). */
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
    /* ролик играет только на своём кадре и всегда с начала: за краем рамки его
       всё равно не видно, а его кадру отведено ровно 15 секунд — его длина, —
       так он каждый раз проходит цикл целиком, а не подхватывает с середины */
    slides.forEach((s, i) => {
      const v = s.querySelector("video");
      if (!v) return;
      if (i !== cur){ v.pause(); return; }
      if (still.matches) return;      // «поменьше движения» — ждём кнопки Play
      try { v.currentTime = 0; } catch(e){}
      const p = v.play();
      if (p) p.catch(() => {});   // автовоспроизведение могли и запретить
    });
    /* любое листание — хоть руками, хоть по таймеру — отсчитывает паузу
       заново: иначе кадр, который только что выбрали кликом, мог смениться
       через полсекунды остатком прошлого интервала */
    rewind();
    arm();
  }

  /* ---------- автолистание ----------
     Кадр стоит столько, сколько его правда смотрят. Фотографию схватывают
     за пару секунд — ей 7; ролику нужно 15, ровно его длина, чтобы за один
     показ он прошёл цикл целиком, а не обрывался на середине. Один общий
     интервал пришлось бы выбирать между «фото висит вдвое дольше нужного»
     и «ролик режется» — поэтому длительность у каждого кадра своя, и шкала
     под кадром показывает именно её.
     Раньше автосмены здесь не было намеренно, потому что
     она уводит кадр из-под курсора, — поэтому таймер замирает во всех случаях,
     когда человек смотрит именно сюда или не смотрит вообще:
       • галереи нет на экране — крутить нечего;
       • курсор внутри рамки — человек разглядывает кадр;
       • внутри клавиатурный фокус (:focus-visible) — идёт навигация с клавиш.
         Именно focus-visible, а не любой фокус: клик мышью по стрелке в Chrome
         тоже ставит фокус, и по «просто фокусу» автолистание умирало навсегда
         после первого же клика;
       • вкладка в фоне — таймеры там душит сам браузер, и кадры «прыгали» бы
         пачкой при возврате.
     При prefers-reduced-motion автолистания нет вовсе: сама смена кадра в этом
     режиме мгновенная (css гасит transition), и подпрыгивающая без спроса
     картинка — ровно то движение, от которого человек отказался. */
  const PHOTO_MS = 7000, FILM_MS = 15000;
  /* «кадр с роликом» узнаём по самому ролику, а не по номеру слайда: слайды
     верстаются в index.html, и порядок там могут поменять */
  const msOf = i => slides[i].querySelector("video") ? FILM_MS : PHOTO_MS;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let timer = null, hover = false, onScreen = false;
  let span = msOf(0);               // сколько отведено ТЕКУЩЕМУ кадру
  let left = span, since = 0;       // остаток паузы и момент, с которого он тикает
  let fill = null;                  // анимация заливки активной точки — она же шкала

  function keyFocusInside(){
    try { return !!root.querySelector(":focus-visible"); }
    catch(e){ return false; }        // старые браузеры без :focus-visible
  }
  function canRun(){
    return !(still.matches || !onScreen || hover || document.hidden || keyFocusInside());
  }

  /* ---------- шкала под кадром ----------
     Активная точка в .reel-dots заодно показывает, сколько кадру осталось.
     Заливку ведёт WAAPI, а не css-анимация: анимацию-объект можно ставить на
     паузу и снимать ровно там же, где пауза у таймера, — так шкала не считает
     время отдельно от него и не может с ним разойтись. Нет WAAPI (или движение
     отключено) — точка просто остаётся закрашенной, как была до шкалы. */
  function paint(){
    const f = dots[cur].querySelector(".rd-fill");
    if (!f || !f.animate) return;
    /* длительность — span, а не общая константа: у ролика шкала ползёт вдвое
       медленнее, и это честно, ему и стоять вдвое дольше */
    fill = f.animate([{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }],
                     { duration: span, easing: "linear", fill: "forwards" });
    fill.currentTime = span - left;
    fill.pause();                    // играть начнём из run(), если сейчас вообще можно
  }
  /* новый кадр: своя длительность, отсчёт с нуля и пустая шкала */
  function rewind(){
    clearTimeout(timer); timer = null;
    span = msOf(cur);
    left = span;
    if (fill){ fill.cancel(); fill = null; }
    if (!still.matches) paint();
  }
  /* Остановка НЕ обнуляет отсчёт: раньше arm() при каждом событии заводил
     полный интервал заново, и наведение мышью незаметно продлевало кадр.
     Теперь остаток запоминается — иначе шкала врала бы о том, сколько ждать */
  function hold(){
    if (timer){
      clearTimeout(timer); timer = null;
      left = Math.max(0, left - (Date.now() - since));
    }
    if (still.matches && fill){ fill.cancel(); fill = null; return; }  // движение выключили на ходу
    if (fill) fill.pause();
  }
  function run(){
    if (timer) return;               // уже тикает — второй таймер обрезал бы кадр
    since = Date.now();
    timer = setTimeout(() => go(cur + 1), left);
    if (!fill) paint();              // движение включили на ходу
    if (fill) fill.play();
  }
  function arm(){ canRun() ? run() : hold(); }

  /* «поменьше движения»: ролик не запускается сам — но и не пропадает. Отдаём
     человеку обычные элементы управления, чтобы он посмотрел его по своей воле;
     просто заглушить видео значило бы отобрать кадр, а не убрать движение */
  if (still.matches) slides.forEach(s => {
    const v = s.querySelector("video");
    if (!v) return;
    v.removeAttribute("autoplay");
    v.controls = true;
    v.pause();
  });

  go(0);

  if ("IntersectionObserver" in window){
    /* порог 0.5: кадр, наполовину уехавший за край экрана, уже не «смотрят» */
    new IntersectionObserver(es => {
      onScreen = es[0].isIntersecting;
      arm();
    }, { threshold: 0.5 }).observe(root);
  } else { onScreen = true; arm(); }

  root.addEventListener("pointerenter", () => { hover = true;  arm(); });
  root.addEventListener("pointerleave", () => { hover = false; arm(); });
  root.addEventListener("focusin",  arm);
  root.addEventListener("focusout", () => setTimeout(arm, 0));  // activeElement обновится после события
  document.addEventListener("visibilitychange", arm);
  /* в Safari до 14 у MediaQueryList нет addEventListener — там просто не будет
     реакции на смену системной настройки, но обвалить остальную инициализацию
     (стрелки регистрируются ниже) это не должно */
  try { still.addEventListener("change", arm); } catch(e){}

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
  /* картинку нельзя «хватать на буксир»: иначе браузер начинает свой native
     drag-and-drop, глотает pointerup и вместо листания шлёт pointercancel.
     В css это же гасит -webkit-user-drag, но он есть не везде */
  frame.addEventListener("dragstart", e => e.preventDefault());
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
    /* в карточке — КОРОТКАЯ строка (m.short) полосой понизу фото: полный текст
       закрывал стеклом весь модуль, ради которого на карточку и смотрят.
       Полное описание живёт в развёрнутом просмотре */
    el.innerHTML = `
      <div class="mc-media">
        <img src="assets/module-cards/${card}.jpg" alt="Модуль «${m.name}»" loading="lazy" decoding="async">
        <div class="mc-hover">${m.short || m.desc}</div>
        <button class="sc-open mc-open" type="button" data-act="zoom" aria-label="Открыть модуль «${m.name}» во весь экран">
          <span class="sc-open-i"><span class="zi" aria-hidden="true">⤢</span>Развернуть</span>
        </button>
      </div>
      <div class="mc-body">
        <div class="mc-nm">${m.name}<span class="mc-jp">${m.jp}</span></div>
        <div class="mc-size">${m.size}<span class="mc-prelim">предварительно</span></div>
        <div class="mc-pr">${fmt(m.price)}</div>
        <!-- btn-ghost, а не btn-aka: у витрины готовых сборок кнопка на карточке
             ровно такая же, и это один и тот же жест — «положить в конструктор».
             Заливкой в ленте из шести карточек кричал бы каждый модуль сразу -->
        <div class="mc-acts">
          <button class="btn btn-ghost" type="button" data-act="build">Добавить в конструктор</button>
        </div>
      </div>`;
    rail.appendChild(el);
  });

  rail.addEventListener("click", e => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const cardEl = b.closest(".mc-card");
    const type = cardEl.dataset.type;
    if (b.dataset.act === "zoom"){
      openModule(type, KD.CATALOG.find(c => c.type === type).card, b);
      return;
    }
    /* «Добавить в конструктор» — кладём модуль в сцену и едем к ней; подсветку
       места делает сам configurator (KD.scene.pulse) */
    addFromCatalog(type, b);
  });

  /* стрелки-скроллеры: прокручиваем на пару карточек, гасим на краях */
  const railPrev = $("#railPrev"), railNext = $("#railNext");
  const step = () => {
    const c = rail.querySelector(".mc-card");
    return c ? (c.offsetWidth + 16) * 2 : 560;
  };
  const railWrap = rail.closest(".rail-wrap");
  const syncNav = () => {
    const max = rail.scrollWidth - rail.clientWidth;
    const atStart = rail.scrollLeft < 8, atEnd = rail.scrollLeft > max - 8;
    railPrev.disabled = atStart;
    railNext.disabled = atEnd;
    /* матовые затухания по краям живут в css на .rail-wrap и гаснут там же,
       где гаснет стрелка: у самого края прятать уже нечего */
    railWrap.classList.toggle("at-start", atStart);
    railWrap.classList.toggle("at-end", atEnd);
  };
  railPrev.addEventListener("click", () => rail.scrollBy({ left: -step() }));
  railNext.addEventListener("click", () => rail.scrollBy({ left: step() }));
  rail.addEventListener("scroll", syncNav, { passive: true });
  window.addEventListener("resize", syncNav);
  syncNav();
}

/* ---------- компактная шапка на прокрутке ---------- */
/* Липкая шапка в полный рост занимает ~95px и сопровождает человека до самого
   футера. Как только первый экран пролистан, ужимаем её вдвое: знак меньше,
   подпись под названием уезжает (см. .site-head.compact в css/style.css).
   Навигация и переключатель темы не меняются — именно ими и пользуются.
   Два порога, а не один: у единственной границы класс мигал бы туда-сюда,
   потому что сжатие само меняет высоту документа и «подтягивает» страницу. */
(function headShrink(){
  const head = document.querySelector(".site-head");
  if (!head) return;
  const ON = 120, OFF = 40;
  let compact = false, queued = false;
  function check(){
    queued = false;
    const y = window.scrollY;
    if (!compact && y > ON) head.classList.add("compact"), compact = true;
    else if (compact && y < OFF) head.classList.remove("compact"), compact = false;
  }
  window.addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(check);
  }, { passive: true });
  check();   // страницу могли открыть по якорю — уже прокрученной
})();

/* ---------- переключатель темы: авто / светлая / тёмная ---------- */
/* Атрибут data-theme на <html> уже мог быть выставлен инлайн-скриптом в <head>
   (до первой отрисовки, чтобы не мигало). Здесь — только UI и реакция на клик.
   «Авто» СНИМАЕТ атрибут: тогда снова работает @media prefers-color-scheme. */
(function themePick(){
  const box = $("#themePick");
  if (!box) return;
  const KEY = "kd_theme";
  const btns = Array.from(box.querySelectorAll("button[data-theme-set]"));
  /* ?theme= — служебный режим съёмки рендеров: переключатель в нём не врёт,
     но и не перетирает сохранённый выбор пользователя */
  const forced = new URLSearchParams(location.search).get("theme");

  const current = () => {
    const attr = document.documentElement.getAttribute("data-theme");
    return attr === "light" || attr === "dark" ? attr : "auto";
  };
  const mark = () => {
    const cur = current();
    btns.forEach(b => {
      const on = b.dataset.themeSet === cur;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
    });
  };
  mark();

  box.addEventListener("click", e => {
    const b = e.target.closest("button[data-theme-set]");
    if (!b) return;
    const v = b.dataset.themeSet;
    if (v === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", v);
    if (!forced){
      try{
        if (v === "auto") localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, v);
      }catch(err){}
    }
    mark();
    /* сцена конструктора живёт на canvas и CSS-переменных не видит —
       пересобираем её палитру вручную; меню лаза привязано к экранной точке
       и после пересборки «уплывёт», поэтому закрываем его */
    if (KD.closeEntryMenu) KD.closeEntryMenu();
    if (KD.scene && KD.scene.refreshTheme) KD.scene.refreshTheme();
    /* иконки лотка обновлять НЕ нужно: KD.scene.moduleIcon намеренно рисует их
       всегда светлой палитрой (в тёмной теме чипы остаются кремовыми, см. css) */
  });

  /* в режиме «авто» системная тема может смениться на лету — обновляем отметку
     (саму сцену перерисовывает свой слушатель darkMq внутри js/scene.js) */
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (current() === "auto") mark();
  });
})();

/* ---------- логотип = кнопка «домой» ---------- */
const homeLink = document.querySelector(".hanko");
if (homeLink) homeLink.addEventListener("click", e => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

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
/* Состав заказа — ровно то, что стоит в конструкторе. Раньше источников было
   два: рядом с этим шли модули, купленные из каталога кнопкой «В корзину».
   Кнопки сняты (прототипу хватает одного пути «собери и закажи»), поэтому
   корзины больше нет — ни здесь, ни в configurator.js. */
const composition = () => KD.configurator.orderLines();

const lineRow = l => `<li><span class="nm">${l.name} × ${l.n}</span><span class="n">${fmt(l.sum)}</span></li>`;

function compositionHTML(){
  const lines = composition();
  const t = linesTotals(lines);
  return `
    <ul class="order-lines">${lines.map(lineRow).join("")}</ul>
    <ul class="order-lines">
      ${t.disc ? `<li><span>Скидка 5% (от ${KD.DISCOUNT_FROM} модулей)</span><span class="n">−${fmt(t.disc)}</span></li>` : ""}
      <li class="total"><span>Итого</span><span class="n">${fmt(t.total)}</span></li>
    </ul>`;
}

function openCheckout(subtitle){
  const t0 = linesTotals(composition());
  if (!t0.count) return;
  open(`
    <h3>Ваш Котоши</h3>
    <p class="m-sub">${subtitle || "Проверьте состав и оставьте контакты — Момо примет заказ."}</p>
    <div>${compositionHTML()}</div>
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
    const lines = composition();
    const t = linesTotals(lines);
    payStep({
      /* lines — плоский формат для сервера; groups тоже остаётся, хотя группа
         теперь ровно одна: формат письма владельцу на этом завязан */
      lines, total: t.total, disc: t.disc,
      groups: { build: lines, extra: [] },
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
