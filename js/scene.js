/* Котоши — Zdog-сцена: комната, модули, кот Момо */
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
    /* лаз — отдельный тон, светлее нутра тоннеля (hole): раскрой фанеры, а не
       глухая дыра; entryLit — подсветка куба под курсором */
    entry:"#63506A", entryLit:"#856F8E",
    edge:"#4A3728", carpet:"#4A4547", carpetDeep:"#3B3739", canvas:"#E9DCC0",
    /* полотно гамака: тёплый терракотово-розовый, отдельный тон — canvas (#E9DCC0)
       сливался с задней стеной (#EFE4CE), гамак «пропадал» на её фоне */
    sling:"#D9806E", slingDeep:"#BE6553",
    aka:"#C7423A", akaDeep:"#A93129", sakura:"#F3CDC6", cushion:"#EFB9AF",
    jute:"#C89B6C", juteDark:"#AB8050",
    matcha:"#6E8F63", matchaDark:"#57744E", pot:"#B0705A",
    lamp:"#F7E5B5", lampGlow:"rgba(247,224,172,0.18)", lampRib:"#D9BE8A", stand:"#6B5F52",
    cat:"#FFFDF8", ink:"#2E2A33", ghost:"rgba(199,66,58,0.16)", ghostHot:"rgba(199,66,58,0.42)",
    windowGlow:"#FBF3DC", shoji:"#C9B48E", note:"#847B69",
    glass:"rgba(235,203,151,0.30)", glassDeep:"rgba(192,146,99,0.34)", bowlRim:"#C7423A"
  },
  dark: {
    wall:"#33303F", wallSide:"#2B2837", floor:"#4E4258", floorSide:"#3B3244",
    rug:"#A34A3C", rugIn:"#5A4E62",
    wood:"#C9A26C", wood2:"#A87F52", woodTop:"#DDB87E", hole:"#1E1A26",
    edge:"#5F4A37", carpet:"#5B5661", carpetDeep:"#49444E", canvas:"#D8C8A8",
    entry:"#3B333F", entryLit:"#544A5C",
    sling:"#E08A76", slingDeep:"#C56F5B",
    aka:"#E05A4E", akaDeep:"#C74338", sakura:"#B27A72", cushion:"#C08A80",
    jute:"#B98F5C", juteDark:"#97713F",
    matcha:"#7FA271", matchaDark:"#5F7E54", pot:"#9A6350",
    lamp:"#F3D992", lampGlow:"rgba(243,217,146,0.12)", lampRib:"#C7A860", stand:"#8A7E6E",
    cat:"#FBF7EC", ink:"#221F2B", ghost:"rgba(224,90,78,0.20)", ghostHot:"rgba(224,90,78,0.5)",
    windowGlow:"#6B604B", shoji:"#6E6478", note:"#A79F8F",
    glass:"rgba(221,184,126,0.26)", glassDeep:"rgba(168,127,82,0.32)", bowlRim:"#E05A4E"
  }
};
let P = PALETTES.light;
const darkMq = matchMedia("(prefers-color-scheme: dark)");
/* ?theme=light|dark — override для проверки обеих тем */
const themeOverride = new URLSearchParams(location.search).get("theme");
const isDark = () => themeOverride ? themeOverride === "dark" : darkMq.matches;

/* ---------- коллекции цвета когтеточки/ковра ----------
   Одна глобальная коллекция задаёт цвет когтеточки (carpet/carpetDeep) И ковра
   (rug/rugIn) — по правилу брендворлда «когтеточка = ковёр в кадре». Четыре
   природных тона; переключение пересобирает сцену (как смена темы). */
/* каждая коллекция задаёт цвет ковролина/ковра, а также полотна гамака (sling)
   и ободка чаши-лежанки (bowlRim) — чтобы весь текстиль/акценты сборки были в тон */
const COLLECTIONS = {
  terracotta: {
    light:{ rug:"#D96A55", rugIn:"#F0DFC8", carpet:"#BF5A47", carpetDeep:"#9F472F",
            sling:"#D9806E", slingDeep:"#BE6553", bowlRim:"#C7423A" },
    dark: { rug:"#A34A3C", rugIn:"#6E5147", carpet:"#8E4436", carpetDeep:"#6C3327",
            sling:"#E08A76", slingDeep:"#C56F5B", bowlRim:"#E05A4E" } },
  sage: {
    light:{ rug:"#93A97F", rugIn:"#E9E6D2", carpet:"#6E8F63", carpetDeep:"#55744C",
            sling:"#8FAE7C", slingDeep:"#6E8F63", bowlRim:"#6E8F63" },
    dark: { rug:"#6E8560", rugIn:"#59634F", carpet:"#5F7E54", carpetDeep:"#48603F",
            sling:"#86A277", slingDeep:"#6E8560", bowlRim:"#7FA271" } },
  charcoal: {
    light:{ rug:"#6E686A", rugIn:"#DED8D2", carpet:"#4A4547", carpetDeep:"#3A3639",
            sling:"#8A8285", slingDeep:"#6E686A", bowlRim:"#6E686A" },
    dark: { rug:"#514D50", rugIn:"#565056", carpet:"#5B5661", carpetDeep:"#49444E",
            sling:"#7A747C", slingDeep:"#5B5661", bowlRim:"#8A8285" } },
  natural: {
    /* тона глубже, чем прежде: светлый ковёр (#CBAE82) сливался с песочным полом
       (floor #E3CBA2) — «ковёр пропадал». Тёплый дуб заметно темнее пола. */
    light:{ rug:"#C29A5F", rugIn:"#EFE3CB", carpet:"#A9814B", carpetDeep:"#886237",
            sling:"#C29A5F", slingDeep:"#A9814B", bowlRim:"#A9814B" },
    dark: { rug:"#9A7E56", rugIn:"#6B5B42", carpet:"#8A6E44", carpetDeep:"#6B5333",
            sling:"#B49468", slingDeep:"#9A7E56", bowlRim:"#B49468" } },
};
let collection = "terracotta";   // по умолчанию — как «Новичок» в брендворлде
/* палитра активной темы, поверх неё — цвета выбранной коллекции. Копия, а не
   ссылка на PALETTES: коллекция не должна мутировать базовые палитры. */
function activePalette(theme){
  const dark = theme ? theme === "dark" : isDark();
  const base = dark ? PALETTES.dark : PALETTES.light;
  const col = COLLECTIONS[collection] && COLLECTIONS[collection][dark ? "dark" : "light"];
  return Object.assign({}, base, col || {});
}

/* ---------- геометрия сетки ---------- */
const GROUND = 118;                       // y пола (вниз положительно)
/* верхняя поверхность модуля (смещение от центра ЕГО ячейки):
   опоры стоящего сверху тянутся до неё, а не до границы ячейки */
const TOP_Y = { base:-27, lounge:1, tower:-30, tunnel:-12 };
const cellX = c => (c - (COLS-1)/2) * CELL;
const cellY = r => GROUND - CELL/2 - r*CELL;
const colOf = i => i % COLS;
const rowOf = i => Math.floor(i / COLS);

