# Project Style Guide

## Overview
This document defines the coding style and conventions for the **Budget Tracker** project. It is intended to help developers write consistent, readable, and maintainable code across the entire code‑base.

---

## 1. General Project Structure
```
budget-tracker/
├─ public/                # Static assets (icons, images, manifest, etc.)
├─ src/
│   ├─ api/               # API layer (future network calls)
│   ├─ assets/            # Non‑code assets used by the app
│   ├─ commons/           # Shared utilities, types, constants
│   ├─ components/        # Re‑usable UI components
│   │   ├─ budget/        # Budget‑related UI (e.g., DailyBudgetCard)
│   │   ├─ common/        # Generic UI primitives (Button, BottomNav, …)
│   │   ├─ home/          # Home page specific components
│   │   └─ transaction/   # Transaction UI components
│   ├─ db/                # IndexedDB wrapper (initDb, etc.)
│   ├─ pages/             # Top‑level route pages (Home, Budget, Stats)
│   ├─ stores/            # Zustand stores (state management)
│   ├─ styles/            # Global CSS (e.g., gradient.css)
│   ├─ types/             # TypeScript type definitions
│   ├─ utils/             # Helper functions (date, Gemini, midnight)
│   ├─ App.tsx            # Root component
│   ├─ main.tsx           # React entry point
│   └─ router.ts          # React‑Router configuration
├─ .eslintrc.js          # ESLint configuration (React, TypeScript, Hooks)
├─ vite.config.ts        # Vite + Tailwind + PWA configuration
├─ tsconfig*.json        # TypeScript compiler options
├─ package.json          # Dependencies & scripts
└─ Style.md              # **This** style guide
```

---

## 2. Language & Tooling
- **TypeScript** – all source files use `.ts`/`.tsx`.  `strict` mode is enabled via `tsconfig.app.json`.
- **React 19** – functional components with hooks only.  Class components are prohibited.
- **Tailwind CSS** – utility‑first styling.  Avoid custom CSS unless the style cannot be expressed with Tailwind utilities.
- **ESLint** – run `npm run lint` before committing.  The configuration enforces:
  - React Hooks rules (`eslint-plugin-react-hooks`)
  - Vite‑specific linting (`eslint-plugin-react-refresh`)
  - TypeScript best‑practices (`typescript-eslint`)
- **Prettier** – not explicitly listed, but the project follows the default Prettier formatting (2‑space indent, single quotes, trailing commas where valid).

---

## 3. Naming Conventions
| Entity | Convention |
|--------|------------|
| **Files / folders** | `kebab-case` for static assets, `PascalCase` for component directories, `camelCase` for utility files. |
| **Components** | `PascalCase` (e.g., `DailyBudgetCard`, `BottomNav`). |
| **Hooks** | Prefix with `use` (e.g., `useMidnightRefresh`). |
| **Zustand stores** | `<domain>Store.ts` (e.g., `budgetStore.ts`). |
| **Types / interfaces** | `PascalCase` (e.g., `Transaction`, `Budget`). Export from `src/types/index.ts`. |
| **Constants** | `UPPER_SNAKE_CASE` (e.g., `MAX_BUDGET`). |
| **Props interfaces** | `<ComponentName>Props` (e.g., `ButtonProps`). |
| **Functions** | `camelCase`. |
| **Variables** | `camelCase`. |
| **CSS classes** | Tailwind utilities; custom class names in `src/styles/` use `kebab-case`. |

---

## 4. Component Guidelines
1. **Stateless UI primitives** (e.g., `Button`, `BottomNav`) live in `src/components/common/`.
2. **Domain‑specific UI** (budget, transaction, home) live in their own sub‑folders under `components/`.
3. **Props**
   - Keep the props surface minimal.  Prefer `children` over custom slots.
   - Use explicit `type` discriminants when a component has variants (see `Button`).
4. **Styling**
   - Use Tailwind classes directly in the JSX.
   - When a component requires a reusable style, extract it to a CSS module in `src/styles/` and reference via `className`.
5. **Event handling**
   - Pass callbacks via props (`onClick`, `onChange`).
   - Do not perform side‑effects inside the component; delegate to stores or utility functions.
6. **Accessibility**
   - Add appropriate ARIA attributes when needed (e.g., `aria-label` for icon‑only buttons).
   - Ensure interactive elements are focusable (`tabIndex` if custom). 

---

## 5. State Management (Zustand)
- Store files live in `src/stores/` and export a hook named `use<Domain>Store`.
- Keep the store **thin** – only state and simple actions.  Complex business logic belongs in utility modules under `src/utils/`.
- Use Immer‑style immutable updates (`set(state => { … })`).
- Persisted data (IndexedDB) is accessed via the `db/` layer; stores should call the DB functions, not import IndexedDB directly.

---

## 6. Utility Functions
- Place generic helpers in `src/utils/` (e.g., date formatting, Gemini API wrapper, midnight refresh).
- Export from `src/utils/index.ts` if they are used across many modules.
- Keep side‑effects (network, IndexedDB) isolated; expose async functions that return plain data.

