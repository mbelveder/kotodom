/* КотоДом — каталог модулей и правила сборки (общие данные) */
"use strict";

const KD = window.KD = {};

/* Сетка: COLS × ROWS, row 0 — пол, растёт вверх */
KD.COLS = 5;
KD.ROWS = 4;
KD.CELL = 62; // мировой размер ячейки в Zdog-единицах

KD.MODULES = {
  base: {
    name: "Куб-нора", jp: "はこ", price: 4990,
    desc: "Базовый модуль: фанерный куб с круглым лазом. С него начинается любой КотоДом.",
    needsSupport: false, supportsAbove: true, isRoof: false, hasEntrance: true,
    say: ["О! Куб. Заезжаю немедленно.", "Нора — это святое.", "Пахнет свежей фанерой. Одобряю."]
  },
  lounge: {
    name: "Лежанка", jp: "ざぶとん", price: 5990,
    desc: "Открытая лежанка с мягкой подушкой. Ставится на пол или на крышу куба.",
    needsSupport: false, supportsAbove: true, isRoof: false, hasEntrance: false,
    say: ["Подушка?! Считайте, я уже сплю.", "Отсюда отлично видно кухню.", "Мягко. Подозрительно мягко. Проверю часов восемь."]
  },
  tunnel: {
    name: "Тоннель", jp: "トンネル", price: 2490,
    desc: "Сквозной тоннель для засад и пробежек. Соединяет модули по горизонтали.",
    needsSupport: false, supportsAbove: false, isRoof: false, hasEntrance: true,
    say: ["Тоннель — идеальное место для засады.", "Туда-сюда. Туда-сюда. Гениально.", "Никто не заметит меня здесь. Никто."]
  },
  tower: {
    name: "Башня", jp: "タワー", price: 3990,
    desc: "Смотровая площадка на колонне. Ставится на куб или лежанку — коту нужна высота.",
    needsSupport: true, supportsAbove: true, isRoof: false, hasEntrance: false,
    say: ["Выше! Ещё выше! Я должен видеть всё.", "С высоты люди выглядят… управляемо.", "Моя башня. Моё королевство."]
  },
  hammock: {
    name: "Гамак", jp: "ハンモック", price: 1990,
    desc: "Подвесной гамак на раме. Крепится над любым закрытым модулем.",
    needsSupport: true, supportsAbove: false, isRoof: false, hasEntrance: false,
    say: ["Качается! Это лучший день в моей жизни.", "Гамак — это лежанка для продвинутых.", "Буду качаться и осуждать."]
  },
  roof: {
    name: "Крыша", jp: "やね", price: 1490,
    desc: "Двускатная крыша-чердак. Завершает постройку — ставится только сверху.",
    needsSupport: true, supportsAbove: false, isRoof: true, hasEntrance: false,
    say: ["Теперь это официально дом.", "Под крышей уютнее мурчится.", "Дождь в квартире маловероятен, но я ценю заботу."]
  },
  scratch: {
    name: "Когтеточка", jp: "つめとぎ", price: 990,
    desc: "Столбик в джуте. Ставится на пол рядом с домиком — и диван спасён*. (*повышенная стойкость, а не магия)",
    needsSupport: false, supportsAbove: false, isRoof: false, hasEntrance: false,
    say: ["Когти сами себя не наточат.", "Джут. Классика. Уважаю.", "Диван может спать спокойно. Наверное."]
  }
};

/* Готовые планы: cellIndex -> тип (index = row*COLS + col) */
KD.PRESETS = {
  start: { name: "Старт", cells: { 1: "base", 2: "scratch" } },
  wide:  { name: "Мост",  cells: { 1: "base", 2: "tunnel", 3: "base", 8: "hammock" } },
  tower: { name: "Башня", cells: { 1: "base", 6: "tower", 11: "roof", 2: "scratch" } }
};

KD.DISCOUNT_FROM = 5;   // модулей
KD.DISCOUNT = 0.05;

KD.fmt = n => n.toLocaleString("ru-RU").replace(/ /g, " ") + " ₽";

