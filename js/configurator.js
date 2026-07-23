/* Котоши — конструктор домиков: drag-and-drop, правила, цены, заселение */
"use strict";
(function(){
const { COLS, ROWS, CELL, MODULES, PRESETS, SAY, EXT, fmt } = KD;
const N = COLS * ROWS;
const wOf = t => (MODULES[t] && MODULES[t].w) || 1;      // ширина модуля в ячейках
const mainOf = i => { while (grid[i] === EXT) i--; return i; }; // маркер → главная ячейка

const grid = new Array(N).fill(null);   // cellIndex -> type|null
const scratchManual = {};   // cellIndex -> true: пользователь повернул пандус вручную (авто-подиум его не трогает)
let undoStack = [];
let animating = false;
let buildGen = 0;      // поколение отложенной сборки (applyCells)
let quietUntil = 0;    // до этого момента идёт сборка — служебные реплики молчат

const $ = s => document.querySelector(s);
const tray = $("#tray");
const sceneWrap = $("#sceneWrap");
const canvas = $("#scene");
const sumOut = $("#sumOut");
const discOut = $("#discOut");
const momoSay = $("#momoSay");
const momoTxt = $("#momoTxt");
const btnOrder = $("#btnOrder");
const btnUndo = $("#btnUndo");
const btnClear = $("#btnClear");

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

/* ---------- звук ---------- */
let actx = null;
function blip(f0, f1, dur, vol){
  try{
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(f0, actx.currentTime);
    o.frequency.exponentialRampToValueAtTime(f1, actx.currentTime + dur);
    g.gain.setValueAtTime(vol, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + dur);
  }catch(e){ /* без звука */ }
}
/* короткий «тик» при перетаскивании модуля между валидными ячейками — единственный
   оставленный звук (см. blip на drag hot-change); остальные сигналы отключены как
   слишком «игрушечные». popSound теперь молчит, чтобы не трогать все места вызова */
const popSound  = () => {};

/* ---------- Момо говорит ---------- */
let sayTimer = null;
function say(text, dur){
  /* пока интро-гид на экране, бабблы не показываем: реплика ушла бы под
     затемнение (KD.guideShown задаёт app.js; первая реплика автосборки
     и так ждёт закрытия интро через KD.onIntroDone) */
  if (KD.guideShown && KD.guideShown()) return;
  clearTimeout(sayTimer);
  /* реплика поверх реплики: баббл «выныривает» заново, а не подменяет текст
     на лету — подмена посреди показа выглядела мерцанием */
  if (momoSay.classList.contains("show")){
    momoSay.classList.remove("show");
    void momoSay.offsetWidth; // перезапуск анимации .show
  }
  momoTxt.textContent = " " + text;
  momoSay.classList.add("show");
  sayTimer = setTimeout(() => momoSay.classList.remove("show"), dur || 3000);
}
KD.say = say;
/* открытый чат прячет независимую реплику — вместе они путают */
KD.hideSay = () => { clearTimeout(sayTimer); momoSay.classList.remove("show"); };

/* ---------- правила ---------- */
function supBelow(i){
  const below = grid[i - COLS];
  const bm = below && MODULES[below];
  return !!(bm && bm.supportsAbove);
}
function validCells(type){
  const m = MODULES[type];
  const w = m.w || 1;
  const out = [];
  for (let i = 0; i < N; i++){
    const row = Math.floor(i / COLS);
    if (i % COLS + w > COLS) continue;      // широкий модуль не влезает в ряд
    let free = true, supAll = true;
    for (let k = 0; k < w; k++){
      if (grid[i + k]) free = false;
      if (row === 0 || !supBelow(i + k)) supAll = false;
    }
    if (!free) continue;
    const ok = (m.isRoof || m.needsSupport) ? (row > 0 && supAll)
                                            : (row === 0 || supAll);
    if (ok) out.push(i);
  }
  return out;
}
function canRemove(i){
  const row = Math.floor(i / COLS);
  if (row === ROWS - 1) return true;
  const w = wOf(grid[i]);
  for (let k = 0; k < w; k++) if (grid[i + COLS + k]) return false;
  return true;
}
const NO_SLOT_HINTS = {
  roof: "Крыше нужна опора — поставьте сначала куб, лежанку или башню.",
  tower: "Башня ставится на куб или лежанку. Сначала — фундамент!",
  hammock: "Гамак вешается над кубом или лежанкой. Постройте что-нибудь под него.",
  hammock2: "Широкому гамаку нужны две соседние опоры — например, два куба в ряд.",
  scratch: "Когтеточке нужен пол или крыша модуля — всё занято.",
  play: "Чаше-лежанке нужен пол или верх модуля — всё занято.",
};

/* ---------- цена ---------- */
function totals(){
  const items = grid.filter(t => MODULES[t]); // без маркеров широких модулей
  const sum = items.reduce((s, t) => s + MODULES[t].price, 0);
  const disc = items.length >= KD.DISCOUNT_FROM ? Math.round(sum * KD.DISCOUNT) : 0;
  return { count: items.length, sum, disc, total: sum - disc };
}
let hadDiscount = false;
function refresh(){
  syncTunnels();
  reorientScratches();
  const t = totals();
  sumOut.textContent = fmt(t.total);
  discOut.textContent = t.disc ? `скидка 5% (−${fmt(t.disc)}) 🎉` : (t.count ? `модулей: ${t.count}` : "");
  btnOrder.textContent = t.count ? `Оформить заказ · ${fmt(t.total)}` : "Оформить заказ";
  const empty = t.count === 0;
  btnOrder.disabled = empty || animating;
  btnUndo.disabled = !undoStack.length || animating;
  btnClear.disabled = empty || animating;
  if (t.disc && !hadDiscount){
    if (Date.now() >= quietUntil) say(pick(SAY.discount)); // в сборке не мигаем
    hadDiscount = true;
  }
  if (!t.disc) hadDiscount = false;
}

/* ---------- операции ---------- */
function snapshot(){ undoStack.push(grid.slice()); if (undoStack.length > 40) undoStack.shift(); }

/* конфигурацию изменили руками (или Момо) — app.js снимает метку «выбранная
   сборка» с карточки плана в сайдбаре: план в сцене уже не совпадает с ней */
function notifyEdit(){ if (KD.onUserEdit) KD.onUserEdit(); }

/* тоннель: с соседом в ряду — вдоль ряда, одиночный — входом к зрителю */
function tunnelAxis(i){
  const col = i % COLS;
  const left = col > 0 && grid[i - 1];
  const right = col < COLS - 1 && grid[i + 1];
  return (left || right) ? "x" : "z";
}
const tunnelAxes = {};
/* когтеточка-пандус по умолчанию встаёт скатом К ближнему кубу (пандус-заезд на
   модуль): куб справа → dir 1 (высокая кромка слева/снаружи, скат спускается
   вправо к кубу), куб слева → dir 3 (высокая кромка справа/снаружи, скат к кубу
   слева). Одиночная — dir 0 (скатом к зрителю). Приоритет: куб > любой модуль,
   справа > слева. Кнопка меню потом крутит вручную. */
function defaultScratchDir(i){
  const col = i % COLS;
  const R = col < COLS - 1 ? grid[i + 1] : null;
  const L = col > 0 ? grid[i - 1] : null;
  const cube = t => t === "base";
  const mod  = t => t && t !== EXT && MODULES[t];
  if (cube(R)) return 1;
  if (cube(L)) return 3;
  if (mod(R))  return 1;
  if (mod(L))  return 3;
  return 0;
}
/* авто-подиум: после каждого изменения сборки доворачиваем НЕ повёрнутые вручную
   пандусы к появившемуся/исчезнувшему соседу (пресеты ставят ячейки по возрастанию,
   так что сосед куба у когтеточки появляется уже после неё) */
function reorientScratches(){
  for (let i = 0; i < N; i++){
    if (grid[i] !== "scratch" || scratchManual[i]) continue;
    const d = defaultScratchDir(i);
    if (KD.scene.getScratchDir(i) !== d) KD.scene.setScratchDir(i, d);
  }
}
function syncTunnels(){
  for (let i = 0; i < N; i++){
    if (grid[i] !== "tunnel"){ delete tunnelAxes[i]; continue; }
    const want = tunnelAxis(i);
    if (tunnelAxes[i] !== want){
      KD.scene.remove(i);
      KD.scene.place(i, "tunnel", true, { tunnelAxis: want, below: i >= COLS ? grid[i - COLS] : null });
      tunnelAxes[i] = want;
    }
  }
}

function place(i, type, opts){
  grid[i] = type;
  const w = wOf(type);
  for (let k = 1; k < w; k++) grid[i + k] = EXT;
  const below = i >= COLS ? grid[i - COLS] : null;
  const sceneOpts = { below };
  if (w > 1) sceneOpts.below2 = i >= COLS ? grid[i - COLS + 1] : null;
  if (opts && opts.entryShape) sceneOpts.entryShape = opts.entryShape; // форма лаза едет с кубом
  if (opts && opts.roof != null) sceneOpts.roof = opts.roof;           // крыша едет с кубом
  if (opts && opts.roofStyle) sceneOpts.roofStyle = opts.roofStyle;    // стиль крыши тоже
  if (type === "tunnel"){
    tunnelAxes[i] = tunnelAxis(i);
    sceneOpts.tunnelAxis = tunnelAxes[i];
  }
  if (type === "scratch"){ delete scratchManual[i]; sceneOpts.scratchDir = defaultScratchDir(i); } // свежая постановка — авто-подиум
  KD.scene.place(i, type, opts && opts.instant, sceneOpts);
  if (!opts || !opts.silent){
    popSound();
    say(opts && opts.moved ? pick(SAY.moved) : pick(MODULES[type].say));
  }
  refresh();
}
function removeAt(i){
  const type = grid[i];
  if (!type) return;
  const w = wOf(type);
  for (let k = 0; k < w; k++){ grid[i + k] = null; delete scratchManual[i + k]; }
  KD.scene.remove(i);
  say(pick(SAY.removed));
  refresh();
}
function clearAll(silent){
  closeEntryMenu();
  for (const k in scratchManual) delete scratchManual[k];
  for (let i = 0; i < N; i++){ if (grid[i]){ grid[i] = null; KD.scene.remove(i); } }
  if (!silent) say(pick(SAY.empty));
  refresh();
}

/* ---------- лоток ---------- */
const ICON_SRC = {}; // type -> dataURL снимка настоящего Zdog-модуля
function buildTray(){
  Object.entries(MODULES).forEach(([key, m]) => {
    /* сбой рендера одной иконки не должен оставлять лоток пустым */
    try{ ICON_SRC[key] = KD.scene.moduleIcon(key); }catch(_){ ICON_SRC[key] = ""; }
    const ico = ICON_SRC[key]
      ? `<img class="ico" src="${ICON_SRC[key]}" alt="" draggable="false">`
      : `<div class="ico ico-txt">${m.jp}</div>`;
    const el = document.createElement("div");
    el.className = "chip";
    el.dataset.type = key;
    el.innerHTML = `${ico}<div class="nm">${m.name}<span class="nm-jp">${m.jp}</span></div><div class="pr">${fmt(m.price)}</div>`;
    el.title = m.desc;
    tray.appendChild(el);
    el.addEventListener("pointerdown", e => startDrag(e, key, el));
  });
}
/* цвет коллекции сменился — перерисовать иконки лотка (когтеточка/крыша в чипах
   теперь другого цвета), не пересобирая сам лоток: обновляем только src картинок */
function refreshTrayIcons(){
  Object.keys(ICON_SRC).forEach(key => {
    try{ ICON_SRC[key] = KD.scene.moduleIcon(key); }catch(_){}
  });
  tray.querySelectorAll(".chip").forEach(el => {
    const img = el.querySelector("img.ico");
    const src = ICON_SRC[el.dataset.type];
    if (img && src) img.src = src;
  });
}

/* ---------- форма лаза: меню у куба ----------
   Лаз выбирается на каждый куб отдельно. Наведение на куб подсвечивает его лаз
   (KD.scene.setEntryHover), клик по кубу открывает у него меню: три формы +
   кнопка «убрать» (см. index.html #entryMenu). Форма — отделка (в undo не пишем,
   состав и цену не трогает); в сцене живёт по индексу ячейки. */
const entryMenu = $("#entryMenu");
const ENTRY_SAY = {
  pentagon: "Лаз-домик — как у настоящего Котоши. Захожу по-хозяйски.",
  circle:  "Круглый лаз — классика. Влезаю боком, вылезаю с достоинством.",
  square:  "Квадратный лаз! Строго. По-самурайски."
};
const ROOF_SAY = {
  asym: ["Асимметричная крыша! Как у настоящего Котоши.", "Скат набок — так стильнее. По-японски.", "Односкатная — длинный скат под когти. Одобряю."],
  sym:  ["Двускатная крыша! Классический домик.", "Ровный конёк по центру — сама гармония.", "Симметрично. Люблю порядок."],
  off:  ["Сняли крышу — люблю панораму.", "Открытый верх: можно валяться прямо на когтеточке.", "Без крыши — больше света. Тоже вариант."]
};
let menuCell = null;   // ячейка открытого меню (или null)
let menuKind = "cube"; // "cube" — куб (лаз + крыша + убрать); "roof" — модуль-крыша (стиль + убрать); "scratch" — когтеточка (поворот + убрать)
const ROT_SAY = ["Развернул пандус. Так удобнее заходить.", "Крутанул когтеточку — новый угол атаки.", "Повернул. Подиум смотрит куда надо."];

function positionMenu(i){
  const p = KD.scene.moduleTopClientPos(i);   // якорь у ВЕРХУШКИ модуля, не по центру
  const r = sceneWrap.getBoundingClientRect();
  entryMenu.style.left = (p.x - r.left) + "px";
  entryMenu.style.top  = (p.y - r.top)  + "px";
}
function markMenuShape(i){
  if (menuKind === "scratch") return;   // у когтеточки нет радио-состояния — только поворот
  if (menuKind === "roof"){
    // модуль-крыша: две кнопки стиля работают как радио — всегда одна активна
    const cur = KD.scene.getRoofStyleAt(i);
    entryMenu.querySelectorAll(".em-roof").forEach(b => {
      const active = b.dataset.roof === cur;
      b.classList.toggle("is-on", active);
      b.setAttribute("aria-pressed", active ? "true" : "false");
    });
    return;
  }
  const cur = KD.scene.getEntryShapeAt(i);
  entryMenu.querySelectorAll(".ep-b").forEach(b => {
    const on = b.dataset.shape === cur;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-checked", on ? "true" : "false");
  });
  const on = KD.scene.hasRoof(i);
  const curRoof = on ? KD.scene.getRoofStyleAt(i) : null;
  entryMenu.querySelectorAll(".em-roof").forEach(b => {
    const active = on && b.dataset.roof === curRoof;
    b.classList.toggle("is-on", active);
    b.setAttribute("aria-pressed", active ? "true" : "false");
  });
}
function openEntryMenu(i, kind){
  menuCell = i;
  menuKind = kind || "cube";
  entryMenu.classList.toggle("roof-only", menuKind === "roof");        // прячет кнопки формы лаза
  entryMenu.classList.toggle("scratch-only", menuKind === "scratch");  // только поворот + убрать
  entryMenu.setAttribute("aria-label",
    menuKind === "roof" ? "Стиль крыши" : menuKind === "scratch" ? "Поворот когтеточки" : "Форма лаза этого куба");
  markMenuShape(i);
  positionMenu(i);
  entryMenu.classList.add("show");
}
function closeEntryMenu(){
  if (menuCell === null) return;
  menuCell = null;
  entryMenu.classList.remove("show");
}
KD.closeEntryMenu = closeEntryMenu;

if (entryMenu){
  entryMenu.addEventListener("click", e => {
    if (menuCell === null || animating) return;
    if (e.target.closest(".em-rm")){          // «убрать» — единственный необратимый пункт меню
      const i = menuCell; closeEntryMenu();
      if (!canRemove(i)){ say(pick(SAY.blocked)); KD.scene.pulse(i); return; }
      snapshot(); notifyEdit(); removeAt(i);
      return;
    }
    if (e.target.closest(".em-rot") && menuKind === "scratch"){  // поворот пандуса (отделка, не в undo)
      const nd = (KD.scene.getScratchDir(menuCell) + 1) % 4;
      if (KD.scene.setScratchDir(menuCell, nd)){
        scratchManual[menuCell] = true;   // ручной поворот — авто-подиум больше не трогает этот пандус
        positionMenu(menuCell);           // высота могла измениться незначительно — переякорим
        popSound(); say(pick(ROT_SAY));
      }
      return;
    }
    const rf = e.target.closest(".em-roof");   // крыша: выбор стиля (отделка, не в undo)
    if (rf){
      const style = rf.dataset.roof;           // "asym" | "sym"
      if (menuKind === "roof"){                 // модуль-крыша: радио, стиль всегда задан
        if (KD.scene.setRoofModuleStyle(menuCell, style)){
          markMenuShape(menuCell);
          popSound(); say(pick(ROOF_SAY[style]));
        }
        return;
      }
      // куб: стиль-тумблер — тот же стиль ещё раз снимает крышу
      const cur = KD.scene.hasRoof(menuCell) ? KD.scene.getRoofStyleAt(menuCell) : null;
      const on = cur !== style;
      const above = menuCell + COLS;           // ячейка сверху: крыше нужен свободный верх
      if (on && above < N && grid[above] && MODULES[grid[above]]){
        say("Сверху стоит модуль — крыше нужен свободный верх. Сначала уберите его.");
        KD.scene.pulse(menuCell);
        return;
      }
      if (KD.scene.setRoofAt(menuCell, on, style)){
        markMenuShape(menuCell);
        popSound(); say(on ? pick(ROOF_SAY[style]) : pick(ROOF_SAY.off));
      }
      return;
    }
    const b = e.target.closest(".ep-b");
    if (b && menuKind === "cube"){
      const s = b.dataset.shape;
      if (KD.scene.setEntryShapeAt(menuCell, s)){
        markMenuShape(menuCell);
        popSound(); say(ENTRY_SAY[s] || "Готово.");
      }
    }
  });
  /* клик мимо меню закрывает его; клик по самому холсту разрулит его pointerup
     (тот же куб — закроет, другой — переоткроет, пустое место — закроет) */
  document.addEventListener("pointerdown", e => {
    if (menuCell !== null && !entryMenu.contains(e.target) && e.target !== canvas) closeEntryMenu();
  }, true);
}

/* ---------- drag-and-drop ---------- */
const ghostEl = $("#dragGhost");
let drag = null;

function startDrag(e, type, chip){
  /* только левая кнопка и первый палец: правый клик открывает контекстное меню
     и глотает pointerup — призрак оставался висеть на экране навсегда */
  if (animating || drag || e.button !== 0 || !e.isPrimary) return;
  e.preventDefault();
  const valid = validCells(type);
  if (!valid.length){
    say(NO_SLOT_HINTS[type] || pick(SAY.noSlot));
    chip.animate(
      [{ transform:"translateX(0)" }, { transform:"translateX(-5px)" }, { transform:"translateX(5px)" }, { transform:"translateX(0)" }],
      { duration: 260 });
    return;
  }
  beginDrag(e, type, chip, null, valid);
}
/* кэш экранных позиций валидных ячеек (для широких — центр всей площадки) */
function cellPositions(valid, w){
  const pos = {};
  valid.forEach(i => {
    const p = KD.scene.cellClientPos(i);
    if (w > 1){
      const p2 = KD.scene.cellClientPos(i + w - 1);
      p.x = (p.x + p2.x) / 2; p.y = (p.y + p2.y) / 2;
    }
    pos[i] = p;
  });
  return pos;
}
/* общий драг: из лотка (origin=null) или перенос модуля из сцены (origin={from, prevGrid}) */
function beginDrag(e, type, el, origin, valid){
  if (drag){ if (origin) place(origin.from, type, { silent: true, instant: true, entryShape: origin.entryShape, roof: origin.roof, roofStyle: origin.roofStyle }); return; }
  valid = valid || validCells(type);
  if (!valid.length && origin){ place(origin.from, type, { silent: true, instant: true, entryShape: origin.entryShape, roof: origin.roof, roofStyle: origin.roofStyle }); return; }
  const w = wOf(type);
  const pos = cellPositions(valid, w);
  const a = KD.scene.cellClientPos(0), b = KD.scene.cellClientPos(1);
  const cellPx = Math.hypot(b.x - a.x, b.y - a.y);
  drag = { type, valid, pos, hot: null, thresh: Math.max(cellPx * 0.72, 26),
           origin, w, el, pointerId: e.pointerId };
  ghostEl.innerHTML = ICON_SRC[type]
    ? `<img src="${ICON_SRC[type]}" alt="" draggable="false">`
    : `<div class="ico-txt">${MODULES[type].jp}</div>`;
  ghostEl.style.display = "block";
  moveGhost(e);
  KD.scene.showGhosts(valid, null, w);
  updateHot(e);   // курсор уже может стоять над валидной ячейкой
  canvas.classList.add("placing");
  el.addEventListener("pointermove", onDragMove);
  el.addEventListener("pointerup", onDragUp);
  el.addEventListener("pointercancel", onDragCancel);
  try{ el.setPointerCapture(e.pointerId); }catch(_){}
  /* страховка: если capture не сработал или отпускание ушло мимо элемента
     (потеря фокуса, второй палец, контекстное меню) — драг всё равно
     завершится, и призрак не останется висеть на экране */
  window.addEventListener("pointerup", onDragUp);
  window.addEventListener("pointercancel", onDragCancel);
  window.addEventListener("blur", onWinBlur);
  window.addEventListener("contextmenu", onCtxMenu, true);
  window.addEventListener("scroll", onViewChange, true);
  window.addEventListener("resize", onViewChange);
}
function moveGhost(e){
  ghostEl.style.left = e.clientX + "px";
  ghostEl.style.top = e.clientY + "px";
}
function updateHot(e){
  if (!drag) return;
  let best = null, bd = drag.thresh;
  drag.valid.forEach(i => {
    const p = drag.pos[i];
    const d = Math.hypot(p.x - e.clientX, p.y - e.clientY);
    if (d < bd){ bd = d; best = i; }
  });
  if (best !== drag.hot){
    drag.hot = best;
    KD.scene.showGhosts(drag.valid, best, drag.w);
    if (best !== null) blip(600, 620, 0.04, 0.02);
  }
}
function onDragMove(e){
  if (!drag || e.pointerId !== drag.pointerId) return;
  moveGhost(e);
  updateHot(e);
}
function onDragUp(e){
  if (!drag || e.pointerId !== drag.pointerId) return;
  const d = drag;
  endDrag();
  if (d.hot !== null && d.hot !== undefined){
    if (d.origin && d.hot === d.origin.from){
      place(d.hot, d.type, { silent: true, instant: true, entryShape: d.origin.entryShape, roof: d.origin.roof, roofStyle: d.origin.roofStyle });  // вернул на прежнее место
      return;
    }
    /* пока шёл драг, ячейку могла занять отложенная сборка пресета */
    if (!validCells(d.type).includes(d.hot)){
      if (d.origin) place(d.origin.from, d.type, { silent: true, instant: true, entryShape: d.origin.entryShape, roof: d.origin.roof, roofStyle: d.origin.roofStyle });
      return;
    }
    if (d.origin) undoStack.push(d.origin.prevGrid); else snapshot();
    notifyEdit();
    place(d.hot, d.type, d.origin ? { moved: true, entryShape: d.origin.entryShape, roof: d.origin.roof, roofStyle: d.origin.roofStyle } : undefined);
  } else if (d.origin){
    place(d.origin.from, d.type, { silent: true, instant: true, entryShape: d.origin.entryShape, roof: d.origin.roof, roofStyle: d.origin.roofStyle }); // не донёс — вернуть
  }
}
function onDragCancel(e){
  if (!drag || e.pointerId !== drag.pointerId) return;
  cancelDrag();
}
function cancelDrag(){
  const d = drag;
  endDrag();
  if (d && d.origin) place(d.origin.from, d.type, { silent: true, instant: true, entryShape: d.origin.entryShape, roof: d.origin.roof, roofStyle: d.origin.roofStyle });
}
/* сцена пересобирается при смене темы — драг со ссылками на старую сцену не жилец */
KD.cancelDrag = cancelDrag;
function onWinBlur(){ cancelDrag(); }
function onCtxMenu(e){ e.preventDefault(); } // меню посреди драга глотает pointerup
function onViewChange(){
  if (!drag) return;
  drag.pos = cellPositions(drag.valid, drag.w); // страница сдвинулась — ячейки теперь в других экранных координатах
}
function endDrag(){
  if (drag && drag.el){
    try{ drag.el.releasePointerCapture(drag.pointerId); }catch(_){}
    drag.el.removeEventListener("pointermove", onDragMove);
    drag.el.removeEventListener("pointerup", onDragUp);
    drag.el.removeEventListener("pointercancel", onDragCancel);
  }
  window.removeEventListener("pointerup", onDragUp);
  window.removeEventListener("pointercancel", onDragCancel);
  window.removeEventListener("blur", onWinBlur);
  window.removeEventListener("contextmenu", onCtxMenu, true);
  window.removeEventListener("scroll", onViewChange, true);
  window.removeEventListener("resize", onViewChange);
  ghostEl.style.display = "none";
  KD.scene.clearGhosts();
  canvas.classList.remove("placing");
  drag = null;
}

/* ---------- модуль в сцене: короткий клик = убрать, потянул = перенести ---------- */
function cellAt(x, y){
  let best = null, bd = 46;
  for (let i = 0; i < N; i++){
    if (!grid[i]) continue;
    const p = KD.scene.cellClientPos(i);
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bd){ bd = d; best = i; }
  }
  return best;
}
let downPt = null, pickPending = null;
canvas.addEventListener("pointerdown", e => {
  if (e.button !== 0 || !e.isPrimary){ downPt = null; pickPending = null; return; }
  downPt = { x: e.clientX, y: e.clientY };
  if (animating) return;
  const i = cellAt(e.clientX, e.clientY);
  pickPending = i === null ? null : { i, x: e.clientX, y: e.clientY };
});
canvas.addEventListener("pointermove", e => {
  if (!pickPending || drag || animating) return;
  if (Math.hypot(e.clientX - pickPending.x, e.clientY - pickPending.y) <= 8) return;
  const i = mainOf(pickPending.i);
  pickPending = null; downPt = null;
  closeEntryMenu();
  if (!canRemove(i)){ say(pick(SAY.blocked)); KD.scene.pulse(i); return; }
  const type = grid[i];
  const prevGrid = grid.slice();
  const entryShape = KD.scene.hasEntry(i) ? KD.scene.getEntryShapeAt(i) : null; // лаз едет с кубом
  const roof = KD.scene.hasEntry(i) ? KD.scene.getRoofAt(i) : null;             // крыша едет с кубом
  const roofStyle = roof ? KD.scene.getRoofStyleAt(i) : null;                   // и её стиль
  for (let k = 0; k < wOf(type); k++) grid[i + k] = null;
  KD.scene.remove(i);
  beginDrag(e, type, canvas, { from: i, prevGrid, entryShape, roof, roofStyle });
});
canvas.addEventListener("pointerup", e => {
  pickPending = null;
  if (animating || !downPt || drag) return;
  if (Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y) > 8) return;
  let best = cellAt(e.clientX, e.clientY);
  if (best === null){ closeEntryMenu(); return; }
  best = mainOf(best);
  /* куб: клик открывает меню (лаз + крыша + убрать), а не удаляет сразу —
     удаление куба живёт в меню. Модуль-крыша: клик открывает меню стиля крыши
     (asym/sym + убрать). Остальные модули убираются как прежде */
  if (KD.scene.hasEntry(best)){
    if (menuCell === best && menuKind === "cube") closeEntryMenu(); else openEntryMenu(best, "cube");
    return;
  }
  if (grid[best] === "roof"){
    if (menuCell === best && menuKind === "roof") closeEntryMenu(); else openEntryMenu(best, "roof");
    return;
  }
  if (grid[best] === "scratch"){   // когтеточка: клик открывает меню поворота (+ убрать)
    if (menuCell === best && menuKind === "scratch") closeEntryMenu(); else openEntryMenu(best, "scratch");
    return;
  }
  closeEntryMenu();
  if (!canRemove(best)){ say(pick(SAY.blocked)); KD.scene.pulse(best); return; }
  snapshot();
  notifyEdit();
  removeAt(best);
});

