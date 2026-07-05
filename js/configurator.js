/* КотоДом — конфигуратор: drag-and-drop, правила, цены, заселение */
"use strict";
(function(){
const { COLS, ROWS, CELL, MODULES, PRESETS, SAY, ICONS, fmt } = KD;
const N = COLS * ROWS;

const grid = new Array(N).fill(null);   // cellIndex -> type|null
let undoStack = [];
let animating = false;

const $ = s => document.querySelector(s);
const tray = $("#tray");
const sceneWrap = $("#sceneWrap");
const canvas = $("#scene");
const sumOut = $("#sumOut");
const discOut = $("#discOut");
const maruSay = $("#maruSay");
const maruTxt = $("#maruTxt");
const btnMoveIn = $("#btnMoveIn");
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
const purrSound = () => { blip(300, 380, 0.3, 0.05); setTimeout(() => blip(380, 480, 0.3, 0.05), 180); };

/* ---------- Мару говорит ---------- */
let sayTimer = null;
function say(text, dur){
  maruTxt.textContent = " " + text;
  maruSay.classList.add("show");
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => maruSay.classList.remove("show"), dur || 3000);
}
KD.say = say;

/* ---------- сердечки ---------- */
function heart(cellIndex){
  const pos = KD.scene.cellClientPos(cellIndex);
  const wr = sceneWrap.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = "heart-fx";
  el.textContent = pick(["❤️","🧡","💛","🩷"]);
  el.style.left = (pos.x - wr.left) + "px";
  el.style.top = (pos.y - wr.top - 40) + "px";
  sceneWrap.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

/* ---------- правила ---------- */
function validCells(type){
  const m = MODULES[type];
  const out = [];
  for (let i = 0; i < N; i++){
    if (grid[i]) continue;
    const row = Math.floor(i / COLS);
    const below = row === 0 ? null : grid[i - COLS];
    const belowSupports = below && MODULES[below].supportsAbove;
    let ok;
    if (m.isRoof || m.needsSupport){
      ok = row > 0 && belowSupports;
    } else if (type === "scratch"){
      ok = row === 0;
    } else {
      ok = row === 0 || belowSupports;
    }
    if (ok) out.push(i);
  }
  return out;
}
function canRemove(i){
  const row = Math.floor(i / COLS);
  if (row === ROWS - 1) return true;
  return !grid[i + COLS];
}
const NO_SLOT_HINTS = {
  roof: "Крыше нужна опора — поставьте сначала куб, лежанку или башню.",
  tower: "Башня ставится на куб или лежанку. Сначала — фундамент!",
  hammock: "Гамак вешается над кубом или лежанкой. Постройте что-нибудь под него.",
  scratch: "Когтеточка ставится на пол — а он уже занят.",
};

/* ---------- цена ---------- */
function totals(){
  const items = grid.filter(Boolean);
  const sum = items.reduce((s, t) => s + MODULES[t].price, 0);
  const disc = items.length >= KD.DISCOUNT_FROM ? Math.round(sum * KD.DISCOUNT) : 0;
  return { count: items.length, sum, disc, total: sum - disc };
}
let hadDiscount = false;
function refresh(){
  const t = totals();
  sumOut.textContent = fmt(t.total);
  discOut.textContent = t.disc ? `скидка 5% (−${fmt(t.disc)}) 🎉` : (t.count ? `модулей: ${t.count}` : "");
  const empty = t.count === 0;
  btnMoveIn.disabled = empty || animating;
  btnOrder.disabled = empty || animating;
  btnUndo.disabled = !undoStack.length || animating;
  btnClear.disabled = empty || animating;
  if (t.disc && !hadDiscount){ say(pick(SAY.discount)); hadDiscount = true; }
  if (!t.disc) hadDiscount = false;
}

/* ---------- операции ---------- */
function snapshot(){ undoStack.push(grid.slice()); if (undoStack.length > 40) undoStack.shift(); }

function place(i, type, opts){
  const evicted = KD.scene.isCatSettled();
  KD.scene.catLeave();
  grid[i] = type;
  KD.scene.place(i, type, opts && opts.instant);
  if (!opts || !opts.silent){
    popSound();
    say(evicted ? "Ремонт? Ладно, подожду снаружи." : pick(MODULES[type].say));
  }
  refresh();
}
function removeAt(i){
  const type = grid[i];
  if (!type) return;
  KD.scene.catLeave();
  grid[i] = null;
  KD.scene.remove(i);
  say(pick(SAY.removed));
  blip(340, 200, 0.14, 0.05);
  refresh();
}
function clearAll(silent){
  for (let i = 0; i < N; i++){ if (grid[i]){ grid[i] = null; KD.scene.remove(i); } }
  KD.scene.hideCat();
  if (!silent) say(pick(SAY.empty));
  refresh();
}

/* ---------- лоток ---------- */
function buildTray(){
  Object.entries(MODULES).forEach(([key, m]) => {
    const el = document.createElement("div");
    el.className = "chip";
    el.dataset.type = key;
    el.innerHTML = `${ICONS[key]}<div class="nm">${m.name} <span style="color:var(--muted);font-size:11px">${m.jp}</span></div><div class="pr">${fmt(m.price)}</div>`;
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
  // кэш экранных позиций валидных ячеек
  const pos = {};
  valid.forEach(i => pos[i] = KD.scene.cellClientPos(i));
  const a = KD.scene.cellClientPos(0), b = KD.scene.cellClientPos(1);
  const cellPx = Math.hypot(b.x - a.x, b.y - a.y);
  drag = { type, valid, pos, hot: null, thresh: cellPx * 0.72 };
  ghostEl.innerHTML = ICONS[type];
  ghostEl.style.display = "block";
  moveGhost(e);
  KD.scene.showGhosts(valid, null);
  canvas.classList.add("placing");
  chip.setPointerCapture(e.pointerId);
  chip.addEventListener("pointermove", onDragMove);
  chip.addEventListener("pointerup", onDragUp, { once: true });
  chip.addEventListener("pointercancel", onDragCancel, { once: true });
}
function moveGhost(e){
  ghostEl.style.left = e.clientX + "px";
  ghostEl.style.top = e.clientY + "px";
}
function onDragMove(e){
  if (!drag) return;
  moveGhost(e);
  let best = null, bd = drag.thresh;
  drag.valid.forEach(i => {
    const p = drag.pos[i];
    const d = Math.hypot(p.x - e.clientX, p.y - e.clientY);
    if (d < bd){ bd = d; best = i; }
  });
  if (best !== drag.hot){
    drag.hot = best;
    KD.scene.showGhosts(drag.valid, best);
    if (best !== null) blip(600, 620, 0.04, 0.02);
  }
}
function onDragUp(e){
  const d = drag;
  endDrag(e);
  if (d && d.hot !== null && d.hot !== undefined){
    snapshot();
    place(d.hot, d.type);
  }
}
function onDragCancel(e){ endDrag(e); }
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

/* ---------- клик по сцене = убрать модуль ---------- */
let downPt = null;
canvas.addEventListener("pointerdown", e => { downPt = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener("pointerup", e => {
  if (animating || !downPt) return;
  if (Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y) > 8) return;
  let best = null, bd = 46;
  for (let i = 0; i < N; i++){
    if (!grid[i]) continue;
    const p = KD.scene.cellClientPos(i);
    const d = Math.hypot(p.x - e.clientX, p.y - e.clientY);
    if (d < bd){ bd = d; best = i; }
  }
  if (best === null) return;
  if (!canRemove(best)){ say(pick(SAY.blocked)); KD.scene.pulse(best); return; }
  snapshot();
  removeAt(best);
});

/* ---------- кнопки ---------- */
btnUndo.addEventListener("click", () => {
  if (!undoStack.length || animating) return;
  KD.scene.catLeave();
  const prev = undoStack.pop();
  for (let i = 0; i < N; i++){
    if (grid[i] && !prev[i]) { grid[i] = null; KD.scene.remove(i); }
    else if (!grid[i] && prev[i]) { grid[i] = prev[i]; KD.scene.place(i, prev[i], true); }
    else if (grid[i] !== prev[i] && prev[i]) { KD.scene.remove(i); grid[i] = prev[i]; KD.scene.place(i, prev[i], true); }
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
  snapshot();
  clearAll(true);
  const entries = Object.entries(p.cells).sort((a, b) => a[0] - b[0]);
  entries.forEach(([i, t], k) => {
    setTimeout(() => { place(+i, t, { silent: k < entries.length - 1 }); }, k * 160);
  });
}
KD.loadPreset = loadPreset;

/* ---------- заселение ---------- */
function visitOrder(){
  const filled = [];
  for (let i = 0; i < N; i++) if (grid[i]) filled.push(i);
  if (!filled.length) return [];
  // старт: наземный модуль с лазом > любой наземный > любой
  const start =
    filled.find(i => i < COLS && MODULES[grid[i]].hasEntrance) ??
    filled.find(i => i < COLS) ?? filled[0];
  const seen = new Set([start]);
  const order = [start];
  const q = [start];
  while (q.length){
    const i = q.shift();
    [i - 1, i + 1, i - COLS, i + COLS].forEach(j => {
      if (j < 0 || j >= N || seen.has(j) || !grid[j]) return;
      const sameRow = Math.abs(j - i) === 1 && Math.floor(j / COLS) === Math.floor(i / COLS);
      const sameCol = Math.abs(j - i) === COLS;
      if (sameRow || sameCol){ seen.add(j); order.push(j); q.push(j); }
    });
  }
  // отдельно стоящие (не связанные) — в конец
  filled.forEach(i => { if (!seen.has(i)) order.push(i); });
  return order;
}
function verdict(){
  const t = totals();
  const types = new Set(grid.filter(Boolean));
  const height = Math.max(...grid.map((v, i) => v ? Math.floor(i / COLS) + 1 : 0));
  const score = t.count + types.size + height;
  if (t.count <= 2) return "Неплохо для начала. Но коту моего масштаба нужно больше секций… Добавите тоннель?";
  if (score >= 11) return "Это не домик. Это ДВОРЕЦ. Остаюсь жить, заверните!";
  if (score >= 8)  return "Отличный дом! Есть где спрятаться, что инспектировать и откуда наблюдать.";
  return "Хороший дом! Но чем больше уровней и разных модулей — тем интереснее жить.";
}
btnMoveIn.addEventListener("click", async () => {
  if (animating) return;
  animating = true;
  refresh();
  say(pick(SAY.movein), 2000);
  await KD.scene.catLeave(); // если уже живёт — сперва выбегает, потом новый обход
  const order = visitOrder();
  await KD.scene.moveIn(
    order,
    (i) => { heart(i); return grid[i]; },
    () => { purrSound(); say(verdict(), 6000); }
  );
  animating = false;
  refresh();
});

/* ---------- API для заказа и чата ---------- */
KD.configurator = {
  getGrid: () => grid.slice(),
  totals,
  orderLines(){
    const cnt = {};
    grid.filter(Boolean).forEach(t => cnt[t] = (cnt[t] || 0) + 1);
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
setTimeout(() => say("Привет! Я Мару, приёмщик домов. Соберите мне что-нибудь!", 4200), 900);
})();
