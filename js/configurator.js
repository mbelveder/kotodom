/* Котоши — конфигуратор: drag-and-drop, правила, цены, заселение */
"use strict";
(function(){
const { COLS, ROWS, CELL, MODULES, PRESETS, SAY, EXT, fmt } = KD;
const N = COLS * ROWS;
const wOf = t => (MODULES[t] && MODULES[t].w) || 1;      // ширина модуля в ячейках
const mainOf = i => { while (grid[i] === EXT) i--; return i; }; // маркер → главная ячейка

const grid = new Array(N).fill(null);   // cellIndex -> type|null
let undoStack = [];
let animating = false;

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
const popSound  = () => blip(420, 640, 0.12, 0.06);

/* ---------- Момо говорит ---------- */
let sayTimer = null;
function say(text, dur){
  momoTxt.textContent = " " + text;
  momoSay.classList.add("show");
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => momoSay.classList.remove("show"), dur || 3000);
}
KD.say = say;

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
  const t = totals();
  sumOut.textContent = fmt(t.total);
  discOut.textContent = t.disc ? `скидка 5% (−${fmt(t.disc)}) 🎉` : (t.count ? `модулей: ${t.count}` : "");
  const empty = t.count === 0;
  btnOrder.disabled = empty || animating;
  btnUndo.disabled = !undoStack.length || animating;
  btnClear.disabled = empty || animating;
  if (t.disc && !hadDiscount){ say(pick(SAY.discount)); hadDiscount = true; }
  if (!t.disc) hadDiscount = false;
}

/* ---------- операции ---------- */
function snapshot(){ undoStack.push(grid.slice()); if (undoStack.length > 40) undoStack.shift(); }

/* тоннель: с соседом в ряду — вдоль ряда, одиночный — входом к зрителю */
function tunnelAxis(i){
  const col = i % COLS;
  const left = col > 0 && grid[i - 1];
  const right = col < COLS - 1 && grid[i + 1];
  return (left || right) ? "x" : "z";
}
const tunnelAxes = {};
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
  if (type === "tunnel"){
    tunnelAxes[i] = tunnelAxis(i);
    sceneOpts.tunnelAxis = tunnelAxes[i];
  }
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
  for (let k = 0; k < w; k++) grid[i + k] = null;
  KD.scene.remove(i);
  say(pick(SAY.removed));
  blip(340, 200, 0.14, 0.05);
  refresh();
}
function clearAll(silent){
  for (let i = 0; i < N; i++){ if (grid[i]){ grid[i] = null; KD.scene.remove(i); } }
  if (!silent) say(pick(SAY.empty));
  refresh();
}

/* ---------- лоток ---------- */
const ICON_SRC = {}; // type -> dataURL снимка настоящего Zdog-модуля
function buildTray(){
  Object.entries(MODULES).forEach(([key, m]) => {
    ICON_SRC[key] = KD.scene.moduleIcon(key);
    const el = document.createElement("div");
    el.className = "chip";
    el.dataset.type = key;
    el.innerHTML = `<img class="ico" src="${ICON_SRC[key]}" alt="" draggable="false"><div class="nm">${m.name}<span class="nm-jp">${m.jp}</span></div><div class="pr">${fmt(m.price)}</div>`;
    el.title = m.desc;
    tray.appendChild(el);
    el.addEventListener("pointerdown", e => startDrag(e, key, el));
  });
}

/* ---------- drag-and-drop ---------- */
const ghostEl = $("#dragGhost");
let drag = null;

