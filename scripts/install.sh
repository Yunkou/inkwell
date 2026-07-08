#!/usr/bin/env bash
# scripts/install.sh — One-shot setup for the inkwell skill.
#
# Idempotent: safe to re-run after partial installs. Resolves $SKILL_DIR to
# the skill root (the directory above scripts/) so this works whether the
# script lives in the source repo or in ~/.codex/skills/inkwell (or any
# other install destination).
#
# Usage:
#   bash scripts/install.sh
#   SKILL_DIR=/path/to/install bash scripts/install.sh
#
# What it does:
#   1. Detects the skill directory (parent of scripts/)
#   2. Verifies Node.js >= 18
#   3. Runs `npm install` if node_modules/ is missing or package-lock is newer
#   4. Verifies fonts/LXGWWenKai-Regular.woff2 exists
#   5. Verifies references/design-tokens.json exists
#   6. Prints next-step instructions for the AI agent

set -euo pipefail

# Resolve script directory regardless of how the script is invoked
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="${SKILL_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"

ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m⚠\033[0m  %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; }
section() { printf '\n\033[34m▸\033[0m \033[1m%s\033[0m\n' "$1"; }

section "0. Location"
echo "  SKILL_DIR=$SKILL_DIR"

section "1. Node.js >= 18"
NODE_MAJOR="$(node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/' || echo 0)"
if [ "$NODE_MAJOR" -ge 18 ]; then ok "Node.js $(node -v)"; else
  fail "Node.js $NODE_MAJOR detected — install Node.js >= 18"
  exit 1
fi

section "2. Dependencies"
PKG_LOCK="$SKILL_DIR/package-lock.json"
NM="$SKILL_DIR/node_modules"
need_install=0
if [ ! -d "$NM" ]; then need_install=1; fi
if [ -f "$PKG_LOCK" ] && [ -f "$NM/.package-lock.json" ]; then
  if [ "$PKG_LOCK" -nt "$NM/.package-lock.json" ]; then need_install=1; fi
fi
if [ "$need_install" -eq 1 ]; then
  echo "  running: npm install (in $SKILL_DIR)"
  (cd "$SKILL_DIR" && npm install --no-audit --no-fund --loglevel=error) && ok "npm install complete"
else
  ok "node_modules already up-to-date (skipping)"
fi

section "3. Bundled font"
FONT="$SKILL_DIR/fonts/LXGWWenKai-Regular.woff2"
if [ -f "$FONT" ]; then
  size_kb="$(du -k "$FONT" | cut -f1)"
  ok "fonts/LXGWWenKai-Regular.woff2 (${size_kb} KB)"
else
  fail "fonts/LXGWWenKai-Regular.woff2 missing"
  echo "       download LXGW WenKai (~ 4.6 MB):"
  echo "       curl -L -o $FONT https://github.com/lxgw/LxgwWenkaiTai/archive/refs/heads/main.tar.gz"
  exit 1
fi

section "4. Design tokens"
TOKENS="$SKILL_DIR/references/design-tokens.json"
if [ -f "$TOKENS" ]; then ok "references/design-tokens.json present"; else
  warn "references/design-tokens.json missing (verify-report.mjs will skip token checks)"
fi

section "5. Generator"
GEN="$SKILL_DIR/scripts/generate-report.mjs"
if [ -f "$GEN" ]; then ok "scripts/generate-report.mjs present"; else
  fail "scripts/generate-report.mjs missing — installation incomplete"
  exit 1
fi

section "6. Verifier"
VER="$SKILL_DIR/scripts/verify-report.mjs"
if [ -f "$VER" ]; then ok "scripts/verify-report.mjs present"; else
  warn "scripts/verify-report.mjs missing (optional)"
fi

section "Done"
cat <<EOF
  The skill is ready. From the AI agent's side, the recommended workflow is:

    1. Identify the user's content and structure it into the JSON schema
       described in SKILL.md (Step 2).
    2. Write the JSON to /tmp/report-input.json.
    3. Run the generator:
         node $GEN /tmp/report-input.json /tmp/report.html
    4. Run the verifier:
         node $VER /tmp/report.html --strict
    5. Tell the user how many chapters, conclusions, and diagrams the
       report contains (use the verifier's "Summary" section).

  Note for users who installed via skill-installer: the installer
  copies only SKILL.md by default. If scripts/, fonts/, and references/
  are missing, re-run with the full repo path:

    bash scripts/install.sh
EOF
