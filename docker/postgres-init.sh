#!/bin/bash
# Runs automatically on the *first* startup of the db container (via
# Postgres's own /docker-entrypoint-initdb.d/ convention). Creates the
# restricted role the Django app actually connects as.
#
# Why this exists: PostgreSQL Row-Level Security is a no-op for
# superusers regardless of FORCE ROW LEVEL SECURITY, and for a table
# owner unless FORCE is set. The app must never connect as the
# Postgres superuser this container creates (that's only used here,
# once, to set things up) — see backend/tenants/migrations/
# 0002_row_level_security.py and backend/.env.example for the full
# story.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE ROLE ${EDUSYNC_APP_USER} WITH LOGIN PASSWORD '${EDUSYNC_APP_PASSWORD}' CREATEDB NOSUPERUSER NOBYPASSRLS;
    GRANT ALL PRIVILEGES ON DATABASE ${POSTGRES_DB} TO ${EDUSYNC_APP_USER};
    GRANT ALL PRIVILEGES ON SCHEMA public TO ${EDUSYNC_APP_USER};
    GRANT CREATE ON SCHEMA public TO ${EDUSYNC_APP_USER};
EOSQL
