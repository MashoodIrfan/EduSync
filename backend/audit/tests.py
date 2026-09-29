from datetime import date

from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from academics.models import Class
from accounts.models import User
from tenants.models import Tenant
from tenants.test_utils import RLSTestCase

from .models import AuditLog
from .services import log_action


class AuditLogServiceTests(RLSTestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name="ABC School", slug="audit-abc-school")
        self.school_admin = User.objects.create_user(
            username="audit_admin",
            password="Pass1234!",
            role=User.Role.SCHOOL_ADMIN,
            tenant=self.tenant,
        )
        self.klass = Class.objects.create(tenant=self.tenant, name="Grade 9", section="A")

    def test_log_action_records_actor_and_tenant(self):
        log_action("created_class", self.klass, tenant=self.tenant, actor=self.school_admin)

        entry = AuditLog.objects.get()
        self.assertEqual(entry.tenant, self.tenant)
        self.assertEqual(entry.actor, self.school_admin)
        self.assertEqual(entry.actor_label, self.school_admin.username)
        self.assertEqual(entry.action, "created_class")
        self.assertEqual(entry.model_name, "Class")
        self.assertEqual(entry.object_id, str(self.klass.pk))

    def test_log_action_survives_actor_deletion(self):
        log_action("created_class", self.klass, tenant=self.tenant, actor=self.school_admin)
        self.school_admin.delete()

        entry = AuditLog.objects.get()
        self.assertIsNone(entry.actor)
        self.assertEqual(entry.actor_label, "audit_admin")

    def test_log_action_without_actor_is_labeled_system(self):
        log_action("payment_success", self.klass, tenant=self.tenant)

        entry = AuditLog.objects.get()
        self.assertIsNone(entry.actor)
        self.assertEqual(entry.actor_label, "system")

    def test_log_action_never_stores_password_unless_explicitly_passed(self):
        log_action(
            "created_teacher",
            self.klass,
            tenant=self.tenant,
            actor=self.school_admin,
            changes={"username": "new_teacher"},
        )

        entry = AuditLog.objects.get()
        self.assertNotIn("password", entry.changes)


class AuditLogAPITests(RLSTestCase):
    def setUp(self):
        self.client = APIClient()

        self.tenant_a = Tenant.objects.create(name="ABC School", slug="audit-api-abc")
        self.tenant_b = Tenant.objects.create(name="XYZ School", slug="audit-api-xyz")

        self.admin_a = User.objects.create_user(
            username="admin_a", password="Pass1234!", role=User.Role.SCHOOL_ADMIN, tenant=self.tenant_a
        )
        self.admin_b = User.objects.create_user(
            username="admin_b", password="Pass1234!", role=User.Role.SCHOOL_ADMIN, tenant=self.tenant_b
        )
        self.platform_admin = User.objects.create_user(
            username="platform_admin", password="Pass1234!", role=User.Role.PLATFORM_ADMIN
        )

        klass_a = Class.objects.create(tenant=self.tenant_a, name="Grade 8", section="A")
        klass_b = Class.objects.create(tenant=self.tenant_b, name="Grade 8", section="A")

        log_action("created_class", klass_a, tenant=self.tenant_a, actor=self.admin_a)
        log_action("created_class", klass_b, tenant=self.tenant_b, actor=self.admin_b)

    def authenticate_as(self, user):
        access = RefreshToken.for_user(user).access_token
        access["role"] = user.role
        access["tenant_id"] = user.tenant_id
        access["username"] = user.username
        access["first_name"] = user.first_name
        access["last_name"] = user.last_name

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_school_admin_sees_only_own_tenant_audit_log(self):
        self.authenticate_as(self.admin_a)

        response = self.client.get("/api/school-admin/audit-log/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["school_name"], "ABC School")

    def test_platform_admin_sees_every_tenant_audit_log(self):
        self.authenticate_as(self.platform_admin)

        response = self.client.get("/api/platform-admin/audit-log/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_platform_admin_can_filter_by_tenant(self):
        self.authenticate_as(self.platform_admin)

        response = self.client.get(f"/api/platform-admin/audit-log/?tenant={self.tenant_b.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["school_name"], "XYZ School")

    def test_teacher_cannot_access_school_admin_audit_log(self):
        teacher = User.objects.create_user(
            username="teacher_a", password="Pass1234!", role=User.Role.TEACHER, tenant=self.tenant_a
        )
        self.authenticate_as(teacher)

        response = self.client.get("/api/school-admin/audit-log/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