/* ---------- состояние ---------- */
let illo, world, houseA, ghostA, catA, peekA;
let canvas;
let cellAnchors = [];      // якоря центров ячеек (для проекции)
let moduleAnchors = {};    // cellIndex -> anchor модуля
let moduleKind = {};       // cellIndex -> тип модуля (для проекции верхушки под меню)
let moduleDy = {};         // cellIndex -> смещение вниз (крыша/тоннель на низкой опоре)
let ghostShapes = [];
let dirty = true;
let catSettled = false;
let popAnims = [];         // {anchor, t0, dur}
let dimLabels = [];        // подписи размеров ковра: {m, e, text, oy}

/* ---------- helpers ---------- */
function box(a, o){ return new Zdog.Box(Object.assign({ addTo:a, stroke:1 }, o)); }

/* лаз и прорези сидят в нижней части фронта: после наклона сцены их средняя
   глубина оказывается ЗА фронтальной гранью куба и сортировка красила бы их
   под ней — поэтому sortValue смещаем вручную (тот же приём, что у roomG) */
function decoSort(sh){
  sh.updateSortValue = function(){
    this.constructor.prototype.updateSortValue.call(this); this.sortValue += 4;
  };
  return sh;
}

/* ---------- форма лаза ----------
   Выбор на каждый куб отдельно (см. клик по кубу в configurator.js): у каждого
   свой раскрой фанеры. Форма живёт здесь по индексу ячейки (entryShapes), а не в
   grid — смена формы не трогает состав сборки и цену, только перерисовку куба.
   Пятиугольная арка-«домик» — как у реального прототипа — форма по умолчанию;
   круг и квадрат-скруглённый — альтернативы. Все три сидят дверным проёмом на
   одной линии пола фронта (низ на dy), чтобы читались как один и тот же вход. */
const ENTRY_SHAPES = {
  pentagon: (a, g, col) => new Zdog.Shape({ addTo:a, fill:true, stroke:2, color:col,
    translate:{ z:g.z },
    path:[ { x:g.dx-g.dw/2, y:g.dy }, { x:g.dx-g.dw/2, y:g.dy-g.dh*0.62 }, { x:g.dx, y:g.dy-g.dh },
           { x:g.dx+g.dw/2, y:g.dy-g.dh*0.62 }, { x:g.dx+g.dw/2, y:g.dy } ] }),
  circle: (a, g, col) => new Zdog.Ellipse({ addTo:a, diameter:g.dw*1.12, fill:true, stroke:2,
    color:col, translate:{ x:g.dx, y:g.dy - g.dw*0.56, z:g.z } }),
  square: (a, g, col) => new Zdog.RoundedRect({ addTo:a, width:g.dw, height:g.dh*0.84,
    cornerRadius:g.dw*0.18, fill:true, stroke:2, color:col,
    translate:{ x:g.dx, y:g.dy - g.dh*0.42, z:g.z } }),
};
const DEFAULT_ENTRY = "pentagon";
let entryShapes = {};   // cellIndex -> форма лаза этого куба
let roofOn = {};        // cellIndex -> у куба включена крыша
let roofStyle = {};     // cellIndex -> стиль крыши куба: "asym" | "sym"
let scratchDir = {};    // cellIndex -> поворот когтеточки-пандуса: 0..3 (шаг 90° по оси Y)
let entryObjs = {};     // cellIndex -> Zdog-объект лаза (для подсветки и замены на лету)
let hoverEntry = null;  // куб под курсором — его лаз подсвечен (entryLit)
function entryColor(i){ return hoverEntry === i ? P.entryLit : P.entry; }
function makeEntry(a, S, H, B, shape, col){
  const g = { dw:S*0.46, dh:H*0.52, dx:0, dy:B-3, z:S/2+1.1 };
  const draw = ENTRY_SHAPES[shape] || ENTRY_SHAPES[DEFAULT_ENTRY];
  return decoSort(draw(a, g, col));
}

/* ---------- крыша (симметричная / асимметричная) ----------
   Скаты обиты ковролином (наклонная когтеточка). Рисуется плоскими полигонами от
   базы (локальный y=0, линия карниза) вверх; повёрнута на 90° (ось Y) — конёк идёт
   по глубине. Единственное отличие стилей — положение конька (zR):
   - "asym": конёк смещён к задней грани — односкатный «saltbox» силуэт прототипа;
   - "sym":  конёк по центру — классическая двускатная крыша.
   Общая для крыши-модуля и для куба с включённой крышей. */
const ROOF_STYLES = { asym: -0.30, sym: 0 };
const DEFAULT_ROOF = "asym";
function makeRoof(a, S, style, ridge){
  const xr = S/2 + 2;          // полуширина с небольшим свесом по бокам
  const zF = S/2 + 2;          // передний карниз
  const zB = -S/2 - 2;         // задний карниз
  const rH = S*0.56;           // высота конька над карнизом
  const zR = S * (ROOF_STYLES[style] ?? ROOF_STYLES[DEFAULT_ROOF]); // сдвиг конька по стилю
  const g = new Zdog.Anchor({ addTo:a, rotate:{ y: -TAU/4 } });
  // передний скат — ковролин-когтеточка
  new Zdog.Shape({ addTo:g, fill:true, stroke:2, color:P.carpet, path:[
    { x:-xr, y:0, z:zF }, { x:xr, y:0, z:zF },
    { x:xr, y:-rH, z:zR }, { x:-xr, y:-rH, z:zR } ] });
  // задний скат — теневой ковролин
  new Zdog.Shape({ addTo:g, fill:true, stroke:2, color:P.carpetDeep, path:[
    { x:-xr, y:-rH, z:zR }, { x:xr, y:-rH, z:zR },
    { x:xr, y:0, z:zB }, { x:-xr, y:0, z:zB } ] });
  // фронтоны-боковины — фанерные треугольники (силуэт «домика»)
  [-1,1].forEach(s => new Zdog.Shape({ addTo:g, fill:true, stroke:1, color:P.wood, path:[
    { x:s*xr, y:0, z:zF }, { x:s*xr, y:-rH, z:zR }, { x:s*xr, y:0, z:zB } ] }));
  // сизаль-обёрнутый конёк вдоль гребня (для домика-модуля крыши)
  if (ridge) new Zdog.Cylinder({ addTo:g, diameter:8, length:2*xr, rotate:{ y:TAU/4 },
    translate:{ y:-rH, z:zR }, color:P.jute, frontFace:P.juteDark, backface:P.juteDark, stroke:false });
}

