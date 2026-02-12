#!/usr/bin/env bash
set -euo pipefail

CANDIDATE_DIRS=(
  "$PWD/openclaw"
  "$PWD"
  "$HOME/.openclaw"
  "/etc/openclaw"
  "/opt/openclaw"
)

CONFIG_FILES=()
for dir in "${CANDIDATE_DIRS[@]}"; do
  [[ -d "$dir" ]] || continue
  while IFS= read -r file; do
    CONFIG_FILES+=("$file")
  done < <(find "$dir" -maxdepth 3 -type f \( -name '*.env' -o -name '*.yaml' -o -name '*.yml' -o -name '*.toml' \) ! -name 'package.json' -print 2>/dev/null)
done

if [[ ${#CONFIG_FILES[@]} -eq 0 ]]; then
  echo "No OpenClaw config files found in common paths; nothing to update."
  exit 0
fi

strip_patterns='(aliyun|阿里云|wecom|wechat_work|qywx|qiyeweixin|enterprise_wechat|webhook)'

updated=0
for file in "${CONFIG_FILES[@]}"; do
  if rg -qi "$strip_patterns" "$file"; then
    cp "$file" "$file.bak.$(date +%Y%m%d%H%M%S)"
    sed -Ei "/$strip_patterns/Id" "$file"
    echo "Removed Aliyun/WeCom related lines: $file"
    updated=$((updated + 1))
  fi

  if rg -qi "telegram" "$file"; then
    echo "Telegram entries already exist: $file"
  fi

done

echo "Finished. Updated $updated files."
