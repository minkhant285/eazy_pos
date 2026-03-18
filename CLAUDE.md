# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start app in development mode (hot reload)
npm run build        # Full build (typecheck + electron-vite build)
npm run typecheck    # Type-check main process and renderer separately
npm run lint         # ESLint validation
npm run format       # Prettier formatting
npm run build:mac    # Package for macOS
npm run build:win    # Package for Windows
npm run build:linux  # Package for Linux
```

No test framework is configured.

## Architecture Overview

This is an **Electron + React 19 + tRPC v11 POS/Inventory desktop app**. The key architectural decision is that all frontend–backend communication goes through Electron IPC — there is no HTTP server.

### Process Boundary

```
Renderer (React)                     Main Process (Node.js)
  trpc-client/trpc.ts                  trpc-server/router.ts
  trpc-client/ipc-link.ts    ←IPC→    trpc-server/ipc-handler.ts
  window.electronTRPC                   db/services/*.service.ts
                                        db/db.ts → SQLite (pos.db)
```

The preload script (`src/preload/index.ts`) exposes `window.electronTRPC`, `window.backupApi`, and `window.appApi` via the context bridge. The IPC link (`src/renderer/src/trpc-client/ipc-link.ts`) is a custom tRPC transport — it serialises calls and tracks pending requests by ID.

### State Management

All global UI state lives in a single Zustand store (`src/renderer/src/store/useAppStore.ts`):
- `isDark` / `theme` — dark/light theme tokens
- `lang` / `tr` — active language + translations object
- `currency` — active currency (`{ code, symbol }`)
- `currentUser` — authenticated user (`{ id, name, email, role }`) or `null`
- `navigate(pageId)` — sets the current page

`isDark`, `lang`, and `currency` are persisted via `zustand/middleware/persist`.

### Styling

All component styles use **inline `style={}` props** with theme tokens — no per-component CSS files. Always read tokens from the store:

```ts
const t = useAppStore((s) => s.theme);   // ThemeTokens
const tr = useAppStore((s) => s.tr);     // Translations
const sym = useAppStore((s) => s.currency.symbol); // e.g. '฿'
```

Never hardcode colours. Token names: `t.text`, `t.surface`, `t.inputBg`, `t.border`, `t.success`, `t.error`, `t.accent`, etc. (see `src/renderer/src/constants/themes.ts`).

### Adding a New Feature (typical steps)

1. **Schema** — add table to `src/main/db/schemas/schema.ts`
2. **Migration** — create `drizzle/00XX_<name>.sql` and add entry to `drizzle/meta/_journal.json`
3. **Service** — create `src/main/db/services/<name>.service.ts`
4. **Router** — create `src/main/trpc-server/routers/<name>.router.ts`, then import and merge it in `src/main/trpc-server/router.ts`
5. **Page** — create under `src/renderer/src/pages/<name>/`
6. **Register page** — add `PageId` to `src/renderer/src/types/index.ts`, add the page to the switch in `App.tsx`, add the sidebar nav entry with role access in `src/renderer/src/components/layout/Sidebar.tsx`
7. **Translations** — add `TranslationKey` entry to `src/renderer/src/constants/translations.ts` for all three languages (en/my/zh)

### Database

- **File:** `pos.db` (dev: project root; prod: `app.getPath('userData')`)
- **Mode:** WAL, foreign keys enforced
- **Migrations run automatically** on app startup via `drizzle-orm/better-sqlite3/migrator`
- **`stockLedger`** is append-only — never update or delete rows; used for COGS and audit

### Auth & Role Access

`currentUser` in the Zustand store drives auth. `LoginPage` is shown when it is `null`. Roles:
- `admin` — full access
- `manager` — all pages except locations and users
- `cashier` — sales, customers, settings, profile only

### Icons

Icon type is `IconKey` (not `IconName`) exported from `src/renderer/src/constants/icons.ts`. Icons are SVG `<path d={...}>` strings.

### tRPC Usage in Renderer

```ts
// Query
const { data, isLoading, refetch } = trpc.<router>.<procedure>.useQuery({ ...input })

// Mutation
const action = trpc.<router>.<procedure>.useMutation({ onSuccess: () => refetch() })
action.mutate({ ...input })
```