function makeModule(type, parent, opts){
  const a = new Zdog.Anchor({ addTo: parent });
  const S = CELL - 10;   // ширина/глубина (шов между соседями по горизонтали)
  const B = CELL / 2;    // низ ячейки
  const H = CELL - 2;    // высота корпуса
  const SB = (opts && opts.supY) || B;   // фактическая опора: верх модуля снизу (или пол)
  /* видимый бок темнее фронта — иначе куб и лежанка читаются плоскими:
     при повороте сцены (rotate.y > 0) зритель видит фронт и правую грань */
  const woodBox = extra => box(a, Object.assign({
    topFace:P.woodTop, bottomFace:P.wood2, leftFace:P.wood2, rightFace:P.wood2,
    frontFace:P.wood, rearFace:P.wood2, color:P.wood }, extra));
  if (type === "base"){
    woodBox({ width:S, height:SB-(B-H), depth:S, translate:{ y: (B-H+SB)/2 } });
    /* лаз своей формы для этого куба (см. ENTRY_SHAPES и клик по кубу в
       configurator.js); объект запоминаем — чтобы подсвечивать и менять на лету */
    const ci = opts ? opts.cellIndex : undefined;
    const shape = (ci != null && entryShapes[ci]) || DEFAULT_ENTRY;
    const eo = makeEntry(a, S, H, B, shape, ci != null ? entryColor(ci) : P.entry);
    if (ci != null) entryObjs[ci] = eo;
    /* верх куба: либо асимметричная крыша-«домик» (когтеточка на скате), либо
       плоская ковролиновая площадка-когтеточка — по переключателю крыши куба */
    const roofed = opts ? (opts.roof != null ? opts.roof : roofOn[ci]) : false;
    if (roofed){
      const st = (opts && opts.roofStyle) || roofStyle[ci] || DEFAULT_ROOF;
      makeRoof(new Zdog.Anchor({ addTo:a, translate:{ y: B - H - 1.5 } }), S, st);
    } else {
      new Zdog.Rect({ addTo:a, width:S*0.84, height:S*0.84, fill:true, stroke:2.5,
        color:P.carpet, rotate:{ x:TAU/4 }, translate:{ y: B - H - 1.5 } });
    }
  }
  else if (type === "lounge"){
    const h = 30;
    woodBox({ width:S, height:SB-(B-h), depth:S, translate:{ y: (B-h+SB)/2 } });
    new Zdog.Ellipse({ addTo:a, width:S*0.74, height:S*0.6,
      rotate:{ x:TAU/4 }, translate:{ y: B - h - 1 },
      stroke:10, fill:true, color:P.sling });   // подушка в цвет коллекции
  }
  else if (type === "tunnel"){
    // ось: "x" — соединяет соседние модули, "z" — одиночный, входом к зрителю
    const D = S*0.78;
    const xax = !(opts && opts.tunnelAxis === "z");
    // с соседом по горизонтали тоннель ДЛИННЕЕ ячейки — торцы утоплены в соседние
    // кубы, чтобы тёмное нутро не зияло в зазоре (модули «слипаются» по горизонтали)
    const L = xax ? CELL + 12 : S + 2;
    const t = new Zdog.Anchor({ addTo:a, translate:{ y: B - D/2 - 1 },
      rotate:{ y: xax ? 0 : TAU/4 } });
    new Zdog.Cylinder({ addTo:t, diameter:D, length:L,
      rotate:{ y:TAU/4 }, color:P.carpet, frontFace:P.hole, backface:P.hole, stroke:false });
    new Zdog.Ellipse({ addTo:t, diameter:D, rotate:{ y:TAU/4 }, translate:{ x:L/2 },
      stroke:4, color:P.edge });
    new Zdog.Ellipse({ addTo:t, diameter:D, rotate:{ y:TAU/4 }, translate:{ x:-L/2 },
      stroke:4, color:P.edge });
  }
  else if (type === "tower"){
    box(a, { width:14, height:SB-(B-(H-9)), depth:14, translate:{ y: (B-(H-9)+SB)/2 },
      topFace:P.wood2, color:P.wood2, leftFace:P.juteDark, rightFace:P.wood2,
      frontFace:P.wood2, rearFace:P.juteDark });
    woodBox({ width:S, height:9, depth:S-4, translate:{ y: -B + 5.5 } });  // площадка вровень с модулем (не шире)
    new Zdog.Ellipse({ addTo:a, width:S*0.6, height:S*0.44,
      rotate:{ x:TAU/4 }, translate:{ y: -B + 0.5 }, stroke:7, fill:true, color:P.sling });  // подушка в цвет коллекции
  }
  else if (type === "hammock"){
    // ЧЕТЫРЕ стойки по углам; полотно — пучок ОТКРЫТЫХ провисающих дуг по глубине.
    // ВАЖНО: closed:false — иначе Zdog замыкает каждую дугу прямой линией конец→начало
    // (обе точки на одной высоте), и это была та самая «горизонтальная перекладина».
    const TY = B - H + 14, px = S/2 - 8, pz = S/2 - 10, sag = 30;
    [-1,1].forEach(sx => [-1,1].forEach(sz => box(a, { width:5, height:SB-TY, depth:5,
      translate:{ x:sx*px, z:sz*pz, y:(TY+SB)/2 }, color:P.wood2,
      topFace:P.woodTop, leftFace:P.juteDark, rightFace:P.wood2,
      frontFace:P.wood2, rearFace:P.juteDark, bottomFace:P.juteDark })));
    // Полотно — сплошная залитая ткань от передней кромки до задней (закрывает
    // зазор между ними, где торчат стойки). Рисуем ПОВЕРХ стоек (sortValue+),
    // чтобы верхушки правых стоек ушли под ткань, как у левых.
    const fSag = 20, bSag = 12;   // ближняя кромка провисает мягче (не так круто, как раньше)
    const cloth = new Zdog.Shape({ addTo:a, fill:true, stroke:6, color:P.sling, closed:true, path:[
      { x:-px, y:TY, z:pz },
      { bezier:[ { x:-px*0.5, y:TY+fSag, z:pz }, { x:px*0.5, y:TY+fSag, z:pz }, { x:px, y:TY, z:pz } ] },
      { x:px, y:TY, z:-pz },
      { bezier:[ { x:px*0.5, y:TY+bSag, z:-pz }, { x:-px*0.5, y:TY+bSag, z:-pz }, { x:-px, y:TY, z:-pz } ] } ] });
    cloth.updateSortValue = function(){
      this.constructor.prototype.updateSortValue.call(this); this.sortValue += 200; };
    // кромка по БЛИЖНЕМУ краю — контур в цвет ткани, чуть темнее
    const edge = new Zdog.Shape({ addTo:a, stroke:4, color:P.slingDeep, closed:false,
      path:[ { x:-px, y:TY, z:pz },
             { bezier:[ { x:-px*0.5, y:TY+fSag, z:pz }, { x:px*0.5, y:TY+fSag, z:pz }, { x:px, y:TY, z:pz } ] } ] });
    edge.updateSortValue = function(){
      this.constructor.prototype.updateSortValue.call(this); this.sortValue += 250; };
  }
  else if (type === "hammock2"){
    // широкий гамак: якорь в левой ячейке, вторая стойка — в соседней справа
    const SB2 = (opts && opts.supY2) || B;
    const X2 = CELL; // центр правой ячейки
    const TY = B - H + 4, pz = S/2 - 10;   // верхушки стоек, вынос по глубине
    const Lx = -(S/2-8), Rx = X2+(S/2-8);
    // ЧЕТЫРЕ стойки: левый и правый край, перёд+зад
    [{ x:Lx, s:SB }, { x:Rx, s:SB2 }].forEach(p => [-1,1].forEach(sz => box(a, {
      width:5, height:p.s-TY, depth:5,
      translate:{ x:p.x, z:sz*pz, y:(TY+p.s)/2 }, color:P.wood2,
      topFace:P.woodTop, leftFace:P.juteDark, rightFace:P.wood2,
      frontFace:P.wood2, rearFace:P.juteDark, bottomFace:P.juteDark })));
    // полотно — сплошная залитая ткань (перед→зад), поверх стоек: их верхушки уходят под ткань
    const fSag = 24, bSag = 14, cx1 = X2/2-16, cx2 = X2/2+16;
    const cloth = new Zdog.Shape({ addTo:a, fill:true, stroke:6, color:P.sling, closed:true, path:[
      { x:Lx, y:TY, z:pz },
      { bezier:[ { x:cx1, y:TY+fSag, z:pz }, { x:cx2, y:TY+fSag, z:pz }, { x:Rx, y:TY, z:pz } ] },
      { x:Rx, y:TY, z:-pz },
      { bezier:[ { x:cx2, y:TY+bSag, z:-pz }, { x:cx1, y:TY+bSag, z:-pz }, { x:Lx, y:TY, z:-pz } ] } ] });
    cloth.updateSortValue = function(){
      this.constructor.prototype.updateSortValue.call(this); this.sortValue += 200; };
    // кромка по БЛИЖНЕМУ краю — контур в цвет ткани, чуть темнее
    const edge = new Zdog.Shape({ addTo:a, stroke:4, color:P.slingDeep, closed:false,
      path:[ { x:Lx, y:TY, z:pz },
             { bezier:[ { x:cx1, y:TY+fSag, z:pz }, { x:cx2, y:TY+fSag, z:pz }, { x:Rx, y:TY, z:pz } ] } ] });
    edge.updateSortValue = function(){
      this.constructor.prototype.updateSortValue.call(this); this.sortValue += 250; };
  }
  else if (type === "roof"){
    // крыша — самостоятельный домик-модуль со своим лазом (а не голая крышка):
    // короткий фанерный корпус + фронтальный лаз-домик + вент-отверстия сбоку,
    // сверху — ковролиновые скаты-когтеточка с сизалевым коньком. Прижат к низу
    // своей ячейки — сидит на модуле снизу. Стиль конька: asym (по умолч.) | sym.
    const ci = opts ? opts.cellIndex : undefined;
    const st = (opts && opts.roofStyle) || (ci != null && roofStyle[ci]) || DEFAULT_ROOF;
    const bodyH = 30;                       // высота стен корпуса (низ на полу ячейки)
    woodBox({ width:S, height:bodyH, depth:S, translate:{ y: B - bodyH/2 } });
    // фронтальный лаз-домик (как у куба, но по высоте корпуса)
    decoSort(ENTRY_SHAPES.pentagon(a,
      { dw:S*0.44, dh:bodyH*0.86, dx:0, dy:B-3, z:S/2+1.1 }, P.entry));
    // скаты + сизалевый конёк поверх корпуса
    makeRoof(new Zdog.Anchor({ addTo:a, translate:{ y: B - bodyH } }), S, st, true);
  }
  else if (type === "scratch"){
    // наклонный пандус-когтеточка: клин из двух берёзовых боковин-треугольников
    // (слева/справа, в плоскости Z–Y), скат-гипотенуза обит ковролином и обращён
    // к зрителю — точит когти И помогает коту забраться на модуль выше.
    // Профиль: перёд-низ A(z+), зад-низ Bp(z−), зад-верх C(z−, высокая кромка).
    // Обёртка w крутит пандус на 0/90/180/270° (opts.scratchDir) — по умолчанию
    // конструктор ставит высокую кромку к ближнему кубу («подиум»), см. configurator.
    const dir = (opts && opts.scratchDir) || 0;
    const w = new Zdog.Anchor({ addTo:a, rotate:{ y: dir*TAU/4 } });
    const HH = 46;               // высота у высокой (задней) кромки
    const xc = S/2;              // полуширина клина (боковины на x=±xc)
    const side = [ {z:S/2,y:B}, {z:-S/2,y:B}, {z:-S/2,y:B-HH} ];
    // боковины сортируем по БЛИЖНЕЙ точке (max z), а не по среднему z всех точек:
    // иначе крупный наклонный ковролиновый скат имеет среднее z ближе, чем центр
    // ближней боковины, и перекрывает её при развороте «подиум» (когтеточка слева
    // от куба, dir 3). По ближней точке ближняя боковина всегда впереди ската, а
    // дальняя — позади, независимо от поворота.
    const nearSort = function(){
      let m = -Infinity;
      this.pathCommands.forEach(c => { if (c.endRenderPoint.z > m) m = c.endRenderPoint.z; });
      this.sortValue = m;
    };
    [-1,1].forEach(s => {
      const pf = new Zdog.Shape({ addTo:w, fill:true, stroke:2, color:P.wood, translate:{ x:s*xc }, path:side });
      // тёмная скорчённая кромка по контуру боковины
      const pe = new Zdog.Shape({ addTo:w, closed:true, stroke:1.6, color:P.edge, translate:{ x:s*xc }, path:side });
      pf.updateSortValue = nearSort; pe.updateSortValue = nearSort;
    });
    // скат — ковролиновая когтеточка (гипотенуза перёд-низ → зад-верх, в рамке боковин)
    new Zdog.Shape({ addTo:w, fill:true, stroke:2, color:P.carpet, path:[
      {x:-(xc-3), z:S/2, y:B}, {x:(xc-3), z:S/2, y:B},
      {x:(xc-3), z:-S/2, y:B-HH}, {x:-(xc-3), z:-S/2, y:B-HH} ] });
    // берёзовые дюбель-рейки по нижней (перёд) и верхней (зад) кромкам ската
    [{z:S/2,y:B},{z:-S/2,y:B-HH}].forEach(p =>
      new Zdog.Cylinder({ addTo:w, diameter:8, length:2*xc+8, rotate:{ y:TAU/4 },
        translate:{ z:p.z, y:p.y }, color:P.wood, frontFace:P.woodTop, backface:P.wood2, stroke:false }));
  }
  else if (type === "play"){
    // чаша-лежанка: приплюснутая полусфера-гнездо на высокой опоре-колонне —
    // чаша приподнята над полом, а не стоит прямо на нём
    // нога-основание на полу
    new Zdog.Cylinder({ addTo:a, diameter:34, length:8, rotate:{ x:TAU/4 },
      translate:{ y: B - 4 }, color:P.wood2, frontFace:P.woodTop, backface:P.wood2, stroke:false });
    // колонна-опора, высотой почти во весь модуль — как у когтеточки
    new Zdog.Cylinder({ addTo:a, diameter:16, length:46, rotate:{ x:TAU/4 },
      translate:{ y: B - 31 }, color:P.wood, frontFace:P.wood, backface:P.wood2, stroke:false });
    // чаша: полусфера куполом вниз, приплюснута по высоте — гнездо шире, чем глубже.
    // Тело чаши прозрачное (акрил) и пустое — единственное непрозрачное здесь — опора-колонна,
    // видимая сквозь стенки; никакой подушки внутри, чтобы не перекрывать прозрачность.
    const bowl = new Zdog.Anchor({ addTo:a, translate:{ y: B - 74 }, scale:{ y:0.72 } });
    new Zdog.Hemisphere({ addTo:bowl, diameter:58, rotate:{ x:-TAU/4 },
      color:P.glass, backface:P.glassDeep, stroke:false });
    // непрозрачный ободок по верхнему краю чаши — в тон коллекции
    new Zdog.Ellipse({ addTo:bowl, diameter:58, rotate:{ x:TAU/4 },
      translate:{ y:-1 }, stroke:5, color:P.bowlRim });
  }
  return a;
}

