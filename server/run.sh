#!/usr/bin/env bash
# КотоДом: backend + Cloudflare quick tunnel с самовосстановлением (сон, обрывы, лимиты).
# Использование:  ./run.sh          — сервер + туннель, адрес пишется в config.js
#                 ./run.sh --push   — плюс автопуш адреса в GitHub Pages при каждой смене
# Скрипт живёт в терминале и чинит себя сам. Перезапускать после сна НЕ нужно.
# Повторный запуск в любой момент безопасен: прежние экземпляры убираются автоматически.
set -uo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-8787}"
PUSH="${1:-}"
CF_LOG="/tmp/kotodom_tunnel.$$.log"   # свой лог на каждый экземпляр

command -v cloudflared >/dev/null || { echo "cloudflared не найден: brew install cloudflared"; exit 1; }
[ -f .env ] || { echo "Нет server/.env — скопируйте .env.example и заполните."; exit 1; }

# ── идемпотентность: убираем прежние экземпляры (включая другие run.sh) ──
for pid in $(pgrep -f "run\.sh" 2>/dev/null); do
  [ "$pid" != "$$" ] && [ "$pid" != "$PPID" ] && kill "$pid" 2>/dev/null
done
pkill -f "node server.js" 2>/dev/null
pkill -f "cloudflared tunnel --url http://localhost:$PORT" 2>/dev/null
sleep 1

NODE_PID=""; CF_PID=""; URL=""; URL_TS=0; FAILS=0

start_node(){ node server.js & NODE_PID=$!; }
start_tunnel(){
  : > "$CF_LOG"
  cloudflared tunnel --url "http://localhost:$PORT" --no-autoupdate >> "$CF_LOG" 2>&1 &
  CF_PID=$!
}
get_url(){ grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$CF_LOG" | head -1; }

PUSH_PENDING=0
publish(){
  echo "window.KOTODOM_API = \"$1\";" > ../config.js
  echo "$(date +%H:%M:%S) ✅ Туннель: $1"
  if [ "$PUSH" = "--push" ]; then
    PUSH_PENDING=1; try_push
  else
    echo "ℹ Или откройте сайт так: https://mbelveder.github.io/kotodom/?api=$1"
  fi
}
try_push(){
  [ "$PUSH_PENDING" = "1" ] || return 0
  git -C .. add config.js
  git -C .. commit -m "chore: адрес туннеля" >/dev/null 2>&1
  git -C .. pull --rebase -q >/dev/null 2>&1
  if git -C .. push >/dev/null 2>&1; then
    PUSH_PENDING=0
    echo "$(date +%H:%M:%S) ✅ Запушено — Pages подхватит за ~1 минуту."
  else
    echo "$(date +%H:%M:%S) ⚠ push не удался — повторю через 15 с"
  fi
}

trap 'kill $NODE_PID $CF_PID 2>/dev/null; echo; echo "Остановлено."; exit' INT TERM

start_node
start_tunnel
echo "Запуск… (Ctrl+C — остановить сервер и туннель)"

# ── цикл-сторож ──────────────────────────────────────────────────────────
while true; do
  # backend жив?
  if ! kill -0 "$NODE_PID" 2>/dev/null; then
    echo "$(date +%H:%M:%S) ↻ backend упал — перезапускаю"
    start_node
  fi
  # процесс туннеля жив?
  if ! kill -0 "$CF_PID" 2>/dev/null; then
    echo "$(date +%H:%M:%S) ↻ туннель упал — перезапускаю"
    sleep 3; start_tunnel; URL=""
  fi
  # trycloudflare отказал (лимит на частые quick-туннели) → пауза и повтор
  if [ -z "$URL" ] && grep -q "failed to .* quick Tunnel" "$CF_LOG"; then
    echo "$(date +%H:%M:%S) ⚠ quick tunnel не выдан (лимит) — жду 20 с и пробую снова"
    kill "$CF_PID" 2>/dev/null; sleep 20; start_tunnel
  fi
  # появился/сменился адрес → публикуем; незапушенное — допушиваем
  NEW=$(get_url || true)
  if [ -n "$NEW" ] && [ "$NEW" != "$URL" ]; then
    URL="$NEW"; URL_TS=$(date +%s); FAILS=0; publish "$URL"
  else
    try_push
  fi
  # процесс жив, но после сна edge мог отвалиться: проверяем сквозь туннель.
  # DNS нового quick-туннеля прогревается до ~90 с — до этого не трогаем;
  # пересоздаём только после 3 неудач подряд.
  if [ -n "$URL" ] && [ $(( $(date +%s) - URL_TS )) -gt 90 ]; then
    if curl -s -m 8 "$URL/api/health" | grep -q '"ok"'; then
      FAILS=0
    else
      FAILS=$((FAILS+1))
      if [ "$FAILS" -ge 3 ]; then
        echo "$(date +%H:%M:%S) ⚠ туннель не отвечает 3 проверки подряд (сон/обрыв) — пересоздаю"
        kill "$CF_PID" 2>/dev/null; URL=""; FAILS=0
      fi
    fi
  fi
  sleep 15
done
