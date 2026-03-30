#!/bin/bash
# Synced WP — Uninstaller
# Completely removes Synced WP and all associated data

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠  $1${NC}"; }
step() { echo -e "${BOLD}→  $1${NC}"; }

echo ""
echo -e "${BOLD}Synced WP — Uninstaller${NC}"
echo "────────────────────────────────────────"
echo ""

# 1. Unlink CLI
step "Removing synced CLI..."
if [ -d "$HOME/.synced-wphub" ]; then
  cd "$HOME/.synced-wphub" && npm unlink --silent 2>/dev/null; cd ~
  rm -rf "$HOME/.synced-wphub"
  ok "CLI removed"
else
  warn "CLI not found — skipping"
fi

# 2. Remove config
step "Removing config..."
if [ -d "$HOME/.synced" ]; then
  rm -rf "$HOME/.synced"
  ok "Config removed (~/.synced)"
else
  warn "Config not found — skipping"
fi

# 3. Remove wp-now cache
step "Clearing wp-now cache..."
if [ -d "$HOME/.wp-now" ]; then
  rm -rf "$HOME/.wp-now"
  ok "wp-now cache cleared (~/.wp-now)"
else
  warn "wp-now cache not found — skipping"
fi

# 4. Optionally remove sites
echo ""
read -p "Remove ~/Synced-Sites? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  if [ -d "$HOME/Synced-Sites" ]; then
    rm -rf "$HOME/Synced-Sites"
    ok "Sites removed (~/Synced-Sites)"
  else
    warn "No sites directory found"
  fi
else
  warn "Keeping ~/Synced-Sites"
fi

echo ""
ok "Synced WP uninstalled."
echo ""
echo "To reinstall: curl -fsSL https://synced.agency/install/wp | bash"
echo ""
