# Termux development guide

This guide describes how to run the project on Android Termux with SQLite and a local Redis server.

1) Install Termux packages (only once):
   pkg update -y && pkg upgrade -y
   pkg install git nodejs npm python clang make openssl-tool jq nano -y
   pkg install redis -y

2) Clone and prepare the repo:
   git clone https://github.com/kanarafat54-boop/fresh-web-lite.git
   cd fresh-web-lite

3) Create .env file from example and set NEXTAUTH_SECRET:
   cp .env.local.example .env
   # Generate secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   # Edit .env and paste the secret in NEXTAUTH_SECRET

4) Run the Termux helper (this will install deps, generate prisma client, start redis, ws server, worker, and start Next dev):
   bash scripts/run-termux.sh

5) Open http://localhost:3000 in your Android browser. Prisma Studio (if needed): npx prisma studio --schema=prisma/schema.sqlite.prisma

Troubleshooting:
- If prisma binary fails on Termux, run npx prisma generate on a laptop and commit generated client to repository (not recommended) or use a remote Postgres DB.
- If a port is in use, change PORT or WS_PORT env vars in .env before running.

