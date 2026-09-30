FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# psycopg2-binary ships a prebuilt wheel, but the Postgres client
# shared library still needs to be present at runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x docker-entrypoint.sh

EXPOSE 8000

# A single worker matches what's actually safe on a resource-constrained
# free-tier instance (e.g. Render's free plan gives 0.1 vCPU / 512MB) —
# multiple sync workers fighting over a fraction of one core doesn't add
# real parallelism there, and can push a CPU-heavy request (like Django's
# password hashing) past a platform's proxy timeout instead. Override
# with a real --workers count for a deployment with more CPU available.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "1"]
