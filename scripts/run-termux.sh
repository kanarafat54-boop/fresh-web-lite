#!/usr/bin/env bash
set -euo pipefail

# Helper to bootstrap Termux dev environment (run from repo root)
# Usage: bash scripts/run-termux.sh

echo "Installing npm deps..."
npm install

echo "Generating Prisma client for sqlite schema..."
npx prisma generate --schema=prisma/schema.sqlite.prisma

echo "Pushing schema to SQLite (creates dev.db)..."
npx prisma db push --schema=prisma/schema.sqlite.prisma

echo "Starting Redis (background)..."
redis-server --protected-mode no &

echo "Starting WebSocket server (background)..."
node server/ws-server.js &

echo "Starting media worker (background)..."
node workers/processMedia.js &

echo "Starting Next.js dev server"
npm run dev
