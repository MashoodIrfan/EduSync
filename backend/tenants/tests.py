from django.db import connection, transaction

from academics.models import Class
from tenants.models import Tenant
from tenants.test_utils import RLSTestCase


class RowLevelSecurityTests(RLSTestCase):
    """
    Proves PostgreSQL itself — not just application code — enforces
    tenant isolation. Each query below is a plain, unfiltered
    Class.objects.all(): if RLS weren't doing its job, every tenant's
    rows would come back regardless of the session's tenant context.
    """

    def setUp(self):
        self.tenant_a = Tenant.objects.create(name="ABC School", slug="rls-abc-school")
        self.tenant_b = Tenant.objects.create(name="XYZ School", slug="rls-xyz-school")

        Class.objects.create(tenant=self.tenant_a, name="Grade 8", section="A")
        Class.objects.create(tenant=self.tenant_b, name="Grade 9", section="B")

    @staticmethod
    def _set_session(tenant_id, bypass=False):
        with connection.cursor() as cursor:
            cursor.execute(f"SET LOCAL app.bypass_rls = '{'true' if bypass else 'false'}'")
            cursor.execute(
                f"SET LOCAL app.current_tenant_id = '{tenant_id if tenant_id is not None else ''}'"
            )

    def test_unfiltered_query_only_returns_own_tenant_rows(self):
        with transaction.atomic():
            self._set_session(self.tenant_a.id)
            names = list(Class.objects.values_list("name", flat=True))

        self.assertEqual(names, ["Grade 8"])

    def test_unfiltered_query_switches_with_session_tenant(self):
        with transaction.atomic():
            self._set_session(self.tenant_b.id)
            names = list(Class.objects.values_list("name", flat=True))

        self.assertEqual(names, ["Grade 9"])

    def test_no_tenant_context_returns_nothing(self):
        with transaction.atomic():
            self._set_session(tenant_id=None, bypass=False)
            names = list(Class.objects.values_list("name", flat=True))

        self.assertEqual(names, [])

    def test_bypass_flag_sees_every_tenant(self):
        with transaction.atomic():
            self._set_session(tenant_id=None, bypass=True)
            names = set(Class.objects.values_list("name", flat=True))

        self.assertEqual(names, {"Grade 8", "Grade 9"})

    def test_insert_blocked_for_wrong_tenant(self):
        with self.assertRaises(Exception):
            with transaction.atomic():
                self._set_session(self.tenant_a.id)
                # Attempting to write a row tagged for tenant_b while
                # the session is scoped to tenant_a must violate the
                # WITH CHECK clause.
                Class.objects.create(tenant=self.tenant_b, name="Sneaky", section="X")
