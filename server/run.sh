#!/usr/bin/env bash
# КотоДом: запускает backend + Cloudflare quick tunnel и прописывает адрес в config.js
# Использование:  ./run.sh          — сервер + туннель
#                 ./run.sh --push   — то же + git commit/push config.js (обновит GitHub Pages)
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v cloudflared >/dev/null; then
  echo "cloudflared не найден. Установите: brew install cloudflared"
  exit 1
fi
if [ ! -f .env ]; then
  echo "Нет server/.env — скопируйте .env.example и заполните ключи."
  exit 1
fi

PORT="${PORT:-8787}"

node server.js &
NODE_PID=$!
trap 'kill $NODE_PID 2>/dev/null; kill ${CF_PID:-0} 2>/dev/null; exit' INT TERM

echo "Поднимаю Cloudflare quick tunnel…"
TUNNEL_LOG=$(mktemp)
cloudflared tunnel --url "http://localhost:$PORT" --no-autoupdate > "$TUNNEL_LOG" 2>&1 &
CF_PID=$!

URL=""
for i in $(seq 1 30); do
  URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" | head -1 || true)
  [ -n "$URL" ] && break
  sleep 1
done
if [ -z "$URL" ]; then
  echo "Не удалось получить адрес туннеля. Лог: $TUNNEL_LOG"
  kill $NODE_PID $CF_PID 2>/dev/null; exit 1
fi

echo "window.KOTODOM_API = \"$URL\";" > ../config.js
echo ""
echo "✅ Backend:  http://localhost:$PORT"
echo "✅ Туннель:  $URL"
echo "✅ config.js обновлён."

if [ "${1:-}" = "--push" ]; then
  git -C .. add config.js
  git -C .. commit -m "chore: обновить адрес туннеля" >/dev/null && git -C .. push && \
    echo "✅ Запушено — GitHub Pages подхватит адрес через ~1 минуту." || \
    echo "ℹ config.js не изменился либо push не удался."
else
  echo "ℹ Чтобы сайт на GitHub Pages увидел новый адрес: ./run.sh --push"
  echo "ℹ Или откройте сайт с параметром: https://mbelveder.github.io/kotodom/?api=$URL"
fi
echo ""
echo "Останов: Ctrl+C"
wait $NODE_PID
