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

if [[ "$command_text" =~ git[[:space:]]+commit ]]; then
  # Reminder to keep Grapuco index fresh after code changes.
  echo '{ "permission": "ask", "user_message": "Before committing: ensure you are not staging .grapuco/ast-cache/**. After committing, run `grapuco push` so Grapuco index/traceability stays up to date." }'
  exit 0
fi

if [[ "$command_text" =~ git[[:space:]]+push([[:space:]]|$) ]]; then
  echo '{ "permission": "ask", "user_message": "Reminder: if you changed code, also run `grapuco push` so .grapuco intelligence stays current." }'
  exit 0
fi

echo '{ "permission": "allow" }'
exit 0