/* наведение на куб слегка подсвечивает его лаз — подсказка, что по нему кликают */
canvas.addEventListener("pointermove", e => {
  if (drag || animating) return;
  const i = cellAt(e.clientX, e.clientY);
  KD.scene.setEntryHover(i !== null && KD.scene.hasEntry(mainOf(i)) ? mainOf(i) : null);
});
canvas.addEventListener("pointerleave", () => KD.scene.setEntryHover(null));

/* ---------- кнопки ---------- */
btnUndo.addEventListener("click", () => {
  if (!undoStack.length || animating) return;
  closeEntryMenu();
  buildGen++; // отменяем «хвост» отложенной сборки
  const prev = undoStack.pop();
  notifyEdit();
  const bel = i => (i >= COLS ? prev[i - COLS] : null);
  for (let i = 0; i < N; i++){
    if (grid[i] === prev[i]) continue;
    if (MODULES[grid[i]]) KD.scene.remove(i); // маркеры EXT в сцене не живут
    grid[i] = prev[i];
    if (MODULES[prev[i]]){
      const o = { below: bel(i) };
      if (wOf(prev[i]) > 1) o.below2 = bel(i + 1);
      KD.scene.place(i, prev[i], true, o);
    }
  }
  refresh();
});
/* «Очистить» сносит всю сборку разом — просим второй клик как подтверждение:
   первый клик «взводит» кнопку (подпись меняется), повторный — очищает,
   4 секунды бездействия — тихий откат */
