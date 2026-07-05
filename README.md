# КотоДом — демо-магазин модульных домиков для котов

Прототип магазина, которым управляет ИИ-агент: 3D-конфигуратор (Zdog), Смотритель на GLM-5.2 (Polza), заказы в Telegram. Оплата — демо.

**Сайт:** https://mbelveder.github.io/kotodom/ (GitHub Pages, статика)
**Backend:** ноль зависимостей, Node ≥ 18, работает на любой машине + Cloudflare quick tunnel.

## Запуск демо

1. `cp server/.env.example server/.env` и заполните `POLZA_API_KEY`, `TG_BOT_TOKEN` (от @BotFather).
2. Напишите своему боту любое сообщение (чтобы сервер узнал ваш chat_id).
3. `brew install cloudflared` (один раз).
4. `./server/run.sh --push` — поднимет сервер + туннель и запушит адрес туннеля в `config.js` (Pages подхватит за ~1 мин).
   Без пуша: откройте сайт как `…/kotodom/?api=<адрес-туннеля>` — адрес запомнится в браузере.

## Hermes в контуре операций

При `HERMES_OPS=1` каждый заказ и каждая эскалация уходят Hermes-агенту (gateway на :8642).
Агент работает по скиллу `~/.hermes/skills/ops/kotodom-operations/SKILL.md`: проверяет состав
и суммы, заводит карточку в kanban (если доступен), пишет черновик подтверждения голосом бренда —
и результат прилетает в Telegram вторым сообщением («🧠 Hermes: …»).

- Чат Смотрителя через агента: `KD_UPSTREAM=hermes` в `server/.env` (медленнее, но со скиллами).
- Наблюдение за агентом: `hermes status`, `hermes logs -f`, `hermes kanban`, `hermes dashboard`.
- Gateway должен работать: `hermes gateway status` / `hermes gateway start`.

## Доступ друга к Telegram-боту

Друг пишет любое сообщение боту @koto_module_bot → его chat_id появляется в логе сервера
(или оставьте `TG_CHAT_IDS` пустым — сервер добавит всех, кто писал боту). Явно:
`TG_CHAT_IDS=ваш_id,id_друга`.

## Что где

- `index.html`, `css/`, `js/` — сайт (без сборки, чистый JS)
- `js/scene.js` — комната и модули в Zdog, кот Мару
- `js/configurator.js` — drag-and-drop, правила сборки, цены
- `server/server.js` — `/api/chat` (SSE-прокси к Polza), `/api/order` (Telegram), `/api/health`
- `server/run.sh` — сервер + cloudflared quick tunnel

Секреты живут только в `server/.env` (в git не попадает).