/* ---------- кот Момо ---------- */
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
/* приглушить цвет к тону стены: декор вокруг ковра не должен спорить с домиком */
function calm(c, t = 0.4){
  if (c[0] !== "#") return c;
  const n = parseInt(c.slice(1), 16), w = parseInt(P.wall.slice(1), 16);
  const ch = (v, s) => (v >> s) & 255;
  const l = (x, y) => Math.round(x + (y - x) * t);
  return `rgb(${l(ch(n,16),ch(w,16))},${l(ch(n,8),ch(w,8))},${l(ch(n,0),ch(w,0))})`;
}
function makeRoom(parent){
  const room = new Zdog.Anchor({ addTo: parent });
  // пол и стена сильно больше холста: сцена заполнена целиком, ничего не «плавает»
  const FW = 1900, FD = 1350, WH = 640; // пол с запасом перекрывает нижний край холста
  const WALLZ = -255; // стена не привязана к глубине пола
  // пол
  box(room, { width:FW, height:10, depth:FD, translate:{ y:GROUND+5, z:-40 },
    topFace:P.floor, bottomFace:P.floorSide, leftFace:P.floorSide, rightFace:P.floorSide,
    frontFace:P.floorSide, rearFace:P.floorSide, color:P.floor });
  // швы досок
  for (let k=-8;k<=8;k++){
    new Zdog.Shape({ addTo:room, stroke:1.2, color:P.floorSide, closed:false,
      path:[ { x:k*115, y:GROUND-0.5, z:WALLZ+8 }, { x:k*115, y:GROUND-0.5, z:-40+FD/2-8 } ] });
  }
  // задняя стена
  new Zdog.Rect({ addTo:room, width:FW, height:WH, fill:true, stroke:2, color:P.wall,
    translate:{ y:GROUND-WH/2, z:WALLZ } });
  new Zdog.Shape({ addTo:room, stroke:7, color:P.floorSide, closed:false,
    path:[ { x:-FW/2+4, y:GROUND-3, z:WALLZ+2 }, { x:FW/2-4, y:GROUND-3, z:WALLZ+2 } ] });
  // сёдзи-окно на задней стене — пониже, ближе к «человеческой» высоте подоконника
  const win = new Zdog.Anchor({ addTo:room, translate:{ x:40, y:GROUND-176, z:WALLZ+1.5 } });
  new Zdog.Rect({ addTo:win, width:150, height:120, fill:true, stroke:6, color:calm(P.windowGlow) });
  new Zdog.Rect({ addTo:win, width:150, height:120, stroke:5, color:calm(P.shoji), translate:{ z:0.8 } });
  new Zdog.Shape({ addTo:win, stroke:3, color:calm(P.shoji), closed:false, translate:{ z:1.4 }, path:[ { x:0, y:-60 }, { x:0, y:60 } ] });
  new Zdog.Shape({ addTo:win, stroke:3, color:calm(P.shoji), closed:false, translate:{ z:1.4 }, path:[ { x:-75, y:0 }, { x:75, y:0 } ] });
  // ветка сакуры перед окном: поверх рамы сёдзи (z:1.4)
  new Zdog.Shape({ addTo:win, stroke:2.4, color:calm(P.juteDark), closed:false, translate:{ z:2.2 },
    path:[ { x:-70, y:-34 }, { bezier:[ { x:-30, y:-26 }, { x:0, y:-30 }, { x:40, y:-14 } ] } ] });
  [[-44,-32],[-16,-26],[8,-27],[26,-19],[44,-13]].forEach(([x,y]) =>
    new Zdog.Shape({ addTo:win, stroke:7, color:calm(P.sakura), translate:{ z:2.4 }, path:[{ x, y }] }));
  // свиток на задней стене — приглушённый, чтобы не спорил с домиком
  const scroll = new Zdog.Anchor({ addTo:room, translate:{ x:-350, y:GROUND-218, z:WALLZ+1.5 } });
  new Zdog.Rect({ addTo:scroll, width:46, height:92, fill:true, stroke:3, color:P.wallSide });
  new Zdog.Shape({ addTo:scroll, stroke:3.5, color:calm(P.akaDeep), path:[{ y:-18 }] });
  new Zdog.Shape({ addTo:scroll, stroke:1.8, color:P.floorSide, closed:false,
    path:[ { x:-7, y:0 }, { bezier:[ { x:7, y:5 }, { x:-5, y:13 }, { x:7, y:19 } ] } ] });
  // татами-коврик под домиком — с запасом под большие постройки
  const RW = COLS*CELL + 160, RD = CELL + 140;
  new Zdog.RoundedRect({ addTo:room, width:RW, height:RD, cornerRadius:18,
    fill:true, stroke:4, color:P.rug, rotate:{ x:TAU/4 }, translate:{ y:GROUND-1, z:4 } });
  new Zdog.RoundedRect({ addTo:room, width:COLS*CELL+124, height:CELL+106, cornerRadius:14,
    stroke:2.5, color:P.rugIn, rotate:{ x:TAU/4 }, translate:{ y:GROUND-2, z:4 } });
  /* размеры ковра: тонкие выноски у передней и правой кромок; подписи
     рисует drawDimLabels поверх кадра. Масштаб: куб-нора 40 см = CELL единиц */
  const dimZ = 4 + RD/2 + 16, dimX = RW/2 + 18;
  const cm = u => Math.round(u * 40 / CELL / 10) * 10 + " см";
  const dline = (p1, p2) => new Zdog.Shape({ addTo:room, stroke:1.6, color:P.note,
    closed:false, path:[p1, p2] });
  dline({ x:-RW/2, y:GROUND-1, z:dimZ }, { x:RW/2, y:GROUND-1, z:dimZ });
  [-1,1].forEach(s => dline({ x:s*RW/2, y:GROUND-1, z:dimZ-6 }, { x:s*RW/2, y:GROUND-1, z:dimZ+6 }));
  dline({ x:dimX, y:GROUND-1, z:4-RD/2 }, { x:dimX, y:GROUND-1, z:4+RD/2 });
  [-1,1].forEach(s => dline({ x:dimX-6, y:GROUND-1, z:4+s*RD/2 }, { x:dimX+6, y:GROUND-1, z:4+s*RD/2 }));
  const dAnchor = (x, z) => new Zdog.Anchor({ addTo:room, translate:{ x, y:GROUND-1, z } });
  dimLabels = [
    { m:dAnchor(0, dimZ), e:dAnchor(60, dimZ), text:cm(RW), oy:10 },
    { m:dAnchor(dimX, 4), e:dAnchor(dimX, 64), text:cm(RD), oy:10 }
  ];
  // растение справа
  const plant = new Zdog.Anchor({ addTo:room, translate:{ x:330, y:GROUND, z:64 } });
  new Zdog.Cylinder({ addTo:plant, diameter:44, length:34, rotate:{ x:TAU/4 },
    translate:{ y:-17 }, color:calm(P.pot), frontFace:calm(P.pot), backface:calm(P.matchaDark), stroke:false });
  [[0,-0.1],[-0.45,0.25],[0.5,0.2],[-0.2,0.6],[0.25,-0.55]].forEach(([rz,ry],k) => {
    new Zdog.Ellipse({ addTo:plant, width:26, height:74, fill:true, stroke:3, color: calm(k%2 ? P.matcha : P.matchaDark),
      translate:{ y:-95 }, rotate:{ z:rz, y:ry },
    });
  });
  new Zdog.Shape({ addTo:plant, stroke:4, color:calm(P.matchaDark), closed:false,
    path:[ { y:-34 }, { y:-70 } ] });
  // бумажный торшер слева
  const lamp = new Zdog.Anchor({ addTo:room, translate:{ x:-300, y:GROUND, z:-70 } });
  new Zdog.Cylinder({ addTo:lamp, diameter:36, length:8, rotate:{ x:TAU/4 },
    translate:{ y:-4 }, color:calm(P.stand), frontFace:calm(P.stand), backface:calm(P.stand), stroke:false });
  new Zdog.Shape({ addTo:lamp, stroke:3.4, color:calm(P.stand), closed:false, path:[ { y:-6 }, { y:-58 } ] });
  new Zdog.Shape({ addTo:lamp, stroke:52, color:calm(P.lamp), closed:false,
    path:[ { y:-72 }, { y:-176 } ] });
  new Zdog.Shape({ addTo:lamp, stroke:64, color:P.lampGlow, path:[{ y:-124 }] });
  // миска у передней кромки — обжитой угол (сдвинута левее выноски размеров)
  const bowl = new Zdog.Anchor({ addTo:room, translate:{ x:-278, y:GROUND, z:118 } });
  new Zdog.Cylinder({ addTo:bowl, diameter:34, length:12, rotate:{ x:TAU/4 },
    translate:{ y:-6 }, color:calm(P.aka), frontFace:calm(P.akaDeep), backface:calm(P.aka), stroke:false });
  new Zdog.Ellipse({ addTo:bowl, diameter:22, rotate:{ x:TAU/4 },
    translate:{ y:-12.5 }, stroke:4, fill:true, color:calm(P.wood2) });
  return room;
}

