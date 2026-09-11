#!/bin/bash
# 使い方: shotjs.sh <mode> <variant A|B|C> <out.png> [WxH]
MODE="$1"; V="$2"; OUT="$3"; SIZE="${4:-520,940}"
JS=$(node -e "process.stdout.write(encodeURIComponent(\"var s=document.createElement('script');s.src='file:///C:/Users/win11/OneDrive/デスクトップ/こどもアプリ作業場/manabi-quest/tools/bgmock/bgmock.js?v=$V';document.head.appendChild(s);\"))")
TMP=$(mktemp -d)
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --allow-file-access-from-files --user-data-dir="$TMP" \
  --virtual-time-budget=30000 --window-size="$SIZE" --hide-scrollbars --screenshot="$OUT" \
  "file:///C:/Users/win11/OneDrive/デスクトップ/こどもアプリ作業場/manabi-quest/tools/harness.html#$MODE|js=$JS" 2>/dev/null