---

## 7. Routing
- All routes are defined in `src/router.ts` using **React Router v8**.
- Each route component lives in `src/pages/` and follows the naming `<PageName>.tsx`.
- The root layout (`App.tsx`) contains the `<Outlet />` and optional global UI (e.g., `BottomNav`).

---

## 8. Testing (Future)
- When tests are added, place them alongside the file they test with the suffix `.test.tsx`.
- Use **Vitest** (default with Vite) and **React Testing Library**.
- Follow the same naming conventions as the source file.

---

## 9. Commit & PR Guidelines
- Run `npm run lint` and ensure no errors.
- Format with Prettier (`npx prettier --write .`).
- Include a concise description of the change in the PR title.
- If adding new components, update the **Style.md** if new conventions are introduced.

---

## 10. Miscellaneous
- **PWA** – configuration lives in `vite.config.ts` under `VitePWA`.  Do not modify the manifest unless a new icon or name is required.
- **Tailwind** – configuration is in `tailwind.config.js` (generated by `@tailwindcss/vite`).  Extend the theme only when necessary.
- **ESLint** – global ignores `dist/`.  All source files are linted (`**/*.{ts,tsx}`).

---

## 11. UI Design System

The Budget Tracker UI is built with **Tailwind CSS** and a small set of custom pastel utility classes defined in `src/index.css`.  All components should follow the patterns below to keep the visual language consistent.

### 11.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-pastel-pink` / `border-pastel-pink` / `text-pastel-pink` | `#fecaca` | Accent backgrounds, borders, or text for positive actions.
| `bg-pastel-blue` / `border-pastel-blue` / `text-pastel-blue` | `#bde2ff` | Neutral accent, used for progress bars and secondary elements.
| `bg-pastel-purple` / `border-pastel-purple` / `text-pastel-purple` | `#e4b5fe` | Highlighting important information.
| `bg-pastel-yellow` / `border-pastel-yellow` / `text-pastel-yellow` | `#fefed4` | Warning or informational highlights.
| `bg-pastel-green` / `border-pastel-green` / `text-pastel-green` | `#aff588` | Success states.
| `bg-pastel-red` / `border-pastel-red` / `text-pastel-red` | `#ff6b6b` | Error states.
| Tailwind `emerald-100`, `rose-100`, `purple-100`, `amber-100`, `gray-50`, `white` | – | Default background shades for cards and panels.
| `text-dark-red` | `#8c6239` | Darker text for headings or labels.
| `text-light-gray` | `#9f8569` | Light‑gray text for secondary information.

**Guideline**: Prefer the pastel utilities for custom UI elements (e.g., progress bars). For standard UI, use Tailwind’s built‑in palette (e.g., `bg-emerald-100`).

### 11.2 Shadows & Borders

The project uses a distinctive “hand‑drawn” shadow style to give a tactile feel:

```css
shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
```

Apply this shadow to cards, panels, and containers.  Borders are always `border border-black` (2 px for most components, 1 px for subtle dividers).  When a pastel background is used, also add `border-black` to maintain contrast.

### 11.3 Component Patterns

#### 11.3.1 Buttons (`src/components/common/Button.tsx`)
- Use the `Button` component for all interactive triggers.
- Props: `type` (`primary` | `secondary`). `primary` → `bg-black text-white`; `secondary` → `bg-white text-black`.
- Add Tailwind utility classes via `className` for size or additional colors (e.g., `bg-pastel-green`).

#### 11.3.2 Cards
- Structure: `<div className="border border-black p-4 bg-<color> shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">`.
- Use background colors from the palette (`bg-emerald-100`, `bg-rose-100`, `bg-purple-100`, `bg-amber-100`, or pastel utilities).
- Title text: `text-xs font-bold uppercase tracking-wider` with a contrasting text color (`text-emerald-800`, `text-rose-800`, etc.).

#### 11.3.3 Lists (e.g., TransactionList)
- Wrap each item in a container with `border border-black p-3 bg-gray-50`.
- Use flex layout to align content, and ensure a consistent gap (`gap-2`).

#### 11.3.4 Forms (e.g., AddTransactionForm)
- Input elements should use Tailwind’s form utilities (`border border-black p-2`).
- Buttons inside forms follow the same `Button` component.
- Provide clear focus states (e.g., `focus:outline-none focus:ring-2 focus:ring-pastel-blue`).

#### 11.3.5 Progress Bars / Bars
- Use a wrapper with `w-full border-2 border-black h-4 bg-gray-50`.
- Inner bar uses a pastel background (`bg-pastel-blue`) and `border-r-2 border-black`.
- Animate width changes with `transition-all duration-500`.

### 11.4 Layout Guidelines

- The root layout (`App.tsx`) provides a padded container (`pb-24`) and an optional `BottomNav`.
- Pages are wrapped in a `relative pb-24` container to leave space for navigation.
- Use `grid` for responsive multi‑column layouts (`grid-cols-1 md:grid-cols-3`).

---

*Keep this UI design system section up‑to‑date as new components or color tokens are added.*
