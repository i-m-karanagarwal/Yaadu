#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

echo "Installing Yaadu dependencies..."
npm ci

echo "Install complete."