let clearArmTimer = null;
const disarmClear = () => {
  clearTimeout(clearArmTimer);
  btnClear.classList.remove("armed");
  btnClear.textContent = "Очистить";
};
btnClear.addEventListener("click", () => {
  if (animating) return;
  if (!btnClear.classList.contains("armed")){
    btnClear.classList.add("armed");
    btnClear.textContent = "Точно убрать всё?";
    clearTimeout(clearArmTimer);
    clearArmTimer = setTimeout(disarmClear, 4000);
    return;
  }
  disarmClear();
  buildGen++; snapshot(); notifyEdit(); clearAll();
});

/* реплика при выборе плана — про состав сборки (без имени плана: оно вторично).
   Возвращает true, если сборка реально запустилась (app.js по этому признаку
   помечает карточку плана «выбранной») */
function loadPreset(key){
  const p = PRESETS[key];
  if (!p) return false;
  return applyCells(p.cells, p.say, p.roofs, p.roofStyles, p.entries);
}
KD.loadPreset = loadPreset;

/* сборка произвольной конфигурации (пресеты, предложения Момо) с проверкой правил:
   ставим снизу вверх, невалидные ячейки молча пропускаем.
   Вся сборка тихая, одна реплика в конце (doneSay) — иначе реплики модулей
   и скидки мигали одна за другой. buildGen отменяет «хвост» отложенных
   постановок, если пользователь успел очистить сцену, отменить ход или
   запустить другую сборку — раньше два быстрых клика по планам смешивали их */