function startDrag(e, type, chip){
  if (animating) return;
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
/* общий драг: из лотка (origin=null) или перенос модуля из сцены (origin={from, prevGrid}) */
function beginDrag(e, type, el, origin, valid){
  valid = valid || validCells(type);
  if (!valid.length && origin){ place(origin.from, type, { silent: true, instant: true }); return; }
  const w = wOf(type);
  // кэш экранных позиций валидных ячеек (для широких — центр всей площадки)
  const pos = {};
  valid.forEach(i => {
    const p = KD.scene.cellClientPos(i);
    if (w > 1){
      const p2 = KD.scene.cellClientPos(i + w - 1);
      p.x = (p.x + p2.x) / 2; p.y = (p.y + p2.y) / 2;
    }
    pos[i] = p;
  });
  const a = KD.scene.cellClientPos(0), b = KD.scene.cellClientPos(1);
  const cellPx = Math.hypot(b.x - a.x, b.y - a.y);
  drag = { type, valid, pos, hot: null, thresh: cellPx * 0.72, origin, w };
  ghostEl.innerHTML = `<img src="${ICON_SRC[type]}" alt="" draggable="false">`;
  ghostEl.style.display = "block";
  moveGhost(e);
  KD.scene.showGhosts(valid, null, w);
  updateHot(e);   // курсор уже может стоять над валидной ячейкой
  canvas.classList.add("placing");
  el.setPointerCapture(e.pointerId);
  el.addEventListener("pointermove", onDragMove);
  el.addEventListener("pointerup", onDragUp, { once: true });
  el.addEventListener("pointercancel", onDragCancel, { once: true });
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
  if (!drag) return;
  moveGhost(e);
  updateHot(e);
}
function onDragUp(e){
  const d = drag;
  endDrag(e);
  if (!d) return;
  if (d.hot !== null && d.hot !== undefined){
    if (d.origin && d.hot === d.origin.from){
      place(d.hot, d.type, { silent: true, instant: true });  // вернул на прежнее место
      return;
    }
    if (d.origin) undoStack.push(d.origin.prevGrid); else snapshot();
    place(d.hot, d.type, d.origin ? { moved: true } : undefined);
  } else if (d.origin){
    place(d.origin.from, d.type, { silent: true, instant: true }); // не донёс — вернуть
  }
}
function onDragCancel(e){
  const d = drag;
  endDrag(e);
  if (d && d.origin) place(d.origin.from, d.type, { silent: true, instant: true });
}
function endDrag(e){
  if (e && e.target.releasePointerCapture && e.pointerId !== undefined){
    try{ e.target.releasePointerCapture(e.pointerId); }catch(_){}
  }
  e && e.target.removeEventListener("pointermove", onDragMove);
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
  if (!canRemove(i)){ say(pick(SAY.blocked)); KD.scene.pulse(i); return; }
  const type = grid[i];
  const prevGrid = grid.slice();
  for (let k = 0; k < wOf(type); k++) grid[i + k] = null;
  KD.scene.remove(i);
  blip(500, 560, 0.08, 0.04);
  beginDrag(e, type, canvas, { from: i, prevGrid });
});
canvas.addEventListener("pointerup", e => {
  pickPending = null;
  if (animating || !downPt || drag) return;
  if (Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y) > 8) return;
  let best = cellAt(e.clientX, e.clientY);
  if (best === null) return;
  best = mainOf(best);
  if (!canRemove(best)){ say(pick(SAY.blocked)); KD.scene.pulse(best); return; }
  snapshot();
  removeAt(best);
});

/* ---------- кнопки ---------- */
btnUndo.addEventListener("click", () => {
  if (!undoStack.length || animating) return;
  const prev = undoStack.pop();
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
btnClear.addEventListener("click", () => { if (!animating){ snapshot(); clearAll(); } });

document.querySelectorAll(".preset").forEach(b => {
  b.addEventListener("click", () => { if (!animating) loadPreset(b.dataset.preset); });
});
function loadPreset(key){
  const p = PRESETS[key];
  if (!p) return;
  KD.studioBooted = true;
  snapshot();
  clearAll(true);
  const entries = Object.entries(p.cells).sort((a, b) => a[0] - b[0]);
  entries.forEach(([i, t], k) => {
    setTimeout(() => { place(+i, t, { silent: k < entries.length - 1 }); }, k * 160);
  });
}
KD.loadPreset = loadPreset;

/* ---------- API для заказа и чата ---------- */
KD.configurator = {
  getGrid: () => grid.slice(),
  totals,
  orderLines(){
    const cnt = {};
    grid.filter(t => MODULES[t]).forEach(t => cnt[t] = (cnt[t] || 0) + 1);
    return Object.entries(cnt).map(([t, n]) => ({
      type: t, name: MODULES[t].name, n, price: MODULES[t].price, sum: MODULES[t].price * n
    }));
  },
  summary(){
    const lines = this.orderLines();
    if (!lines.length) return "конфигуратор пока пуст";
    const t = totals();
    return lines.map(l => `${l.name}×${l.n}`).join(", ") + ` — итого ${fmt(t.total)}` + (t.disc ? " (со скидкой 5%)" : "");
  }
};

/* ---------- init ---------- */
KD.scene.init();
buildTray();
refresh();

/* конструктор оживает, когда доезжаешь до него: грузим «Мост» с анимацией сборки
   (если пользователь уже выбрал план в галерее — оставляем его выбор) */
const io = new IntersectionObserver(entries => {
  if (!entries[0].isIntersecting) return;
  io.disconnect();
  if (!KD.studioBooted){
    loadPreset("wide");
    setTimeout(() => say("Это план «Мост» — мой любимый. Перетащите что-нибудь из лотка или соберите свой!", 5200), 1600);
  }
}, { threshold: 0.35 });
io.observe(sceneWrap);
})();
