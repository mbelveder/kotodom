#!/bin/zsh
# Фаза 1: поддерживает docs/AGENTS.md в актуальном состоянии.
# Фаза 2: бэкапит Hermes-сетап в приватный репозиторий (hermes-backup) —
#         всегда ПОСЛЕ обновления документа, чтобы в бэкап попадала свежая версия.
# Запускается launchd-задачей com.kotodom.agents-doc раз в день.
# Дёшево: сравнивает mtime файлов-источников с mtime документа и зовёт
# Claude Code (headless) только если источники менялись после последней правки.

DOC="/Users/mike/hermes_test/kotodom-site/docs/AGENTS.md"
LOG="/Users/mike/hermes_test/kotodom-site/docs/update-agents-doc.log"
CLAUDE="/Users/mike/.local/bin/claude"
PROJECT="/Users/mike/hermes_test/kotodom-site"
BACKUP="/Users/mike/hermes_test/hermes-backup/backup-hermes.sh"

run_backup() {
  if [[ -f "$BACKUP" ]]; then
    /bin/bash "$BACKUP" >> "$LOG" 2>&1
  else
    echo "$(date '+%F %T') backup-hermes.sh не найден — бэкап пропущен" >> "$LOG"
  fi
}

SOURCES=(
  "$HOME/.hermes/skills/ops/kotoshi-operations/SKILL.md"
  "$HOME/.hermes/skills/creative/kotoshi-brand-voice/SKILL.md"
  "$HOME/.hermes/config.yaml"
  "$HOME/.hermes/SOUL.md"
  "$PROJECT/server/server.js"
  "$PROJECT/server/run.sh"
  "$PROJECT/js/chat.js"
  "$PROJECT/TESTING.md"
)

[[ -f "$DOC" ]] || { echo "$(date '+%F %T') AGENTS.md отсутствует — пропуск" >> "$LOG"; run_backup; exit 0; }

doc_mtime=$(stat -f %m "$DOC")
changed=0
for f in "${SOURCES[@]}"; do
  [[ -f "$f" ]] || continue
  if (( $(stat -f %m "$f") > doc_mtime )); then changed=1; break; fi
done

if (( ! changed )); then
  echo "$(date '+%F %T') источники не менялись — документ актуален" >> "$LOG"
  run_backup
  exit 0
fi

echo "$(date '+%F %T') источники изменились — обновляю AGENTS.md…" >> "$LOG"

PROMPT="Обнови документ docs/AGENTS.md (описание ИИ-агентов проекта Котоши на русском), чтобы он соответствовал текущему состоянию системы. Перечитай файлы-источники: ~/.hermes/skills/ops/kotoshi-operations/SKILL.md, ~/.hermes/skills/creative/kotoshi-brand-voice/SKILL.md, ~/.hermes/config.yaml (модель, провайдер), server/server.js (системный промпт Смотрителя, маркеры, пайплайн заказа), server/run.sh, js/chat.js, TESTING.md. Сравни с текстом AGENTS.md и правь ТОЛЬКО разделы, которые разошлись с реальностью (модель, шаги регламента, маркеры, пути, названия ботов). Сохрани структуру, стиль и уровень изложения (для читателя, не знакомого с агентами). СТРОГО ЗАПРЕЩЕНО вписывать в документ секреты: токены ботов, API-ключи, значения из .env — только имена переменных и пути к файлам. Если правил что-то по существу — обнови дату в шапке документа на сегодняшнюю. Если документ полностью актуален — не меняй ничего."

cd "$PROJECT" || exit 1
print -r -- "$PROMPT" | "$CLAUDE" -p \
  --allowedTools "Read,Edit,Write,Glob,Grep" \
  --add-dir "$HOME/.hermes" \
  >> "$LOG" 2>&1

echo "$(date '+%F %T') готово (exit $?)" >> "$LOG"

run_backup