function applyCells(cells, doneSay, roofs, roofStyles, entrySh){
  if (animating) return false;
  KD.studioBooted = true;
  const gen = ++buildGen;
  snapshot();
  clearAll(true);
  const roofSet = new Set((roofs || []).map(Number)); // кубы с включённой крышей
  const styleAt = i => roofStyles && roofStyles[i];   // стиль крыши ячейки (куб или модуль-крыша)
  const shapeAt = i => entrySh && entrySh[i];         // форма лаза ячейки (для планов с 3+ кубами)
  const entries = Object.entries(cells)
    .map(([i, t]) => [+i, t])
    .filter(([i, t]) => Number.isInteger(i) && i >= 0 && i < N && MODULES[t])
    .sort((a, b) => a[0] - b[0]);
  quietUntil = Date.now() + entries.length * 160 + 400;
  const skipped = []; // модули, для которых Момо предложил невалидную ячейку — отчитываемся, а не молчим
  entries.forEach(([i, t], step) => {
    setTimeout(() => {
      if (gen !== buildGen) return;               // сборку перебили
      const ok = validCells(t).includes(i);        // нет опоры/занято — пропускаем, но запоминаем
      if (ok) place(i, t, { silent: true, roof: t === "base" ? roofSet.has(i) : undefined,
                            roofStyle: (t === "base" || t === "roof") ? styleAt(i) : undefined,
                            entryShape: t === "base" ? shapeAt(i) : undefined }); else skipped.push(t);
      if (step === entries.length - 1){
        popSound();
        if (skipped.length){
          const names = [...new Set(skipped)].map(x => (MODULES[x] && MODULES[x].name) || x).join(", ");
          say(`Не поместилось: ${names} — не хватило опоры или места. Передвиньте модули вручную, чтобы освободить место.`, 6500);
        } else if (doneSay) say(doneSay, Math.max(4800, doneSay.length * 55)); // длинной реплике — больше времени
      }
    }, step * 160);
  });
  return entries.length > 0;
}
KD.applyConfig = cells => {
  const ok = applyCells(cells, "Собрал! Двигайте модули, если хочется по-другому.");
  if (ok) notifyEdit(); // сборка от Момо — уже не «готовый план» из сайдбара
  return ok;
};

