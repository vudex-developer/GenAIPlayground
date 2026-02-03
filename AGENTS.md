# Repository Guidelines

## Project Structure & Module Organization
This is a Vite + React + TypeScript app with a small Node/Express proxy server.
- `src/`: frontend source (entry points `src/main.tsx`, `src/App.tsx`).
- `src/components/`: UI components; `src/components/nodes/` holds node UI.
- `src/stores/`, `src/services/`, `src/hooks/`, `src/utils/`, `src/types/`: state, API clients, shared logic, and types.
- `src/assets/`: app images and static assets.
- `server/`: proxy server for Kling API CORS handling (`server/index.js`).
- `public/` + `index.html`: static assets and HTML shell.
- `dist/`: production build output.

## Build, Test, and Development Commands
Run commands from the repo root unless noted.
- `npm install` and `cd server && npm install`: install frontend and server deps.
- `npm run dev`: start the frontend dev server (Vite).
- `npm run dev:server`: start the proxy server only.
- `npm run dev:all`: run frontend + proxy together via `concurrently`.
- `npm run build`: typecheck and build to `dist/`.
- `npm run preview`: serve the production build locally.
- `npm run lint`: run ESLint across the repo.

## Coding Style & Naming Conventions
- Indentation: 2 spaces (TypeScript/React defaults).
- Use TypeScript with ES modules (`"type": "module"`).
- Components: `PascalCase` filenames and component names (e.g., `NodeToolbar.tsx`).
- Hooks/utilities: `camelCase` (e.g., `useAutoSave`, `formatPrompt`).
- Keep styles in `src/index.css` and Tailwind utility usage consistent with existing patterns.
- Linting: ESLint is configured in `eslint.config.js`; run `npm run lint` before PRs.

## Testing Guidelines
There is no dedicated test runner configured in `package.json` yet.
- If you add tests, introduce a standard runner (Vitest or Jest) and document it here.
- Prefer colocating tests with code (e.g., `src/components/Foo.test.tsx`).

## Architecture Overview
The app is a single-page React workflow builder with optional AI-backed media generation.
- Frontend UI builds a node graph in `src/components/nodes/` and stores state via `src/stores/`.
- API calls go through `src/services/` to provider endpoints or the local proxy.
- The proxy server in `server/index.js` handles Kling API requests to avoid CORS issues.
- Media and workflow data are persisted locally (IndexedDB/localStorage) with optional S3 sync.

## Commit & Pull Request Guidelines
Recent commits use short, descriptive messages, often with Conventional Commit prefixes like `feat:` or `Fix:`. Follow that pattern:
- Example: `feat: add S3 upload fallback`.
- Keep messages in the imperative mood and scoped to one change.

PRs should include:
- A concise description of behavior changes.
- Screenshots or a short screen capture for UI changes.
- Notes on any new environment variables or config updates.

## Configuration & Secrets
- Environment variables live in `.env` (see `.env.example`).
- Never commit real API keys; use placeholders in examples.