/* ---------- инициализация ---------- */
function build(){
  canvas = document.getElementById("scene");
  P = activePalette();
  /* Zdog при создании Illustration домножает backing store холста на pixelRatio
     (element.width *= pixelRatio). На повторной пересборке (смена темы/цвета) он
     прочитал бы уже увеличенный размер и домножил ещё раз — сцена «отъезжала».
     Возвращаем исходные атрибуты холста перед созданием новой Illustration. */
  if (canvas._baseW == null){ canvas._baseW = canvas.width; canvas._baseH = canvas.height; }
  canvas.width = canvas._baseW; canvas.height = canvas._baseH;
  if (illo){ illo.children = []; illo = null; }
  illo = new Zdog.Illustration({
    element: canvas, zoom: 1.18, dragRotate: false,
  });
  /* y:-10, не меньше: при -26 окно и свиток упирались в верхний край холста
     и комната выглядела «обрезанной» сверху.
     x:-8 — дом левее центра: панель чата справа перекрывает меньше сцены */
  world = new Zdog.Anchor({ addTo: illo, rotate: { x: -0.24, y: 0.30 }, translate:{ x: -8, y: -10 } });
  // комната — единая Group, ЖЁСТКО закреплённая позади всего:
  // средняя глубина группы зависит от размеров пола/швов, и при глубоком поле
  // сортировка начинала рисовать комнату ПОВЕРХ модулей (плоские кубы,
  // пропавшая лежанка) — поэтому sortValue прибиваем, а не вычисляем
  const roomG = new Zdog.Group({ addTo: world });
  makeRoom(roomG);
  roomG.updateSortValue = function(){
    Zdog.Group.prototype.updateSortValue.call(this);
    this.sortValue = -1e9;
  };
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
  moduleKind = {};
  moduleDy = {};
  moduleSupY = {};
  dirty = true;
}

