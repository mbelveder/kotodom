/* КотоДом — Zdog-сцена: комната, модули, кот Мару */
"use strict";
(function(){
const { COLS, ROWS, CELL, MODULES } = KD;
const TAU = Zdog.TAU;
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- палитры ---------- */
const PALETTES = {
  light: {
    wall:"#EFE4CE", wallSide:"#E5D7BC", floor:"#E3CBA2", floorSide:"#C9AC80",
    rug:"#D96A55", rugIn:"#F0DFC8",
    wood:"#DCB683", wood2:"#C09263", woodTop:"#EBCB97", hole:"#4A3C50",
    aka:"#C7423A", akaDeep:"#A93129", sakura:"#F3CDC6", cushion:"#EFB9AF",
    jute:"#C89B6C", juteDark:"#AB8050",
    matcha:"#6E8F63", matchaDark:"#57744E", pot:"#B0705A",
    lamp:"#F7E5B5", lampGlow:"rgba(247,224,172,0.30)", lampRib:"#D9BE8A", stand:"#6B5F52",
    cat:"#FFFDF8", ink:"#2E2A33", ghost:"rgba(199,66,58,0.16)", ghostHot:"rgba(199,66,58,0.42)",
    windowGlow:"#FBF3DC", shoji:"#C9B48E"
  },
  dark: {
    wall:"#33303F", wallSide:"#2B2837", floor:"#4E4258", floorSide:"#3B3244",
    rug:"#A34A3C", rugIn:"#5A4E62",
    wood:"#C9A26C", wood2:"#A87F52", woodTop:"#DDB87E", hole:"#1E1A26",
    aka:"#E05A4E", akaDeep:"#C74338", sakura:"#B27A72", cushion:"#C08A80",
    jute:"#B98F5C", juteDark:"#97713F",
    matcha:"#7FA271", matchaDark:"#5F7E54", pot:"#9A6350",
    lamp:"#F3D992", lampGlow:"rgba(243,217,146,0.22)", lampRib:"#C7A860", stand:"#8A7E6E",
    cat:"#FBF7EC", ink:"#221F2B", ghost:"rgba(224,90,78,0.20)", ghostHot:"rgba(224,90,78,0.5)",
    windowGlow:"#4A4258", shoji:"#5A5166"
  }
};
let P = PALETTES.light;
const darkMq = matchMedia("(prefers-color-scheme: dark)");

/* ---------- геометрия сетки ---------- */
const GROUND = 118;                       // y пола (вниз положительно)
const cellX = c => (c - (COLS-1)/2) * CELL;
const cellY = r => GROUND - CELL/2 - r*CELL;
const colOf = i => i % COLS;
const rowOf = i => Math.floor(i / COLS);

/* ---------- состояние ---------- */
let illo, world, houseA, ghostA, catA, peekA;
let canvas;
let cellAnchors = [];      // якоря центров ячеек (для проекции)
let moduleAnchors = {};    // cellIndex -> anchor модуля
let ghostShapes = [];
let sway = 0;
let dirty = true;
let popAnims = [];         // {anchor, t0, dur}

/* ---------- helpers ---------- */
function box(a, o){ return new Zdog.Box(Object.assign({ addTo:a, stroke:1 }, o)); }

function makeModule(type, parent){
  const a = new Zdog.Anchor({ addTo: parent });
  const S = CELL - 10; // видимый размер
  if (type === "base"){
    box(a, { width:S, height:S, depth:S,
      topFace:P.woodTop, bottomFace:P.wood2, leftFace:P.wood2, rightFace:P.wood,
      frontFace:P.wood, rearFace:P.wood2, color:P.wood });
    new Zdog.Ellipse({ addTo:a, diameter:S*0.52, translate:{ z:S/2+0.8 }, fill:true, stroke:1, color:P.hole });
  }
  else if (type === "lounge"){
    const h = S*0.5;
    box(a, { width:S, height:h, depth:S, translate:{ y:(S-h)/2 },
      topFace:P.woodTop, bottomFace:P.wood2, leftFace:P.wood2, rightFace:P.wood,
      frontFace:P.wood, rearFace:P.wood2, color:P.wood });
    new Zdog.Ellipse({ addTo:a, width:S*0.74, height:S*0.6,
      rotate:{ x:TAU/4 }, translate:{ y:(S-h)/2 - h/2 - 4 },
      stroke:10, fill:true, color:P.cushion });
  }
  else if (type === "tunnel"){
    // слегка развёрнут, чтобы был виден тёмный вход
    const t = new Zdog.Anchor({ addTo:a, rotate:{ y:-0.55 } });
    new Zdog.Cylinder({ addTo:t, diameter:S*0.78, length:S+2,
      rotate:{ y:TAU/4 }, color:P.wood, frontFace:P.hole, backface:P.hole, stroke:false });
    new Zdog.Ellipse({ addTo:t, diameter:S*0.78, rotate:{ y:TAU/4 }, translate:{ x:(S+2)/2 },
      stroke:4, color:P.wood2 });
    new Zdog.Ellipse({ addTo:t, diameter:S*0.78, rotate:{ y:TAU/4 }, translate:{ x:-(S+2)/2 },
      stroke:4, color:P.wood2 });
  }
  else if (type === "tower"){
    box(a, { width:14, height:S-8, depth:14, translate:{ y:4 },
      topFace:P.wood2, color:P.wood2, leftFace:P.juteDark, rightFace:P.wood2,
      frontFace:P.wood2, rearFace:P.juteDark });
    box(a, { width:S+4, height:9, depth:S-4, translate:{ y:-(S/2)+4 },
      topFace:P.woodTop, bottomFace:P.wood2, leftFace:P.wood2, rightFace:P.wood,
      frontFace:P.wood, rearFace:P.wood2, color:P.wood });
    new Zdog.Ellipse({ addTo:a, width:S*0.6, height:S*0.44,
      rotate:{ x:TAU/4 }, translate:{ y:-(S/2)-1 }, stroke:7, fill:true, color:P.cushion });
  }
  else if (type === "hammock"){
    const H = S-6;
    box(a, { width:6, height:H, depth:6, translate:{ x:-S/2+5 }, color:P.wood2,
      topFace:P.woodTop, leftFace:P.juteDark, rightFace:P.wood2, frontFace:P.wood2, rearFace:P.juteDark, bottomFace:P.juteDark });
    box(a, { width:6, height:H, depth:6, translate:{ x:S/2-5 }, color:P.wood2,
      topFace:P.woodTop, leftFace:P.juteDark, rightFace:P.wood2, frontFace:P.wood2, rearFace:P.juteDark, bottomFace:P.juteDark });
    new Zdog.Shape({ addTo:a, stroke:11, color:P.sakura,
      path:[ { x:-S/2+7, y:-H/2+6 },
             { bezier:[ { x:-10, y:8 }, { x:10, y:8 }, { x:S/2-7, y:-H/2+6 } ] } ] });
  }
  else if (type === "roof"){
    const W = S+8, slope = S*0.72;
    new Zdog.Rect({ addTo:a, width:W, height:slope, fill:true, stroke:4, color:P.aka,
      rotate:{ x:-TAU/8 }, translate:{ y:13, z: S/4+2 } });
    new Zdog.Rect({ addTo:a, width:W, height:slope, fill:true, stroke:4, color:P.akaDeep,
      rotate:{ x:TAU/8 }, translate:{ y:13, z:-S/4-2 } });
    // фронтоны
    [-1,1].forEach(s => new Zdog.Shape({ addTo:a, fill:true, stroke:1, color:P.wood,
      path:[ { x:s*(W/2-2), y:S/2+4, z:S/2-4 }, { x:s*(W/2-2), y:-S*0.1, z:0 }, { x:s*(W/2-2), y:S/2+4, z:-S/2+4 } ] }));
  }
  else if (type === "scratch"){
    new Zdog.Cylinder({ addTo:a, diameter:17, length:S-12, rotate:{ x:TAU/4 },
      translate:{ y:-2 }, color:P.jute, frontFace:P.juteDark, backface:P.juteDark, stroke:false });
    for (let k=0;k<5;k++){
      new Zdog.Ellipse({ addTo:a, diameter:17.5, rotate:{ x:TAU/4 },
        translate:{ y:-2 - (S-16)/2 + k*(S-16)/4 }, stroke:1.4, color:P.juteDark });
    }
    new Zdog.Cylinder({ addTo:a, diameter:40, length:7, rotate:{ x:TAU/4 },
      translate:{ y:S/2-6 }, color:P.wood2, frontFace:P.woodTop, backface:P.wood2, stroke:false });
    new Zdog.Shape({ addTo:a, stroke:9, color:P.sakura, path:[{ y:-S/2+7 }] }); // помпон
  }
  return a;
}

/* ---------- кот Мару ---------- */
function makeCat(parent){
  const a = new Zdog.Anchor({ addTo: parent });
  const g = new Zdog.Anchor({ addTo: a });   // масштабируемая группа
  // хвост
  new Zdog.Shape({ addTo:g, stroke:8, color:P.cat,
    path:[ { x:-14, y:2 }, { bezier:[ { x:-26, y:0 }, { x:-28, y:-14 }, { x:-22, y:-20 } ] } ] });
  // тело
  new Zdog.Shape({ addTo:g, stroke:30, color:P.cat, path:[{ y:0 }] });
  new Zdog.Shape({ addTo:g, stroke:24, color:P.cat, path:[{ y:-8, z:4 }] });
  // голова
  const head = new Zdog.Anchor({ addTo:g, translate:{ y:-24, z:5 } });
  new Zdog.Shape({ addTo:head, stroke:26, color:P.cat, path:[{ y:0 }] });
  // уши
  [-1,1].forEach(s => {
    new Zdog.Cone({ addTo:head, diameter:9, length:10, color:P.cat,
      translate:{ x:s*9, y:-11, z:0 }, rotate:{ x:TAU/4 } });
    new Zdog.Cone({ addTo:head, diameter:4.5, length:5, color:P.sakura,
      translate:{ x:s*9, y:-11, z:1.5 }, rotate:{ x:TAU/4 } });
  });
  // мордочка (+z)
  const face = new Zdog.Anchor({ addTo:head, translate:{ z:12.4 } });
  [-1,1].forEach(s => new Zdog.Shape({ addTo:face, stroke:1.8, color:P.ink, closed:false,
    path:[ { x:s*6-2.6, y:-2 }, { arc:[ { x:s*6, y:-4.4 }, { x:s*6+2.6, y:-2 } ] } ] }));
  new Zdog.Shape({ addTo:face, stroke:1.6, color:P.ink, closed:false,
    path:[ { x:-2.4, y:2.6 }, { arc:[ { x:-1.2, y:4 }, { x:0, y:2.8 } ] },
           { arc:[ { x:1.2, y:4 }, { x:2.4, y:2.6 } ] } ] });
  [-1,1].forEach(s => new Zdog.Shape({ addTo:face, stroke:4.5, color:P.cushion, path:[{ x:s*8.6, y:2.2 }] }));
  // ошейник + бубенец
  new Zdog.Ellipse({ addTo:g, diameter:17, rotate:{ x:TAU/4 - 0.25 },
    translate:{ y:-13, z:6 }, stroke:4.5, color:P.aka });
  new Zdog.Shape({ addTo:g, stroke:6, color:P.lamp, path:[{ y:-9, z:14 }] });
  // лапки
  [-1,1].forEach(s => new Zdog.Shape({ addTo:g, stroke:9, color:P.cat, path:[{ x:s*8, y:12, z:8 }] }));
  a.group = g;
  return a;
}

/* ---------- комната ---------- */
function makeRoom(parent){
  const room = new Zdog.Anchor({ addTo: parent });
  const FW = 620, FD = 340, WH = 330;
  // пол
  box(room, { width:FW, height:10, depth:FD, translate:{ y:GROUND+5, z:-40 },
    topFace:P.floor, bottomFace:P.floorSide, leftFace:P.floorSide, rightFace:P.floorSide,
    frontFace:P.floorSide, rearFace:P.floorSide, color:P.floor });
  // швы досок
  for (let k=-2;k<=2;k++){
    new Zdog.Shape({ addTo:room, stroke:1.2, color:P.floorSide, closed:false,
      path:[ { x:k*95, y:GROUND-0.5, z:-40-FD/2+8 }, { x:k*95, y:GROUND-0.5, z:-40+FD/2-8 } ] });
  }
  // задняя стена
  new Zdog.Rect({ addTo:room, width:FW, height:WH, fill:true, stroke:2, color:P.wall,
    translate:{ y:GROUND-WH/2, z:-40-FD/2 } });
  new Zdog.Shape({ addTo:room, stroke:7, color:P.floorSide, closed:false,
    path:[ { x:-FW/2+4, y:GROUND-3, z:-40-FD/2+2 }, { x:FW/2-4, y:GROUND-3, z:-40-FD/2+2 } ] });
  // левая стена
  new Zdog.Rect({ addTo:room, width:FD, height:WH, fill:true, stroke:2, color:P.wallSide,
    rotate:{ y:TAU/4 }, translate:{ x:-FW/2, y:GROUND-WH/2, z:-40 } });
  new Zdog.Shape({ addTo:room, stroke:7, color:P.floorSide, closed:false,
    path:[ { x:-FW/2+2, y:GROUND-3, z:-40-FD/2+6 }, { x:-FW/2+2, y:GROUND-3, z:-40+FD/2-6 } ] });
  // сёдзи-окно на задней стене
  const win = new Zdog.Anchor({ addTo:room, translate:{ x:96, y:GROUND-204, z:-40-FD/2+1.5 } });
  new Zdog.Rect({ addTo:win, width:150, height:120, fill:true, stroke:6, color:P.windowGlow });
  new Zdog.Rect({ addTo:win, width:150, height:120, stroke:5, color:P.shoji });
  new Zdog.Shape({ addTo:win, stroke:3, color:P.shoji, closed:false, path:[ { x:0, y:-60 }, { x:0, y:60 } ] });
  new Zdog.Shape({ addTo:win, stroke:3, color:P.shoji, closed:false, path:[ { x:-75, y:0 }, { x:75, y:0 } ] });
  // ветка сакуры за окном
  new Zdog.Shape({ addTo:win, stroke:2.4, color:P.juteDark, closed:false,
    path:[ { x:-70, y:-34 }, { bezier:[ { x:-30, y:-26 }, { x:0, y:-30 }, { x:40, y:-14 } ] } ] });
  [[-44,-32],[-16,-26],[8,-27],[26,-19],[44,-13]].forEach(([x,y]) =>
    new Zdog.Shape({ addTo:win, stroke:7, color:P.sakura, path:[{ x, y }] }));
  // свиток на левой стене
  const scroll = new Zdog.Anchor({ addTo:room, rotate:{ y:TAU/4 }, translate:{ x:-FW/2+1.5, y:GROUND-215, z:-120 } });
  new Zdog.Rect({ addTo:scroll, width:56, height:110, fill:true, stroke:4, color:P.rugIn });
  new Zdog.Shape({ addTo:scroll, stroke:5, color:P.aka, path:[{ y:-20 }] });
  new Zdog.Shape({ addTo:scroll, stroke:2, color:P.ink, closed:false,
    path:[ { x:-8, y:0 }, { bezier:[ { x:8, y:6 }, { x:-6, y:16 }, { x:8, y:22 } ] } ] });
  // татами-коврик под домиком
  new Zdog.RoundedRect({ addTo:room, width:COLS*CELL+70, height:CELL+90, cornerRadius:16,
    fill:true, stroke:4, color:P.rug, rotate:{ x:TAU/4 }, translate:{ y:GROUND-1, z:6 } });
  new Zdog.RoundedRect({ addTo:room, width:COLS*CELL+40, height:CELL+60, cornerRadius:12,
    stroke:2.5, color:P.rugIn, rotate:{ x:TAU/4 }, translate:{ y:GROUND-2, z:6 } });
  // растение справа
  const plant = new Zdog.Anchor({ addTo:room, translate:{ x:FW/2-86, y:GROUND, z:64 } });
  new Zdog.Cylinder({ addTo:plant, diameter:44, length:34, rotate:{ x:TAU/4 },
    translate:{ y:-17 }, color:P.pot, frontFace:P.pot, backface:P.matchaDark, stroke:false });
  [[0,-0.1],[-0.45,0.25],[0.5,0.2],[-0.2,0.6],[0.25,-0.55]].forEach(([rz,ry],k) => {
    new Zdog.Ellipse({ addTo:plant, width:26, height:74, fill:true, stroke:3, color: k%2 ? P.matcha : P.matchaDark,
      translate:{ y:-95 }, rotate:{ z:rz, y:ry },
    });
  });
  new Zdog.Shape({ addTo:plant, stroke:4, color:P.matchaDark, closed:false,
    path:[ { y:-34 }, { y:-70 } ] });
  // бумажный торшер слева
  const lamp = new Zdog.Anchor({ addTo:room, translate:{ x:-FW/2+78, y:GROUND, z:-70 } });
  new Zdog.Cylinder({ addTo:lamp, diameter:36, length:8, rotate:{ x:TAU/4 },
    translate:{ y:-4 }, color:P.stand, frontFace:P.stand, backface:P.stand, stroke:false });
  new Zdog.Shape({ addTo:lamp, stroke:3.4, color:P.stand, closed:false, path:[ { y:-6 }, { y:-58 } ] });
  new Zdog.Shape({ addTo:lamp, stroke:52, color:P.lamp, closed:false,
    path:[ { y:-72 }, { y:-176 } ] });
  new Zdog.Shape({ addTo:lamp, stroke:64, color:P.lampGlow, path:[{ y:-124 }] });
  return room;
}

/* ---------- инициализация ---------- */
function build(){
  canvas = document.getElementById("scene");
  P = darkMq.matches ? PALETTES.dark : PALETTES.light;
  if (illo){ illo.children = []; illo = null; }
  illo = new Zdog.Illustration({
    element: canvas, zoom: 1.06, dragRotate: false,
  });
  world = new Zdog.Anchor({ addTo: illo, rotate: { x: -0.24, y: 0.30 }, translate:{ x: 14, y: -44 } });
  makeRoom(world);
  houseA = new Zdog.Anchor({ addTo: world, translate:{ z: 6 } });
  ghostA = new Zdog.Anchor({ addTo: world, translate:{ z: 6 } });
  peekA  = new Zdog.Anchor({ addTo: world, translate:{ z: 6 } });
  cellAnchors = [];
  for (let i=0; i<COLS*ROWS; i++){
    cellAnchors.push(new Zdog.Anchor({
      addTo: houseA, translate: { x: cellX(colOf(i)), y: cellY(rowOf(i)) }
    }));
  }
  catA = makeCat(world);
  parkCat();
  moduleAnchors = {};
  dirty = true;
}

/* ---------- публичное API ---------- */
const api = KD.scene = {};

api.init = function(){
  build();
  darkMq.addEventListener("change", () => { const st = api._snapshot; build(); if (st) api.restore(st); });
  animate();
};

api._snapshot = null;
api.restore = function(grid){
  api._snapshot = grid;
  Object.keys(moduleAnchors).forEach(i => api.remove(+i, true));
  grid.forEach((t, i) => { if (t) api.place(i, t, true); });
};

api.place = function(i, type, instant){
  const a = makeModule(type, houseA);
  a.translate.set({ x: cellX(colOf(i)), y: cellY(rowOf(i)) });
  moduleAnchors[i] = a;
  if (!instant && !REDUCED){
    a.scale.set({ x: 0.01, y: 0.01, z: 0.01 });
    popAnims.push({ anchor: a, t0: performance.now(), dur: 420 });
  }
  dirty = true;
};

api.remove = function(i){
  const a = moduleAnchors[i];
  if (!a) return;
  houseA.removeChild(a);
  delete moduleAnchors[i];
  dirty = true;
};

api.showGhosts = function(cells, hot){
  api.clearGhosts();
  const S = CELL - 12;
  cells.forEach(i => {
    const g = new Zdog.Box({
      addTo: ghostA, width:S, height:S, depth:S, stroke:false,
      color: i === hot ? P.ghostHot : P.ghost,
      translate: { x: cellX(colOf(i)), y: cellY(rowOf(i)) }
    });
    ghostShapes.push(g);
  });
  dirty = true;
};
api.clearGhosts = function(){
  ghostShapes.forEach(g => ghostA.removeChild(g));
  ghostShapes = [];
  dirty = true;
};

/* клиентские (px) координаты центра ячейки */
api.cellClientPos = function(i){
  illo.updateGraph();
  const a = cellAnchors[i];
  const r = canvas.getBoundingClientRect();
  const k = illo.zoom * (r.width / illo.width);
  return { x: r.left + r.width/2 + a.renderOrigin.x * k,
           y: r.top + r.height/2 + a.renderOrigin.y * k };
};

/* пульс модуля (при визите кота) */
api.pulse = function(i){
  const a = moduleAnchors[i];
  if (!a || REDUCED) return;
  popAnims.push({ anchor: a, t0: performance.now(), dur: 380, pulse: true });
  dirty = true;
};

/* ---------- Мару: анимация заселения ---------- */
function tw(from, to, t){ return from + (to - from) * t; }
function easeOut(t){ return 1 - Math.pow(1-t, 3); }
function easeIn(t){ return t*t*t; }

function raf(){ return new Promise(r => requestAnimationFrame(r)); }
async function tween(dur, step){
  if (REDUCED){ step(1); dirty = true; return; }
  const t0 = performance.now();
  for(;;){
    const t = Math.min(1, (performance.now() - t0) / dur);
    step(t); dirty = true;
    if (t >= 1) return;
    await raf();
  }
}

/* прыжок кота в точку (x,y) мировых координат */
async function hopTo(tx, ty, dur){
  const fx = catA.translate.x, fy = catA.translate.y;
  const peak = Math.min(fy, ty) - 46;
  await tween(dur, t => {
    const e = t;
    catA.translate.x = tw(fx, tx, e);
    // параболическая дуга
    const yl = tw(fy, peak, easeOut(Math.min(1, t*2)));
    const yr = tw(peak, ty, easeIn(Math.max(0, t*2-1)));
    catA.translate.y = t < 0.5 ? yl : yr;
    const sq = t < 0.12 ? 1 - t*1.4 : (t > 0.88 ? 1 - (1-t)*1.4 : 1.05);
    catA.group.scale.set({ x: 2-sq, y: sq, z: 1 });
  });
  catA.group.scale.set({ x:1, y:1, z:1 });
}

/* заселение: visits — упорядоченный список индексов ячеек */
api.moveIn = async function(visits, onVisit, onDone){
  if (!visits.length) return;
  catA.group.scale.set({ x:1, y:1, z:1 });
  catA.rotate.y = 0;
  // вход из-за правого края
  catA.translate.set({ x: 380, y: GROUND - 16, z: 40 });
  const first = visits[0];
  // подбежать к первому модулю
  const fx = cellX(colOf(first)), fy = cellY(rowOf(first));
  await tween(REDUCED ? 1 : 900, t => {
    catA.translate.x = tw(380, fx + CELL*0.9, easeOut(t));
    catA.translate.y = GROUND - 16 - Math.abs(Math.sin(t * TAU * 1.5)) * 10;
  });
  // обнюхать
  await tween(350, t => { catA.group.scale.y = 1 - Math.sin(t*Math.PI)*0.12; });
  // обход модулей
  for (let k = 0; k < visits.length; k++){
    const i = visits[k];
    const type = onVisit(i, k); // конфигуратор вернёт тип и покажет сердечко
    const tx = cellX(colOf(i));
    const ty = cellY(rowOf(i)) - (CELL/2) - 12; // сверху на модуль
    await hopTo(tx, ty, REDUCED ? 1 : 520);
    api.pulse(i);
    if (MODULES[type] && MODULES[type].hasEntrance && k === 0){
      // нырнуть в лаз и вынырнуть
      await tween(420, t => { const s = 1 - easeIn(t); catA.group.scale.set({ x:s, y:s, z:s }); });
      await new Promise(r => setTimeout(r, REDUCED ? 0 : 500));
      await tween(380, t => { const s = easeOut(t); catA.group.scale.set({ x:s, y:s, z:s }); });
    } else {
      await new Promise(r => setTimeout(r, REDUCED ? 0 : 420));
    }
  }
  // финал: сесть, довольно покачаться
  await tween(700, t => { catA.rotate.y = Math.sin(t * TAU) * 0.14; });
  onDone && onDone();
};

function parkCat(){ catA.translate.set({ x: 0, y: 4000, z: 0 }); }
api.hideCat = function(){ parkCat(); dirty = true; };

/* ---------- цикл отрисовки ---------- */
function animate(){
  const now = performance.now();
  if (!REDUCED){
    sway += 0.008;
    world.rotate.y = 0.30 + Math.sin(sway) * 0.010;
    dirty = true;
  }
  popAnims = popAnims.filter(pa => {
    const t = Math.min(1, (now - pa.t0) / pa.dur);
    if (pa.pulse){
      const s = 1 + Math.sin(t * Math.PI) * 0.09;
      pa.anchor.scale.set({ x:s, y:s, z:s });
    } else {
      // overshoot
      const s = t < 0.7 ? easeOutQ(t/0.7) * 1.12 : 1.12 - (t-0.7)/0.3*0.12;
      pa.anchor.scale.set({ x:s, y:s, z:s });
    }
    if (t >= 1) pa.anchor.scale.set({ x:1, y:1, z:1 });
    dirty = true;
    return t < 1;
  });
  if (dirty){ illo.updateRenderGraph(); dirty = false; }
  requestAnimationFrame(animate);
}
function easeOutQ(t){ return 1 - (1-t)*(1-t); }

})();
