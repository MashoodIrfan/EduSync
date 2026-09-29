# EduSync

A multi-tenant school operations + fee-payment SaaS — production-style architecture, not a generic CRUD school management system.

Every school on the platform is a tenant with strictly isolated data, enforced both at the application layer (every query derives its tenant from the authenticated user, never a client-supplied ID) and at the database layer via PostgreSQL Row-Level Security.

## Roles

Exactly four login roles — there is no Student login; students are academic records only.

- **Platform Admin** — registers schools (tenants) and their first School Admin account.
- **School Admin** — manages one school's classes, subjects, students, teachers, teacher assignments, parent accounts, fee invoices, and payment visibility.
- **Teacher** — marks subject-specific attendance and remarks, scoped to explicit `TeacherAssignment` (class + subject) records — never authorized by name.
- **Parent** — permanently linked to exactly one student (no child selector), views attendance/remarks/fees, and pays invoices in full.

## Architecture highlights

- **Real tenant isolation, two layers deep.** Every DRF view/serializer scopes to `request.user.tenant`; PostgreSQL Row-Level Security policies enforce the same boundary at the database level, verified by tests that run genuinely unfiltered queries under different session contexts.
- **No partial payments.** A `FeeInvoice` is paid in full or not at all; the frontend can never submit an arbitrary amount, and an invoice can only become `PAID` via the server-side payment state machine — never a manual admin action.
- **Idempotent, auditable payments.** `PaymentTransaction` moves through `INITIATED → PENDING → SUCCESS/FAILED/VERIFICATION_REQUIRED` under an atomic, row-locked state transition. Duplicate gateway callbacks never double-process; unsigned or mismatched callbacks fail closed into `VERIFICATION_REQUIRED` instead of silently succeeding.
- **JWT carries authorization context.** Access tokens embed role and tenant as custom claims, used both by the frontend for routing and by the RLS middleware to set database session context — without an extra round-trip.
- **Offline-first attendance.** The Teacher portal is an installable PWA: class rosters cache to IndexedDB on every successful fetch, and marking attendance always writes to a local sync queue first — identical behavior online or off. A network failure retries automatically on reconnect; a genuine duplicate is detected and surfaced as a conflict instead of being retried forever.
- **Privileged-action audit trail.** Account creation/deactivation, fee invoice changes, tenant management, and payment outcomes are logged explicitly (not via blanket signals) with an actor that survives the actor's own account later being deleted — the actual point of an audit log.

## Tech stack

**Backend:** Python, Django 5.2, Django REST Framework, PostgreSQL, SimpleJWT, django-environ, PostgreSQL Row-Level Security, Gunicorn, Whitenoise

**Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Dexie (IndexedDB), vite-plugin-pwa

**Payments:** JazzCash (sandbox integration deferred pending gateway account access; local callback verification logic is fully implemented and tested)

**Infra:** Docker, Docker Compose

## Project layout

```
backend/     Django project (config/, accounts/, tenants/, academics/, attendance/, payments/, audit/)
frontend/    React + Vite app (src/api, src/auth, src/offline, src/pages/{parent,teacher,school-admin,platform-admin})
docker/      Postgres init script (creates the app's restricted RLS-safe DB role)
```

## Getting started

### Backend

```
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env           # fill in SECRET_KEY, POSTGRES_*, JAZZCASH_* (see below)
python manage.py migrate
python manage.py test
python manage.py runserver
```

`POSTGRES_USER` must be a non-superuser, non-`BYPASSRLS` PostgreSQL role that owns the app's tables — Row-Level Security is a no-op for superusers, and for table owners unless `FORCE ROW LEVEL SECURITY` is set (which the RLS migration does). See `tenants/migrations/0002_row_level_security.py` and `tenants/middleware.py` for the full design.

### Frontend

```
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:8000`, so no CORS configuration is needed locally.

### Docker

Runs the whole stack — Postgres, backend (Gunicorn + Whitenoise), frontend (static build served by nginx, which also proxies `/api/` to the backend container) — with zero manual setup. The `db` service automatically creates the restricted, RLS-safe database role the backend connects as; you never touch that by hand.

```
cp .env.example .env    # optional — every value already has a working default
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Postgres: localhost:5432

Defaults are meant for local/demo use only — set real values (`SECRET_KEY`, `POSTGRES_*`, `DEBUG=False`, a real `ALLOWED_HOSTS`) in `.env` before deploying anywhere reachable from outside your machine. `docker/postgres-init.sh` is what actually creates the app's Postgres role on first boot — see it and `backend/tenants/migrations/0002_row_level_security.py` for why that role can never be a superuser.

## Roadmap

Implemented: multi-tenant models, JWT auth, Parent/Teacher/School Admin/Platform Admin APIs and dashboards, JazzCash callback verification (sandbox credentials pending), PostgreSQL RLS, offline-first attendance PWA, privileged-action audit log, Docker.

Ahead: payment reconciliation for stuck `PENDING` transactions (needs live JazzCash sandbox access + Celery), Redis, Celery, GitHub Actions CI, frontend automated tests, deployment.
