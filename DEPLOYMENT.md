# Deploying EduSync (Render + Neon, permanently free)

Two services on Render (backend + frontend, from `render.yaml`) and a
separate Neon Postgres database. Neither Render nor Neon require a
credit card. Render's own free Postgres isn't used here — it
auto-deletes after 30 days; Neon's free tier doesn't expire.

## 1. Create the Neon database

1. Sign up at [neon.com](https://neon.tech) (GitHub/Google/email, no card).
2. Create a project — any name/region. Note the **connection string**
   Neon shows you immediately; it includes a default role (something
   like `neondb_owner`) that owns the database. That role is roughly
   equivalent to the `postgres` superuser role our local setup and
   Docker Compose use only once for setup — **the app must never
   connect as it**, for the same reason documented in
   `backend/tenants/migrations/0002_row_level_security.py`: Row-Level
   Security is a no-op for a table's owner unless `FORCE ROW LEVEL
   SECURITY` is set, and this project's RLS migration relies on the
   app's own role owning its tables from the start.
3. Open Neon's **SQL Editor** for that project and run (replace the
   password with your own, keep it — you'll need it in step 3):

   ```sql
   CREATE ROLE edusync_app WITH LOGIN PASSWORD 'choose-a-strong-password' NOSUPERUSER NOBYPASSRLS;
   GRANT ALL PRIVILEGES ON DATABASE neondb TO edusync_app;
   GRANT ALL PRIVILEGES ON SCHEMA public TO edusync_app;
   GRANT CREATE ON SCHEMA public TO edusync_app;
   ```

   (Swap `neondb` for your actual database name if you changed it.)
   This mirrors `docker/postgres-init.sh` exactly — same restricted
   role, same grants, just run by hand once instead of automatically
   on container boot.
4. From Neon's connection details, note separately: host, database
   name, and `edusync_app` / the password you set above. You'll enter
   these as `POSTGRES_HOST` / `POSTGRES_DB` / `POSTGRES_USER` /
   `POSTGRES_PASSWORD` in Render, not Neon's own owner-role
   credentials.

## 2. Deploy to Render via the Blueprint

1. Sign up at [render.com](https://render.com) (no card required for
   free-tier services) and connect your GitHub account.
2. **New +** → **Blueprint** → select the `EduSync` repo. Render reads
   `render.yaml` from the repo root and shows both services
   (`edusync-backend`, `edusync-frontend`) it's about to create.
3. Render will prompt for every `sync: false` env var before creating
   anything:
   - `SECRET_KEY` — generate any long random string (e.g. `python -c
     "import secrets; print(secrets.token_urlsafe(50))"`)
   - `POSTGRES_DB`, `POSTGRES_USER` (`edusync_app`), `POSTGRES_PASSWORD`,
     `POSTGRES_HOST` — from Neon, step 1
   - `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` — from your Stripe
     sandbox (Developers → API keys)
   - `STRIPE_WEBHOOK_SECRET` — leave blank for now, **step 4 below
     generates the real one** (a local `stripe listen` secret won't
     work here — Stripe needs to send events to this live URL, not
     forward them from the CLI)
4. Click **Apply** / **Deploy Blueprint**. Render builds both Docker
   images (same Dockerfiles used locally and in CI) and starts them.
   First deploy takes a few minutes.

### If your service names got a different subdomain

`render.yaml` assumes `edusync-backend.onrender.com` /
`edusync-frontend.onrender.com` are available. If Render had to append
a suffix (another user already has that name), update `ALLOWED_HOSTS`
and `FRONTEND_URL` on the backend service and `BACKEND_ORIGIN` on the
frontend service in Render's dashboard (Environment tab) to match
whatever subdomains you actually got, then trigger a manual redeploy
of both services.

## 3. Verify it's actually up

- `https://edusync-backend.onrender.com/api/health/` → `{"status": "ok"}`
  (this runs a real `SELECT 1` against Neon, so it also confirms the
  database connection and role/grants from step 1 are correct)
- `https://edusync-frontend.onrender.com` → the EduSync login page

Render's free web services sleep after 15 minutes with no traffic and
take up to ~1 minute to wake back up on the next request — expected
behavior on the free tier, not a bug. The first request after a quiet
period will just be slow once.

## 4. Register the real Stripe webhook (do this after step 3, once the backend URL is live)

The local `stripe listen`-generated `STRIPE_WEBHOOK_SECRET` only works
while that CLI command is running on your machine — it's not valid for
a deployed server. Register a real, permanent webhook endpoint
instead:

1. In your Stripe sandbox dashboard: **Developers → Webhooks → Add
   endpoint**.
2. Endpoint URL: `https://edusync-backend.onrender.com/api/payments/stripe/webhook/`
3. Events to send: `checkout.session.completed`, `checkout.session.expired`
   (the only two `StripeWebhookView` acts on — see
   `backend/payments/views.py`).
4. Stripe shows a signing secret for this endpoint (`whsec_...`) —
   different from the one `stripe listen` gave you locally. Set that
   as `STRIPE_WEBHOOK_SECRET` on the **edusync-backend** service in
   Render's dashboard, then let it redeploy (Render restarts the
   service automatically when an env var changes).

## Redeploys

Render redeploys automatically on every push to `main` (standard
Blueprint behavior) — no separate deploy step needed once this initial
setup is done. `docker-entrypoint.sh` runs `migrate` and
`collectstatic` on every container start, so schema changes ship
automatically with each deploy, same as the Docker Compose setup.
