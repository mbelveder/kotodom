# Видео-брендворлд Котоши

Единый визуальный референс, который используется при генерации всех
AI-роликов и рендеров для сайта (hero-рендеры и видео под hero), чтобы
конструкция, комната и кот выглядели одинаково от кадра к кадру и от
ролика к ролику.

## Референсное изображение

`assets/brand-anchor.jpg` — опорное фото, на которое ссылаются все
последующие генерации (передаётся как `images: [...]` в запросе к
модели) для сохранения консистентного вида.

## Описание стиля (промпт опорного изображения)

```
Photorealistic interior photograph, editorial product-photography look.
A warm, minimalist Japanese-style living room: light birch-wood plank
floor, soft off-white walls, a muted terracotta area rug, a shoji
wood-lattice window on the left letting in gentle diffuse daylight, and
a slender branch of pale pink cherry blossoms in the frame. Shallow
depth of field, soft natural light, cozy and stylish.

In the center of the room stands a RICH, playful, stylish MODULAR CAT
HOUSE built from natural birch plywood modules with visible rounded
wooden dowel joints — exactly the same clean minimalist plywood
construction system shown in the reference images (same wood tone, same
joinery, same terracotta pagoda roof accent). It is a large COMBINED
build that reads clearly as one connected structure:
- two plywood cube dens at the base, each with a round porthole entrance,
- a short plywood tunnel linking the two cubes,
- a sisal-wrapped scratching post,
- a raised plywood bridge / platform with a hanging canvas hammock slung
  beneath it,
- and a tall lookout tower topped with a small terracotta triangular
  pagoda roof.

A fluffy white cat (a few soft grey patches, like the reference cat)
sits calmly on the top lookout platform. Everything is tidy, warm and
inviting. 16:9 wide framing. Keep the plywood modules, wood tones and
interior style consistent and recognizable versus the reference images.
```

Ключевые константы, которые должны сохраняться в любом новом кадре/ролике:
- тёплая минималистичная японская комната: светлый фанерный пол, светлые
  стены, терракотовый ковёр, окно-сёдзи слева, ветка сакуры справа;
- фанерная конструкция домика: два куба-норы с круглыми лазами и
  тоннелем между ними, гамак на раме, когтеточка в джуте, смотровая
  башня с терракотовой крышей-пагодой;
- пушистый белый кот с серыми пятнами.

## Генерация видео

- Модель: `gemini-omni-video` через шлюз Polza (`/api/v1/media`,
  асинхронно + поллинг `/api/v1/media/:id/operations`).
- Параметры по умолчанию: `resolution: "720p"`, `aspect_ratio: "16:9"`.
- В каждый запрос передаётся `assets/brand-anchor.jpg` как референс
  (`images`), чтобы новый клип оставался в этом же брендворлде.
- Максимальная длина одного клипа — 10 секунд, поэтому ролик под hero
  собирается из нескольких отдельно сгенерированных клипов (планов),
  склеенных при пост-продакшене (ffmpeg).

## Ролик `assets/kotoshi-loop.mp4` — раскадровка

1. **План 1 — колени.** Кот дремлет на коленях хозяина, конструкция
   мягко расфокусирована на фоне; кот поднимает голову, насторожился.
2. **План 2 — раскрытие домика.** Камера показывает, как кот
   спрыгивает/идёт к домику; кадр раскрывает всю конструкцию целиком.
3. **План 3 — вид от кота.** Субъективная камера ныряет в лаз, мчится
   по тоннелю мимо когтеточки, тряска как будто камера закреплена на
   коте.
4. **План 4 — финал.** Общий план: кот отдыхает на самом верху под
   крышей-пагодой, медленный плавный zoom-out.

Автоплей, без звука, зациклен (`autoplay muted loop` на `#filmVid` в
`index.html`).
