# ── Build-Stufe ──────────────────────────────────────────────────────────────
FROM node:20-slim AS build
WORKDIR /app

# pnpm über das im Projekt gepinnte packageManager-Feld aktivieren
RUN corepack enable

# Zuerst nur die Manifeste kopieren – nutzt den Docker-Layer-Cache optimal
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Restlichen Quellcode kopieren und bauen
COPY . .
RUN pnpm build

# ── Laufzeit-Stufe ───────────────────────────────────────────────────────────
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Der Server-Bundle (esbuild --packages=external) lädt seine Abhängigkeiten zur
# Laufzeit aus node_modules. Wir übernehmen exakt die Module, mit denen erfolgreich
# gebaut wurde – das vermeidet jedes Risiko falsch klassifizierter Abhängigkeiten.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
# Server-Bundle + gebautes Frontend (dist/index.js, dist/public)
COPY --from=build /app/dist ./dist
# Baseline-Schema für die Ersteinrichtung der Datenbank mitliefern
COPY --from=build /app/drizzle ./drizzle

EXPOSE 3000
CMD ["node", "dist/index.js"]
