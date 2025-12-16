## Monster Tower Defense

Minimal steps to install and run the exported Spark Vite project locally.

### Prerequisites
- Node.js 18+ (tested with Node 24)
- npm 9+
- VS Code with the official “JavaScript and TypeScript Nightly” and “ESLint” extensions recommended

### Install
```bash
npm install
```

### Run the dev server
```bash
npm run dev -- --host --port 5173
```
Open the URL printed in the terminal (defaults to http://localhost:5000/monster-tower-defens/ because `base` is set in vite.config.ts).

### Build for production
```bash
npm run build
```
The built assets emit to `dist/`.

### Preview the production build
```bash
npm run preview
```

### Common Windows gotchas
- If Vite errors about missing Rollup or SWC native binaries, install the platform packages: `npm install -D @rollup/rollup-win32-x64-msvc @swc/core-win32-x64-msvc`.
- If port 5000 is taken, pass `--port 5173` (or any free port) to `npm run dev`.

### Notes
- The project uses Vite 6, React 19, and Tailwind 4 via `@tailwindcss/vite`.
- `base` is configured to `/monster-tower-defens/` for GitHub Pages; adjust in `vite.config.ts` if deploying elsewhere.