/* Реплики Мару на события */
KD.SAY = {
  empty: ["Комната пустая. Я расстроен, но сдержан.", "Тут был мой дом. Был."],
  removed: ["Эй! Я там жил!", "Ладно. Перестановка так перестановка."],
  blocked: ["Сверху что-то стоит — сначала уберите это.", "Так нельзя: наверху ещё модуль."],
  noSlot: ["Сюда не поставить. Подсвеченные места — можно.", "Мимо. Смотрите на подсказки!"],
  discount: ["Пять модулей! Вам скидка, мне дворец.", "Целый комплекс! Скидка 5% — заслуженно."],
  bigHouse: ["Это уже не домик. Это резиденция.", "Соседские коты будут завидовать."],
  movein: ["Иду смотреть!", "Инспекция начинается."]
};

/* Мини-иконки модулей для лотка и drag ghost (изометрические SVG) */
KD.ICONS = {
  base: `<svg viewBox="0 0 76 64"><g stroke="#2E2A33" stroke-width="1.6" stroke-linejoin="round"><path d="M14 22 L38 10 L62 22 L38 34 Z" fill="#E8C48F"/><path d="M14 22 L14 46 L38 58 L38 34 Z" fill="#C09263"/><path d="M62 22 L62 46 L38 58 L38 34 Z" fill="#DCB683"/><ellipse cx="50" cy="41" rx="7.5" ry="9" fill="#3B3040" stroke="none" transform="rotate(-8 50 41)"/></g></svg>`,
  lounge: `<svg viewBox="0 0 76 64"><g stroke="#2E2A33" stroke-width="1.6" stroke-linejoin="round"><path d="M14 34 L38 22 L62 34 L38 46 Z" fill="#C09263"/><path d="M14 34 L14 44 L38 56 L38 46 Z" fill="#A87F52"/><path d="M62 34 L62 44 L38 56 L38 46 Z" fill="#C09263"/><ellipse cx="38" cy="33" rx="16" ry="8" fill="#F3CDC6"/></g></svg>`,
  tunnel: `<svg viewBox="0 0 76 64"><g stroke="#2E2A33" stroke-width="1.6"><path d="M16 26 Q16 14 30 16 L60 28 Q64 40 52 44 L22 32 Q14 32 16 26 Z" fill="#DCB683"/><ellipse cx="22" cy="27" rx="8" ry="10" fill="#3B3040"/><ellipse cx="56" cy="36" rx="7" ry="9" fill="#C09263"/></g></svg>`,
  tower: `<svg viewBox="0 0 76 64"><g stroke="#2E2A33" stroke-width="1.6" stroke-linejoin="round"><rect x="33" y="20" width="10" height="34" fill="#C09263"/><path d="M14 16 L38 6 L62 16 L38 26 Z" fill="#E8C48F"/><path d="M14 16 L14 21 L38 31 L38 26 Z" fill="#C09263"/><path d="M62 16 L62 21 L38 31 L38 26 Z" fill="#DCB683"/></g></svg>`,
  hammock: `<svg viewBox="0 0 76 64"><g stroke="#2E2A33" stroke-width="1.6" fill="none"><path d="M14 14 L14 50 M62 14 L62 50" stroke-width="2.4"/><path d="M14 20 Q38 44 62 20" stroke="#C7423A" stroke-width="1.6" fill="#F3CDC6"/></g></svg>`,
  roof: `<svg viewBox="0 0 76 64"><g stroke="#2E2A33" stroke-width="1.6" stroke-linejoin="round"><path d="M10 40 L38 14 L66 40 L38 30 Z" fill="#C7423A"/><path d="M10 40 L38 30 L38 38 L14 46 Z" fill="#A93129"/><path d="M66 40 L38 30 L38 38 L62 46 Z" fill="#C7423A"/></g></svg>`,
  scratch: `<svg viewBox="0 0 76 64"><g stroke="#2E2A33" stroke-width="1.6"><rect x="32" y="12" width="12" height="38" rx="5" fill="#C89B6C"/><path d="M32 18 h12 M32 24 h12 M32 30 h12 M32 36 h12 M32 42 h12" stroke-width="1.1" opacity=".55"/><ellipse cx="38" cy="52" rx="16" ry="6" fill="#C09263"/></g></svg>`
};
