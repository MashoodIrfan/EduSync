from django.db import connection
from django.test import TestCase


class RLSTestCase(TestCase):
    """
    Base TestCase for tests that build fixtures directly through the
    ORM (Tenant.objects.create(...), etc.) outside of an HTTP request.

    Those calls don't go through TenantContextMiddleware, so without
    this, PostgreSQL's Row-Level Security would reject the INSERTs
    outright (no tenant context set = no policy match). Real API
    calls made via self.client within a test still get their own
    correct per-request tenant context from the middleware as normal
    — this only bypasses RLS for the raw fixture-setup plumbing.
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        with connection.cursor() as cursor:
            cursor.execute("SET app.bypass_rls = 'true'")