/* ---------- API для заказа и чата ---------- */
KD.configurator = {
  getGrid: () => grid.slice(),
  totals,
  /* индекс:тип текущих ячеек — тот же формат, что в маркере [[BUILD:…]] Момо,
     чтобы модель получала РЕАЛЬНЫЕ позиции вместо угадывания по названию×count */
  cellsSummary(){
    const parts = [];
    for (let i = 0; i < N; i++) if (grid[i] && grid[i] !== EXT) parts.push(`${i}:${grid[i]}`);
    return parts.join(",");
  },
  orderLines(){
    const cnt = {};
    grid.filter(t => MODULES[t]).forEach(t => cnt[t] = (cnt[t] || 0) + 1);
    return Object.entries(cnt).map(([t, n]) => ({
      type: t, name: MODULES[t].name, n, price: MODULES[t].price, sum: MODULES[t].price * n
    }));
  },
  summary(){
    const lines = this.orderLines();
    if (!lines.length) return "конструктор домиков пока пуст";
    const t = totals();
    return lines.map(l => `${l.name}×${l.n}`).join(", ") + ` — итого ${fmt(t.total)}` + (t.disc ? " (со скидкой 5%)" : "");
  }
};

/* ---------- init ---------- */
KD.scene.init();
buildTray();
refresh();

