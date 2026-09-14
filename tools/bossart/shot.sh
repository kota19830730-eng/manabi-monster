#!/bin/bash
# 使い方: ./shot.sh dragonA,dragonB out.png [W] [H]
cd "$(dirname "$0")"
node preview.js "$1" >/dev/null || exit 1
D="C:/Users/win11/AppData/Local/Temp/claude/c--Users-win11-OneDrive-----------------/d28bd26d-9c33-4411-aced-fbaaeff8a6b3/scratchpad/boss"
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --user-data-dir="$(mktemp -d)" \
  --virtual-time-budget=3000 --window-size=${3:-1300},${4:-640} --hide-scrollbars \
  --screenshot="$D/$2" "file:///$D/preview.html" 2>/dev/null
echo "$D/$2"
