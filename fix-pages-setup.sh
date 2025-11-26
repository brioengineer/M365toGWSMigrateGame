#!/usr/bin/env bash
set -euo pipefail

# Safety: ensure we're in a Node/Vite project root
if [[ ! -f package.json || ! -f index.html ]]; then
  echo "Not in project root (missing package.json or index.html)."; exit 1
fi

echo "Installing Tailwind/PostCSS deps (idempotent)..."
npm i -D tailwindcss postcss autoprefixer >/dev/null 2>&1 || true
npx tailwindcss init -p >/dev/null 2>&1 || true

echo "Writing tailwind.config.ts..."
cat > tailwind.config.ts <<'EOF'
import type { Config } from "tailwindcss";
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
EOF

echo "Ensuring src/index.css Tailwind directives..."
mkdir -p src
cat > src/index.css <<'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

echo "Wiring App.tsx to render MigrationGame..."
cat > src/App.tsx <<'EOF'
import React from "react";
import MigrationGame from "./MigrationGame";
export default function App(){ return <MigrationGame/> }
EOF

echo "Setting Vite base for GitHub Pages..."
cat > vite.config.ts <<'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: "/M365toGWSMigrateGame/",
});
EOF

echo "Adding SPA 404 fallback..."
cat > 404.html <<'EOF'
<!doctype html>
<html>
  <head>
    <meta http-equiv="refresh" content="0; url=./" />
    <meta charset="UTF-8" />
    <title>Redirecting…</title>
  </head>
  <body>
    <p>Redirecting…</p>
    <script>
      const redirect = "/" + location.pathname.replace(/^[^?]*\//, "");
      sessionStorage.setItem("gh:redirect", redirect + location.search + location.hash);
      location.replace("./");
    </script>
  </body>
</html>
EOF

echo "Adding GitHub Pages workflow..."
mkdir -p .github/workflows
cat > .github/workflows/deploy.yml <<'EOF'
name: Deploy to GitHub Pages
on:
  push:
    branches: ["main"]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: "pages"
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
EOF

echo "Verifying MigrationGame.tsx presence..."
if [[ ! -f src/MigrationGame.tsx ]]; then
  echo "ERROR: src/MigrationGame.tsx not found. Paste the game file there and re-run build."
  exit 1
fi

echo "Installing and building..."
npm install
npm run build

echo "Creating branch, committing, and pushing..."
git checkout -B setup/pages-deploy
git add -A
git commit -m "feat: Tailwind wiring, Vite base, SPA 404, Pages workflow, wire MigrationGame" || true
git push -u origin setup/pages-deploy

echo "Done. Open a PR from setup/pages-deploy → main."

