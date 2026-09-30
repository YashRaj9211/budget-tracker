# Deploy Guide (Render + Netlify + Phone App)

Order: **1. Database → 2. Backend (Render) → 3. Frontend (Netlify) → 4. Install on phone**

Push your code to GitHub first.

---

## 1. Database (Render Postgres)

1. Render dashboard → **New → PostgreSQL** → name it `budget-db` → Free plan → Create.
2. Copy the **External Database URL** (you'll use it in Step 2 and Step 5).

---

## 2. Backend on Render

**New → Web Service** → pick your GitHub repo, then fill in:

| Field | Value |
|---|---|
| Root Directory | `go-server` |
| Runtime | Go |
| Build Command | `go build -o app .` |
| Start Command | `./app` |

**Environment variables:**

| Name | Value |
|---|---|
| `ENV` | `local` ← **required**, otherwise the server starts in AWS-Lambda mode and won't listen |
| `DATABASE_URL` | the URL from Step 1 (use the **Internal** URL when on Render) |
| `JWT_SECRET` | any long random text (e.g. 40+ characters) |
| `AUTO_MIGRATE` | `true` (creates tables on start) |

Click **Create**. When it's live, open `https://YOUR-SERVICE.onrender.com/ping` → you should see `{"message":"pong"}`.

> Free plan sleeps after 15 min idle; the first request can take ~50 s.

---

## 3. Frontend on Netlify

**Add new site → Import from GitHub** → pick the repo. `netlify.toml` already has the build settings (`npm run build`, publish `dist`).

**Site settings → Environment variables** (add BEFORE the first build):

| Name | Value |
|---|---|
| `VITE_API_URL` | `https://YOUR-SERVICE.onrender.com` (no trailing `/`) |
| `VITE_GEMINI_API_KEY` | your Gemini key (optional, for AI features) |

**Deploy.** You get `https://YOUR-SITE.netlify.app`.
If you change a variable later, click **Deploys → Trigger deploy → Clear cache and deploy**.

---

## 4. Install on your phone (PWA)

Open your Netlify link in the phone browser (must be `https`):

- **Android (Chrome):** ⋮ menu → **Install app** (or *Add to Home screen*).
- **iPhone (Safari only):** Share button → **Add to Home Screen**.

It now opens full-screen like a normal app, and local data works offline.

---

## 5. (Optional) Load demo data

On your PC, with the Render **External** database URL:

```powershell
cd go-server
$env:DATABASE_URL="<External Database URL>"
go run ./cmd/migrate
go run ./cmd/seed
```

Login: `alice@demo.com` / `password`

---

## Quick fixes

| Problem | Why | Fix |
|---|---|---|
| Render logs show Lambda error / port not open | `ENV` missing | Add `ENV=local` |
| Login fails / "Network Error" in app | Wrong API URL | Fix `VITE_API_URL`, redeploy Netlify |
| 404 when refreshing a page | Missing redirect | Make sure `netlify.toml` is committed |
| No "Install app" option | Not https, or old cache | Use the Netlify link, reload once |
| First request very slow | Free Render plan was asleep | Wait ~50 s, or upgrade the plan |
