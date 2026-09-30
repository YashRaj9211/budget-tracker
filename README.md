# 💰 Complete Finance Hub & Budget Tracker

An end-to-end, neo-brutalist personal finance and shared expense tracking application. Evolved from a simple budget tracker into a complete **Finance Hub**: managing daily budgets, mathematical expense logs, debt splits with algorithm-driven debt simplification, friendship connections, and live synchronization over WebSockets.

---

## 🏗️ Architecture Overview

The system consists of two primary layers:

```
budget-tracker/
├── src/                  # React 19 + TypeScript + Vite + TailwindCSS Frontend
│   ├── api/              # Axios HTTP client, typed endpoint services & WebSocket client
│   ├── components/       # Neo-brutalist UI components (split, transaction, budget)
│   ├── pages/            # Home, HubDashboard, Split, Friends, Stats, Auth, Budget
│   ├── stores/           # Zustand state management (auth, split, transaction, budget)
│   └── hooks/            # Custom hooks (useWebSocket, useDayGroups)
├── go-server/            # High-performance Go (Gin + GORM + PostgreSQL + Gorilla WebSocket)
│   ├── handlers/         # Auth, Dashboard, Expenses, Groups, Friendships, WebSocket
│   ├── router/           # Public & JWT-authenticated private route groups
│   ├── models/           # Database schema & GORM models with UUID BeforeCreate hooks
│   └── functions/        # Debt graph simplification algorithms
└── bruno/                # Bruno API Collection for testing and documentation
    ├── Auth/             # Sign up & login (auto-token capture scripts)
    ├── Dashboard/        # Summary, breakdown, net friend balances, graph timeline
    ├── Expenses/         # Create, update, settle splits, delete
    ├── Friendships/      # Send requests, accept/reject, list confirmed friends
    └── Groups/           # Group management, member rosters, leave group guard
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites

- **Node.js**: v18+ (v20+ recommended)
- **Go**: v1.20+
- **PostgreSQL**: Local instance or cloud database (e.g., [Neon](https://neon.tech/))

---

### 2. Backend Setup (`go-server`)

1. Navigate to the `go-server` folder:
   ```bash
   cd go-server
   ```

2. Create/verify `.env` inside `go-server/`:
   ```env
   DATABASE_URL=postgresql://user:password@ep-host.aws.neon.tech/neondb?sslmode=require
   ENV=local
   PORT=3001
   GIN_MODE=release
   JWT_SECRET=your_super_secret_jwt_key_here
   ```

3. Download Go modules:
   ```bash
   go mod download
   ```

4. Start the local server:
   - **PowerShell (Windows)**:
     ```powershell
     .\run_local.ps1
     ```
   - **Or directly with Go**:
     ```bash
     go run main.go
     ```
   The backend will start listening on `http://localhost:3001`.

---

### 3. Frontend Setup

1. In the repository root directory:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   *(A reference template is available in `.env.example`)*
   ```env
   VITE_API_URL=http://localhost:3001
   VITE_WS_URL=ws://localhost:3001
   VITE_APP_URL=http://localhost:5173
   VITE_GEMINI_API_KEY="your_optional_gemini_key"
   VITE_APP_ENV=development
   ```

3. Launch the Vite development server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## 🧪 Testing with Bruno API Client

A complete Bruno collection is available under the [`bruno/`](file:///d:/Codes/budget-tracker/bruno) folder:

1. Open **Bruno** and choose **Open Collection** -> select the `bruno/` directory.
2. Select the `local` environment (`environments/local.bru`).
3. Run **Auth > Sign Up** or **Auth > Login**:
   - The login request runs a post-response script that automatically updates `{{authToken}}` and `{{userId}}` in your environment.
4. Execute authenticated requests across **Dashboard**, **Expenses**, **Friendships**, and **Groups**.

---

## 🌟 Key Features

- **Finance Hub Dashboard (`/hub`)**:
  - Live aggregated totals: Personal spend, total borrowed, total lent.
  - Net balance cards for friends who owe you and friends you owe.
  - 7-day and 30-day chronological daily spend graphs.
- **Splitwise Group Management (`/split`)**:
  - Group creation with debt simplification algorithm toggles.
  - Multi-member split allocations with custom checkboxes and per-person cost calculations.
  - Settlement recorder (`SettleUpModal`) with customized dropdowns.
  - Unsettled debt safety checks: prevents members from leaving groups with non-zero balances.
- **Friends Hub (`/friends`)**:
  - Send friend requests by email.
  - Accept and reject pending invitations.
  - Quick list of confirmed friends.
- **Real-Time Live Sync**:
  - Bi-directional WebSocket connection (`useWebSocket`) that triggers UI refreshes when expenses or friend requests change.
- **Smart Calculator & Voice Input**:
  - Add transaction inputs support inline math expressions (e.g., `80 + 20 / 2`).
  - Google Gemini-powered voice receipt parsing.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts Vite dev server with Hot Module Replacement (HMR) |
| `npm run build` | Type-checks with `tsc -b` and compiles production bundle |
| `npm run preview` | Locally preview the production build |
| `npm run lint` | Runs ESLint analysis across TypeScript files |