/* ---------- выбор цвета когтеточки/ковра (глобальная коллекция) ----------
   Одна коллекция задаёт цвет и когтеточки, и ковра — по правилу брендворлда.
   ?collection=sage|charcoal|natural — применить сразу (для соло-съёмки рендеров). */
const collectionPick = $("#collectionPick");
function markCollection(){
  if (!collectionPick) return;
  const cur = KD.scene.getCollection();
  collectionPick.querySelectorAll(".cp-sw").forEach(b => {
    const on = b.dataset.col === cur;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-checked", on ? "true" : "false");
  });
}
if (collectionPick){
  collectionPick.addEventListener("click", e => {
    const b = e.target.closest(".cp-sw");
    if (!b || animating) return;
    if (KD.scene.setCollection(b.dataset.col)){
      markCollection();
      refreshTrayIcons();
      popSound();
    }
  });
}
(function(){
  const c = new URLSearchParams(location.search).get("collection");
  if (c && KD.scene.setCollection(c)) refreshTrayIcons();
  markCollection();
})();

/* меню лаза привязано к экранной точке куба — при прокрутке/ресайзе/смене темы
   оно «уплывёт» от куба, поэтому просто закрываем его */
["scroll", "resize"].forEach(ev => window.addEventListener(ev, closeEntryMenu, true));
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", closeEntryMenu);

