#!/bin/bash

set -u

payload="$(cat)"
command_text="$(printf "%s" "$payload" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("command", ""))' 2>/dev/null || true)"

if [[ -z "$command_text" ]]; then
  echo '{ "permission": "allow" }'
  exit 0
fi

if [[ "$command_text" =~ rm[[:space:]]+-rf[[:space:]]+/ ]]; then
  echo '{ "permission": "deny", "user_message": "Blocked: dangerous delete command detected (rm -rf /)." }'
  exit 0
fi

if [[ "$command_text" =~ git[[:space:]]+reset[[:space:]]+--hard ]]; then
  echo '{ "permission": "ask", "user_message": "This command is destructive (git reset --hard). Please confirm before running." }'
  exit 0
fi

if [[ "$command_text" =~ git[[:space:]]+push[[:space:]].*--force ]]; then
  echo '{ "permission": "ask", "user_message": "Force push detected. Please confirm before continuing." }'
  exit 0
fi

echo '{ "permission": "allow" }'
exit 0
