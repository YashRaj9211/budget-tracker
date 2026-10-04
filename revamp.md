# Modern Bento-Box Design Revamp

This document tracks the steps to implement the new soft, modern, rounded "bento-box" design (featuring pastel green, soft purple, and dark grey elements) while preserving the existing Neobrutalist theme as a fallback.

## Step 1: Implement Theme State & Toggle ✅ (Completed)

**Description**: Create a global state (using Zustand) to toggle between `theme-brutal` and `theme-modern`. Add a theme toggle button in the app's Profile screen so you can switch back to the old design instantly.
**Progress**:

- [x] Create `useThemeStore.ts`
- [x] Apply theme class to the `<body>` or `<html>` in `App.tsx`
- [x] Add toggle to `Profile.tsx`

## Step 2: Define CSS Variables for Both Themes ✅ (Completed)

**Description**: In `src/index.css`, define the core CSS variables for the new theme colors.

- **Brutalist**: Sharp borders, heavy solid shadows, stark white/yellow backgrounds.
- **Modern**: Soft light grayish-green background (`#e1e6e2`), dark cards (`#1f1f1f`), pastel green (`#9df09f`), soft purple (`#b29cff`), large border radii (`24px` to `32px`), and soft diffuse shadows.

## Step 3: Upgrade Base UI Components (`src/components/ui/`) ✅ (Completed)

**Description**: Modify the centralized UI components (`Card`, `Button`, `Input`, `Badge`, `Modal`) to dynamically apply styles based on the active theme.

- Example: `<Card>` will use `rounded-none border-2 border-black shadow-brutal` in brutalist mode, and `rounded-[32px] border-none shadow-sm bg-white` in modern mode.

## Step 4: Update Typography & Interactive Elements ✅ (Completed)

**Description**: Adjust fonts (the design uses a clean geometric sans-serif) and button shapes (pill-shaped `rounded-full` for modern mode). Update hover and active states to be smooth rather than sharp.

## Step 5: Adjust Layouts to Bento-Box Style 🔄 (Pending)

**Description**: Tweak the grid layouts, gaps, and specific component structures on main pages (Home, Stats, Hub) to match the spaced-out, floating bento-box aesthetic shown in the reference image.