/* конструктор домиков оживает, когда доезжаешь до него: собираем стартовую «Проныру»,
   но МОЛЧА — первая реплика Момо ждёт, пока посетитель сам возьмётся за сборку
   (перетащит модуль, уберёт его или выберет план). Ждём и закрытия гида, чтобы
   сборка не анимировалась за затемнением (см. KD.onIntroDone в app.js) */
const io = new IntersectionObserver(entries => {
  if (!entries[0].isIntersecting) return;
  io.disconnect();
  if (!KD.studioBooted){
    const boot = () => { if (!KD.studioBooted) applyCells(PRESETS.wide.cells); };
    if (KD.onIntroDone) KD.onIntroDone(boot); else boot();
  }
}, { threshold: 0.35 });
io.observe(sceneWrap);

/* ---------- служебный «соло»-режим: ?solo[=пресет] ----------
   Показывает в сцене ТОЛЬКО постройку на ровном фоне — без комнаты, декора,
   подписей размеров и интерфейса страницы. Нужен, чтобы снимать чистые
   структурные референсы постройки под генерацию фото-рендеров.
   Примеры: ?solo=watch, ?solo=zoomies, ?solo (текущая/пустая сцена).
   ?solo&module=tower — ОДИН модуль по центру пола (для каталога модулей). */