/* ---------- публичное API ---------- */
const api = KD.scene = {};

/* пересобрать сцену и восстановить текущий дом. Карты формы лаза (entryShapes) и
   крыши (roofOn) переживают build() — он их не трогает, — поэтому отделка кубов
   сохраняется. Используется и сменой темы, и сменой цветовой коллекции. */
function rebuildAndRestore(){
  if (KD.cancelDrag) KD.cancelDrag(); // драг держит якоря старой сцены
  build();
  const grid = KD.configurator ? KD.configurator.getGrid() : api._snapshot;
  if (grid) api.restore(grid);
}

api.init = function(){
  build();
  /* смена темы: пересобрать сцену и восстановить дом из АКТУАЛЬНОЙ сетки конструктора домиков
     (раньше брали _snapshot, который никто не наполнял, — дом исчезал) */
  darkMq.addEventListener("change", rebuildAndRestore);
  animate();
};

/* цветовая коллекция (когтеточка = ковёр): terracotta | sage | charcoal | natural */
api.getCollection = () => collection;
api.listCollections = () => Object.keys(COLLECTIONS);
api.setCollection = function(name){
  if (!COLLECTIONS[name] || name === collection) return false;
  collection = name;
  rebuildAndRestore();
  return true;
};

api._snapshot = null;
api.restore = function(grid){
  api._snapshot = grid;
  const savedScratch = Object.assign({}, scratchDir); // повороты пандусов переживают пересборку (напр. смену цвета коллекции)
  Object.keys(moduleAnchors).forEach(i => api.remove(+i, true));
  grid.forEach((t, i) => {
    if (!t || !MODULES[t]) return; // пусто или маркер широкого модуля
    const opts = { below: i >= COLS ? grid[i - COLS] : null };
    if (MODULES[t].w > 1) opts.below2 = i >= COLS ? grid[i - COLS + 1] : null;
    if (t === "tunnel"){
      const col = i % COLS;
      opts.tunnelAxis = ((col > 0 && grid[i-1]) || (col < COLS-1 && grid[i+1])) ? "x" : "z";
    }
    if (t === "scratch" && savedScratch[i] != null) opts.scratchDir = savedScratch[i];
    api.place(i, t, true, opts);
  });
};

/* лаз — свойство отдельного куба: circle | square | pentagon.
   setEntryHover подсвечивает лаз куба под курсором (entryLit), setEntryShapeAt
   меняет форму одного куба на лету — перестраиваем только его объект-лаз, не
   трогая ни модуль, ни состав сборки. */
api.setEntryHover = function(i){
  if (i != null && grid_base(i) === false) i = null; // подсветка только у кубов
  if (hoverEntry === i) return;
  const prev = hoverEntry; hoverEntry = i;
  [prev, i].forEach(k => { if (k != null && entryObjs[k]) entryObjs[k].color = entryColor(k); });
  dirty = true;
};
/* есть ли лаз у модуля в ячейке i (куб) — по наличию записанного объекта-лаза */
function grid_base(i){ return !!entryObjs[i]; }
api.setEntryShapeAt = function(i, s){
  if (!ENTRY_SHAPES[s]) return false;
  entryShapes[i] = s;
  const a = moduleAnchors[i], old = entryObjs[i];
  if (a && old){
    a.removeChild(old);
    const S = CELL - 10, B = CELL / 2, H = CELL - 2;   // те же размеры, что в makeModule
    entryObjs[i] = makeEntry(a, S, H, B, s, entryColor(i));
    dirty = true;
  }
  return true;
};
api.getEntryShapeAt = i => entryShapes[i] || DEFAULT_ENTRY;
api.hasEntry = i => !!entryObjs[i];

