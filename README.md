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

## Что где

- `index.html`, `css/`, `js/` — сайт (без сборки, чистый JS)
- `js/scene.js` — комната и модули в Zdog, кот Мару
- `js/configurator.js` — drag-and-drop, правила сборки, цены
- `server/server.js` — `/api/chat` (SSE-прокси к Polza), `/api/order` (Telegram), `/api/health`
- `server/run.sh` — сервер + cloudflared quick tunnel

Секреты живут только в `server/.env` (в git не попадает).
