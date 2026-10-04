# Soft Mint Design Migration Plan

This document outlines the step-by-step implementation plan for migrating the Budget Tracker from Neo-Brutalist to the "Soft Mint" design system. Follow these steps in order to ensure a smooth transition without breaking functionality.

## Phase 1: Core Setup & Tokens
- [x] **Update `index.css`**
  - Replace existing brutalist variables with the new `@theme` tokens (colors, radii, font).
  - Add the custom `:root` patterns (`--hatch`, `--hatch-on-ink`).
  - Add base `body` styles and pattern utility classes (`.hatched`, `.hatched-ink`).
  - Import the "Poppins" font (weights 400, 500) from Google Fonts.
  - *Note: Do not delete old brutalist utility classes just yet to avoid breaking current screens during transition.*
- [x] **Configure Typography**
  - Ensure weights are restricted to 400 and 500.

## Phase 2: Shared Primitives (The Foundation)
Create or update the following components in your components directory:
- [x] **`Card` Component**: Create a versatile `<Card variant="...">` component (`ink`, `mint`, `lavender`, `light`, `white`). Ensure `rounded-[28px]` for top-level and `rounded-[20px]` for nested.
- [x] **`Button` Component**: Implement variants (`primary`, `secondary`, `accent`) with the pill shape (`rounded-full`) and proper hover/active states (e.g., `active:scale-[0.98]`).
- [x] **`IconButton` Component**: 40x40 circle, `border border-ink/40` or `bg-surface`.
- [x] **`Chip` Component**: Implement status badges (`rounded-full px-3 py-1 text-xs`) for positive, neutral, negative, and info.
- [x] **`SegmentedTabs` Component**: Track (`bg-surface rounded-full`), items (`flex-1`), active (`bg-ink text-white`).
- [x] **`ProgressBar` Component**: 20-24px height, `rounded-full`. Implement solid and hatched segments.
- [x] **`StatTile` Component**: Nested card (`rounded-[20px] p-4`) with 12px muted label and 22-26px medium number.
- [x] **`ListRow` Component**: Standardized row with 40px circular icon, title, caption, and right-aligned amount.
- [x] **`Input` Component**: `bg-surface rounded-full h-12 px-4` with `ring-2 ring-ink/40` on focus.
- [x] **`BottomNav` Component**: Update to floating pill style (`bottom-4`, `bg-ink rounded-[32px]`), 44px active circle.
- [x] **`SyncBanner` Component**: Top strip (`bg-lavender rounded-full`) with "Sync now" button.

## Phase 3: Screen-by-Screen Migration
Migrate screens in the specified order, replacing brutalist ad-hoc containers with the new primitives.
- [x] **1. Home (Daily Budget)**
  - Integrate `SyncBanner`.
  - Update Month switcher (use 40px circle icon buttons).
  - Add `SegmentedTabs` (Daily / Monthly / Calendar).
  - Implement Budget Hero card (`ink` variant).
  - Implement "Spent this month" card (`light` variant).
  - Add Category split bar.
  - Render Transactions using `ListRow` in a `white` card grouped by day.
- [x] **2. Finance Hub**
  - Remove borders from title block.
  - Implement 2x2 grid with `mint`, `lavender`, and `white` cards.
  - Update Monthly spending card with stacked bars.
  - Update Category donut chart card (`white` variant via ChartCard).
- [x] **3. Analytics**
  - Add Account scope tabs (segmented control).
  - Add Month switcher and Overview / Trends / Budget `SegmentedTabs`.
  - Update Spent (`mint`), Income (`white`), and Saved (`lavender`) cards.
  - Implement "What stands out" insight rows in a `white` card.
- [x] **4. Split Expenses**
  - Add Group and Split pill buttons to title.
  - Update the 3 summary tiles (`mint`, `danger-soft`, `surface`).
  - Update "Your groups" list using `ListRow` patterns.
- [x] **5. Friends Hub**
  - Update Add friend card (`white` variant) with pill input and button.
  - Add Friends / Pending `SegmentedTabs`.
  - Update Friend rows (lavender avatar, name, active chip).
- [x] **6. Profile and Account**
  - Update Profile card (`ink` variant with mint initials circle).
  - Update Contact info card (`white` variant).
  - Implement Management shortcuts (2x2 tiles with mint/lavender variants).
  - Update Excel backup card.

## Phase 4: Charts & Complex UI
- [x] **ChartCard wrapper**: Updated to use Soft Mint `white` Card, sentence-case headers, muted subtitle.
- [ ] **Bar Charts**: Update to `rounded-[14px]` tops, remove black outlines. Use mint/lavender/hatched colors.
- [ ] **Line Charts**: Update to 2px ink stroke, mint dot for latest point, soft area fill `rgba(168,245,162,.35)`.
- [ ] **Chart Typography/Lines**: Ensure gridlines on ink cards are `rgba(255,255,255,.12)` and axis text is `text-on-ink-muted`.

## Phase 5: Cleanup & Polish
- [x] **App.tsx**: Removed theme-store dependency; background now always `bg-canvas`.
- [x] **ui/index.ts**: All new primitives exported from barrel file.
- [x] **Brutalist Purge**: Completed codebase search and removed remaining instances of brutalist styling in sub-components (`GroupCard`, `GroupDetailView`, `AddGroupModal`, `AddSplitModal`, `SettleUpModal`, `SplitExpenseFields`, `ExcelTools`, `AddTransactionForm`, `AmountCalculatorInput`, `CategoryAccountSelector`, `BudgetForm`, `Auth`, `ToastContainer`, `ChartTooltip`, `Select`, `Modal`).
- [ ] **Iconography Review**: Ensure all icons are outline style (Lucide), `strokeWidth={1.5}`, 20-22px.
- [ ] **Motion & Accessibility**: Verify 150-200ms ease-out transitions. Check touch targets (min 44px) and color contrast.
- [ ] **Responsive Testing**: Test the offline banner, FABs, and bottom nav on a 360px viewport to ensure no overlap.