(function solo(){
  const params = new URLSearchParams(location.search);
  if (!params.has("solo")) return;
  const key = params.get("solo");
  const moduleType = params.get("module");   // одиночный модуль для карточек-каталога
  const entryShape = params.get("entry");     // форма лаза для соло-куба: circle|square|pentagon
  const CENTER = 2;                          // центральная ячейка нижнего ряда (row0,col2)
  const placeSoloModule = t => {
    if (!MODULES[t]) return;
    KD.scene.place(CENTER, t, true, entryShape ? { entryShape } : {});
  };
  KD.studioBooted = true;                 // гид и авто-сборка не вмешиваются
  io.disconnect();
  const strip = () => {
    // прячем всё, кроме цепочки предков холста: на каждом уровне от sceneWrap
    // до <body> гасим соседей — остаётся только сцена
    let node = sceneWrap;
    while (node && node.parentElement){
      for (const sib of node.parentElement.children) if (sib !== node) sib.style.display = "none";
      if (node.parentElement === document.body) break;
      node = node.parentElement;
    }
    // и оверлеи ВНУТРИ sceneWrap (они — соседи холста, цикл выше их не трогает)
    ["#builderHead", "#momoSay", "#momoFab", "#buildGuide", ".price-tag", "#presetTab"]
      .forEach(s => { const e = document.querySelector(s); if (e) e.style.display = "none"; });
    // подсказки-ярлыки (.bg-tip: «Размеры модулей…», чат) — оверлеи поверх сцены
    document.querySelectorAll(".bg-tip").forEach(e => { e.style.display = "none"; });
    document.body.style.background = "#F2ECDD";
    window.scrollTo(0, 0);
  };
  const enter = () => {
    strip();
    if (moduleType) placeSoloModule(moduleType);
    else if (PRESETS[key]) loadPreset(key);
    KD.scene.soloHouse();
    // повторяем изоляцию после отложенной сборки пресета (place() держит houseA в кадре)
    const delay = PRESETS[key] ? Object.keys(PRESETS[key].cells).length * 160 + 500 : 200;
    setTimeout(() => {
      if (moduleType) placeSoloModule(moduleType);
      KD.scene.soloHouse();
    }, delay);
  };
  if (document.readyState === "complete") enter();
  else window.addEventListener("load", enter);
})();
})();