/* крыша — свойство отдельного куба (вкл/выкл + стиль "asym"|"sym").
   Меняет силуэт куба целиком, поэтому пересобираем сам модуль на месте, сохраняя
   форму лаза и высоту опоры (moduleSupY, запомненную при постановке). */
let moduleSupY = {};    // cellIndex -> supY, с которой куб был поставлен
api.hasRoof = i => !!roofOn[i];
api.getRoofAt = i => !!roofOn[i];
api.getRoofStyleAt = i => roofStyle[i] || DEFAULT_ROOF;
api.setRoofAt = function(i, on, style){
  if (!entryObjs[i]) return false;   // крыша только у кубов (по наличию лаза)
  roofOn[i] = !!on;
  if (style && style in ROOF_STYLES) roofStyle[i] = style;   // 'sym' даёт 0 — проверяем ключ, не значение
  const es = entryShapes[i] || DEFAULT_ENTRY;
  const a = makeModule("base", houseA, { cellIndex:i, roof:!!on,
    roofStyle: roofStyle[i] || DEFAULT_ROOF, entryShape:es, supY:moduleSupY[i] });
  a.translate.set({ x: cellX(colOf(i)), y: cellY(rowOf(i)) });
  a.translate.y += moduleDy[i] || 0;
  if (moduleAnchors[i]) houseA.removeChild(moduleAnchors[i]);
  moduleAnchors[i] = a;
  dirty = true;
  return true;
};
/* стиль отдельно стоящего модуля-крыши (per-roof): пересобрать её на месте,
   сохранив опору (moduleSupY) и опускание на опору (moduleDy) */
api.setRoofModuleStyle = function(i, style){
  if (!moduleAnchors[i]) return false;
  roofStyle[i] = (style in ROOF_STYLES) ? style : DEFAULT_ROOF;
  const a = makeModule("roof", houseA, { cellIndex:i, roofStyle:roofStyle[i], supY:moduleSupY[i] });
  a.translate.set({ x: cellX(colOf(i)), y: cellY(rowOf(i)) });
  a.translate.y += moduleDy[i] || 0;
  houseA.removeChild(moduleAnchors[i]);
  moduleAnchors[i] = a;
  dirty = true;
  return true;
};
/* поворот когтеточки-пандуса (0..3, шаг 90°): пересобрать на месте, сохранив
   опору и опускание. Конструктор задаёт дефолт по соседу, кнопка меню крутит */
api.getScratchDir = i => scratchDir[i] || 0;
api.setScratchDir = function(i, dir){
  if (moduleKind[i] !== "scratch") return false;
  scratchDir[i] = ((dir % 4) + 4) % 4;
  const a = makeModule("scratch", houseA, { cellIndex:i, scratchDir:scratchDir[i], supY:moduleSupY[i] });
  a.translate.set({ x: cellX(colOf(i)), y: cellY(rowOf(i)) });
  a.translate.y += moduleDy[i] || 0;
  houseA.removeChild(moduleAnchors[i]);
  moduleAnchors[i] = a;
  dirty = true;
  return true;
};

api.place = function(i, type, instant, opts){
  if (moduleAnchors[i]) api.remove(i); // ячейка занята — не плодить якорь-сироту
  opts = Object.assign({}, opts);
  opts.cellIndex = i;
  /* форма лаза и крыша «переезжают» с кубом: конструктор передаёт их при переносе */
  if (opts.entryShape) entryShapes[i] = opts.entryShape;
  if (opts.roof != null) roofOn[i] = !!opts.roof;
  if (opts.roofStyle && opts.roofStyle in ROOF_STYLES) roofStyle[i] = opts.roofStyle;
  if (opts.scratchDir != null) scratchDir[i] = ((opts.scratchDir % 4) + 4) % 4;
  moduleKind[i] = type;
  /* до какой высоты тянутся опоры: верх модуля снизу (или граница ячейки/пол) */
  const supOf = b => b && MODULES[b] ? CELL + (TOP_Y[b] ?? -CELL/2) : CELL/2;
  opts.supY = supOf(opts.below);
  moduleSupY[i] = opts.supY;   // запомнить опору — для пересборки куба (setRoofAt)
  if (MODULES[type].w > 1) opts.supY2 = supOf(opts.below2);
  const a = makeModule(type, houseA, opts);
  a.translate.set({ x: cellX(colOf(i)), y: cellY(rowOf(i)) });
  /* крыша, тоннель, когтеточка и чаша-лежанка не тянутся — целиком опускаются на опору */
  const dy = opts.supY - CELL/2;
  moduleDy[i] = (type === "roof" || type === "tunnel" || type === "scratch" || type === "play") && dy ? dy : 0;
  a.translate.y += moduleDy[i];
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
  delete moduleKind[i];
  delete moduleDy[i];
  delete moduleSupY[i];
  delete entryObjs[i];
  delete entryShapes[i];
  delete roofOn[i];
  delete roofStyle[i];
  delete scratchDir[i];
  if (hoverEntry === i) hoverEntry = null;
  dirty = true;
};

api.showGhosts = function(cells, hot, w){
  api.clearGhosts();
  const S = CELL - 12;
  w = w || 1;
  // «горячая» ячейка рисуется последней, чтобы её подсветка не тонула под соседями
  cells.slice().sort((a, b) => (a === hot) - (b === hot)).forEach(i => {
    const g = new Zdog.Box({
      addTo: ghostA, width: S + (w-1)*CELL, height:S, depth:S, stroke:false,
      color: i === hot ? P.ghostHot : P.ghost,
      translate: { x: cellX(colOf(i)) + (w-1)*CELL/2, y: cellY(rowOf(i)) }
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

/* клиентские (px) координаты центра ячейки — для попадания клика по модулю.
   Если в ячейке стоит модуль, берём ЕГО якорь: крыша/тоннель/когтеточка на
   низкой опоре (лежанка) опущены на moduleDy, и хит-точка должна ехать с ними,
   иначе кликать пришлось бы «в воздухе» над крышей. Пустая ячейка — центр сетки */
api.cellClientPos = function(i){
  illo.updateGraph();
  const a = moduleAnchors[i] || cellAnchors[i];
  const r = canvas.getBoundingClientRect();
  const k = illo.zoom * (r.width / illo.width);
  return { x: r.left + r.width/2 + a.renderOrigin.x * k,
           y: r.top + r.height/2 + a.renderOrigin.y * k };
};

/* локальная высота верхушки модуля над центром его ячейки (y вверх отрицателен) —
   чтобы всплывающее меню вставало НАД модулем, а не поверх него */
function moduleTopY(i){
  const B = CELL/2, H = CELL - 2, rH = (CELL-10)*0.56;
  switch (moduleKind[i]){
    case "base":    return roofOn[i] ? (B - H - 1.5 - rH - 6) : (B - H - 5);
    case "roof":    return (B - 30) - rH - 6;   // верх корпуса домика-крыши минус скат
    case "tower":   return -B - 6;
    case "scratch": return B - 46 - 6;          // конёк пандуса (HH=46)
    case "play":    return -B - 12;
    default:        return -6;                    // невысокие модули: чуть выше центра
  }
}
/* клиентская точка ВЕРХУШКИ модуля — якорь для меню (см. positionMenu) */
api.moduleTopClientPos = function(i){
  const a = moduleAnchors[i] || cellAnchors[i];
  const probe = new Zdog.Anchor({ addTo:a, translate:{ y: moduleTopY(i) } });
  illo.updateRenderGraph();   // renderOrigin проставляется только рендер-проходом (updateGraph не хватает для нового узла)
  const r = canvas.getBoundingClientRect();
  const k = illo.zoom * (r.width / illo.width);
  const pt = { x: r.left + r.width/2 + probe.renderOrigin.x * k,
               y: r.top + r.height/2 + probe.renderOrigin.y * k };
  a.removeChild(probe);
  dirty = true;   // вернуть нормальную отрисовку в следующем кадре
  return pt;
};

/* иконка модуля для лотка: рендерим НАСТОЯЩИЙ Zdog-модуль в offscreen-канвас,
   обрезаем по непрозрачным пикселям и вписываем в 76×64 (@2x) — иконка
   выглядит ровно так же, как модуль в сцене */
api.moduleIcon = function(type){
  const savedP = P;
  try{
  const big = document.createElement("canvas");
  big.width = 420; big.height = 320;
  P = activePalette("light"); // чипы лотка всегда светлые (в тёмной теме — кремовые), цвет коллекции учтён
  const mini = new Zdog.Illustration({ element: big, zoom: 2 });
  const wld = new Zdog.Anchor({ addTo: mini, rotate: { x: -0.24, y: 0.30 } });
  makeModule(type, wld, {});
  mini.updateRenderGraph();
  const W = big.width, Hh = big.height;
  const px = big.getContext("2d").getImageData(0, 0, W, Hh).data;
  let x0 = W, y0 = Hh, x1 = 0, y1 = 0;
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++){
    if (px[(y*W + x)*4 + 3] > 8){
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 <= x0) return "";
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const OW = 152, OH = 128;
  const out = document.createElement("canvas");
  out.width = OW; out.height = OH;
  const k = Math.min(OW*0.92/bw, OH*0.92/bh);
  const ctx = out.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(big, x0, y0, bw, bh, (OW-bw*k)/2, (OH-bh*k)/2, bw*k, bh*k);
  return out.toDataURL();
  }catch(_){
    return ""; // лоток покажет текстовую заглушку вместо иконки
  }finally{
    P = savedP;
  }
};

/* «соло»-рендер: в сцене остаётся ТОЛЬКО постройка (без комнаты, декора и
   подписей размеров) на ровном фоне. Служебный режим для съёмки чистых
   структурных референсов постройки под генерацию фото (см. ?solo в конструкторе). */
api.soloHouse = function(){
  world.children = [houseA];
  canvas.style.background = "#F2ECDD";
  dimLabels = [];        // убрать подписи размеров ковра с холста
  dirty = true;
};

/* пульс модуля (при визите кота) */
api.pulse = function(i){
  const a = moduleAnchors[i];
  if (!a || REDUCED) return;
  popAnims.push({ anchor: a, t0: performance.now(), dur: 380, pulse: true });
  dirty = true;
};

/* ---------- Момо: анимация заселения ---------- */
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

/* высота «пола для лап» каждого модуля: смещение от центра ячейки */
const SIT_Y = { base:-29, lounge:-1, tunnel:-11, tower:-30, hammock:3, hammock2:8, roof:-12, scratch:-2, play:8 };

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
  if (leaving) await leaving;
  catSettled = false;
  catA.group.scale.set({ x:1, y:1, z:1 });
  catA.rotate.y = 0;
  // вход из-за левого края (справа стоит растение — не бежим «сквозь» него)
  catA.translate.set({ x: -380, y: GROUND - 16, z: 40 });
  const first = visits[0];
  // подбежать к первому модулю
  const fx = cellX(colOf(first)), fy = cellY(rowOf(first));
  await tween(REDUCED ? 1 : 900, t => {
    catA.translate.x = tw(-380, fx - CELL*0.9, easeOut(t));
    catA.translate.y = GROUND - 16 - Math.abs(Math.sin(t * TAU * 1.5)) * 10;
  });
  // обнюхать
  await tween(350, t => { catA.group.scale.y = 1 - Math.sin(t*Math.PI)*0.12; });
  // обход модулей
  for (let k = 0; k < visits.length; k++){
    const i = visits[k];
    const type = onVisit(i, k); // конструктор домиков вернёт тип и покажет сердечко
    const mw = (MODULES[type] && MODULES[type].w) || 1;
    const tx = cellX(colOf(i)) + (mw-1)*CELL/2; // широкий модуль: кот садится в середину
    const ty = cellY(rowOf(i)) + (SIT_Y[type] ?? -29) + (moduleDy[i] || 0) - 13; // лапы на «крышу» модуля
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
  // финал: сесть, довольно покачаться — и остаться жить
  await tween(700, t => { catA.rotate.y = Math.sin(t * TAU) * 0.14; });
  catSettled = true;
  onDone && onDone();
};

function parkCat(){ catSettled = false; catA.translate.set({ x: 0, y: 4000, z: 0 }); }
api.hideCat = function(){ parkCat(); dirty = true; };
api.isCatSettled = () => catSettled;

/* кот уже заселён, а дом меняют: спрыгнуть и убежать за правый край */
let leaving = null;
api.catLeave = function(){
  if (!catSettled) return leaving || Promise.resolve();
  catSettled = false;
  leaving = (async () => {
    const exitX = -330;
    await hopTo(exitX, GROUND - 16, REDUCED ? 1 : 460);
    await tween(REDUCED ? 1 : 420, t => {
      catA.translate.x = tw(exitX, -430, t);
      catA.translate.y = GROUND - 16 - Math.abs(Math.sin(t * TAU * 1.2)) * 8;
    });
    parkCat(); dirty = true;
    leaving = null;
  })();
  return leaving;
};

/* ---------- подписи размеров ковра ----------
   Zdog не умеет текст: рисуем поверх готового кадра, повторив его
   трансформацию (центр + pixelRatio×zoom); renderOrigin якорей уже
   спроецирован, угол наклона берём по двум точкам вдоль выноски */
function drawDimLabels(){
  if (!dimLabels.length || !illo) return;
  const ctx = illo.ctx;
  ctx.save();
  ctx.translate(illo.width/2 * illo.pixelRatio, illo.height/2 * illo.pixelRatio);
  const s = illo.pixelRatio * illo.zoom;
  ctx.scale(s, s);
  ctx.font = "700 10.5px Nunito, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = P.note;
  dimLabels.forEach(d => {
    const m = d.m.renderOrigin, e = d.e.renderOrigin;
    let a = Math.atan2(e.y - m.y, e.x - m.x);
    if (a > TAU/4) a -= TAU/2; else if (a < -TAU/4) a += TAU/2; // не вверх ногами
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(a);
    ctx.fillText(d.text, d.ox || 0, d.oy || 0);
    ctx.restore();
  });
  ctx.restore();
}

/* ---------- цикл отрисовки ---------- */
function animate(){
  const now = performance.now();
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
  if (dirty){ illo.updateRenderGraph(); drawDimLabels(); dirty = false; }
  requestAnimationFrame(animate);
}
function easeOutQ(t){ return 1 - (1-t)*(1-t); }

})();
