from datetime import date

from django.test import TestCase

from rest_framework import status
from rest_framework.test import APIClient

from academics.models import Class, Student, Subject, TeacherAssignment
from attendance.models import AttendanceRecord, AttendanceRemark
from payments.models import FeeInvoice
from tenants.models import Tenant

from .models import ParentProfile, User


class BaseMultiTenantTestCase(TestCase):
    """
    Sets up two separate schools (tenants) with their own class,
    subject, student and teacher, so every test can assert that a
    user from tenant A can never see or touch tenant B's data.
    """

    def setUp(self):
        self.client = APIClient()

        self.tenant_a = Tenant.objects.create(
            name="ABC School", slug="abc-school"
        )
        self.tenant_b = Tenant.objects.create(
            name="XYZ School", slug="xyz-school"
        )

        self.class_a = Class.objects.create(
            tenant=self.tenant_a, name="Grade 8", section="A"
        )
        self.class_b = Class.objects.create(
            tenant=self.tenant_b, name="Grade 8", section="A"
        )

        self.subject_a = Subject.objects.create(
            tenant=self.tenant_a, name="Mathematics", code="MATH"
        )
        self.subject_b = Subject.objects.create(
            tenant=self.tenant_b, name="Mathematics", code="MATH"
        )

        self.student_a = Student.objects.create(
            tenant=self.tenant_a,
            student_id="STU001",
            first_name="Ahmed",
            last_name="Khan",
            date_of_birth=date(2010, 1, 1),
            class_room=self.class_a,
        )
        self.student_b = Student.objects.create(
            tenant=self.tenant_b,
            student_id="STU001",
            first_name="Sara",
            last_name="Ali",
            date_of_birth=date(2010, 1, 1),
            class_room=self.class_b,
        )

        self.teacher_a = User.objects.create_user(
            username="teacher_a",
            password="Pass1234!",
            role=User.Role.TEACHER,
            tenant=self.tenant_a,
        )
        self.teacher_b = User.objects.create_user(
            username="teacher_b",
            password="Pass1234!",
            role=User.Role.TEACHER,
            tenant=self.tenant_b,
        )

        self.assignment_a = TeacherAssignment.objects.create(
            tenant=self.tenant_a,
            teacher=self.teacher_a,
            class_room=self.class_a,
            subject=self.subject_a,
        )

        self.school_admin_a = User.objects.create_user(
            username="admin_a",
            password="Pass1234!",
            role=User.Role.SCHOOL_ADMIN,
            tenant=self.tenant_a,
        )
        self.school_admin_b = User.objects.create_user(
            username="admin_b",
            password="Pass1234!",
            role=User.Role.SCHOOL_ADMIN,
            tenant=self.tenant_b,
        )

        self.platform_admin = User.objects.create_user(
            username="platform_admin",
            password="Pass1234!",
            role=User.Role.PLATFORM_ADMIN,
        )


class TeacherAPITests(BaseMultiTenantTestCase):
    def test_teacher_sees_only_own_assignments(self):
        self.client.force_authenticate(self.teacher_a)

        response = self.client.get("/api/teacher/assignments/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["subject_name"], "Mathematics"
        )

    def test_teacher_can_view_students_of_assigned_class(self):
        self.client.force_authenticate(self.teacher_a)

        response = self.client.get(
            f"/api/teacher/classes/{self.class_a.id}/students/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["student_id"], "STU001"
        )

    def test_teacher_cannot_view_students_of_unassigned_class(self):
        # teacher_b has no assignment at all, not even in their own
        # tenant's class.
        self.client.force_authenticate(self.teacher_b)

        response = self.client.get(
            f"/api/teacher/classes/{self.class_b.id}/students/"
        )

        self.assertEqual(
            response.status_code, status.HTTP_404_NOT_FOUND
        )

    def test_teacher_cannot_view_students_of_other_tenant_class(self):
        self.client.force_authenticate(self.teacher_a)

        response = self.client.get(
            f"/api/teacher/classes/{self.class_b.id}/students/"
        )

        self.assertEqual(
            response.status_code, status.HTTP_404_NOT_FOUND
        )

    def test_teacher_can_mark_attendance_for_assigned_class_subject(
        self,
    ):
        self.client.force_authenticate(self.teacher_a)

        response = self.client.post(
            "/api/teacher/attendance/",
            data={
                "student": self.student_a.id,
                "class_room": self.class_a.id,
                "subject": self.subject_a.id,
                "date": "2026-09-20",
                "status": "PRESENT",
            },
        )

        self.assertEqual(
            response.status_code, status.HTTP_201_CREATED
        )
        self.assertEqual(
            AttendanceRecord.objects.count(), 1
        )

    def test_teacher_cannot_mark_attendance_without_assignment(self):
        self.client.force_authenticate(self.teacher_b)

        response = self.client.post(
            "/api/teacher/attendance/",
            data={
                "student": self.student_b.id,
                "class_room": self.class_b.id,
                "subject": self.subject_b.id,
                "date": "2026-09-20",
                "status": "PRESENT",
            },
        )

        self.assertEqual(
            response.status_code, status.HTTP_400_BAD_REQUEST
        )
        self.assertEqual(
            AttendanceRecord.objects.count(), 0
        )

    def test_duplicate_attendance_rejected(self):
        self.client.force_authenticate(self.teacher_a)

        payload = {
            "student": self.student_a.id,
            "class_room": self.class_a.id,
            "subject": self.subject_a.id,
            "date": "2026-09-20",
            "status": "PRESENT",
        }

        first = self.client.post(
            "/api/teacher/attendance/", data=payload
        )
        second = self.client.post(
            "/api/teacher/attendance/", data=payload
        )

        self.assertEqual(
            first.status_code, status.HTTP_201_CREATED
        )
        self.assertEqual(
            second.status_code, status.HTTP_400_BAD_REQUEST
        )

    def test_teacher_can_add_remark_to_own_attendance(self):
        attendance = AttendanceRecord.objects.create(
            tenant=self.tenant_a,
            student=self.student_a,
            class_room=self.class_a,
            subject=self.subject_a,
            teacher=self.teacher_a,
            date="2026-09-20",
            status=AttendanceRecord.Status.PRESENT,
        )

        self.client.force_authenticate(self.teacher_a)

        response = self.client.post(
            f"/api/teacher/attendance/{attendance.id}/remark/",
            data={"remark": "Great participation today."},
        )

        self.assertEqual(
            response.status_code, status.HTTP_201_CREATED
        )
        self.assertEqual(
            AttendanceRemark.objects.count(), 1
        )

    def test_teacher_cannot_add_remark_to_other_teachers_attendance(
        self,
    ):
        attendance = AttendanceRecord.objects.create(
            tenant=self.tenant_a,
            student=self.student_a,
            class_room=self.class_a,
            subject=self.subject_a,
            teacher=self.teacher_a,
            date="2026-09-20",
            status=AttendanceRecord.Status.PRESENT,
        )

        # A second teacher in the same tenant, not assigned to this
        # attendance record.
        other_teacher = User.objects.create_user(
            username="teacher_a2",
            password="Pass1234!",
            role=User.Role.TEACHER,
            tenant=self.tenant_a,
        )

        self.client.force_authenticate(other_teacher)

        response = self.client.post(
            f"/api/teacher/attendance/{attendance.id}/remark/",
            data={"remark": "Not my student."},
        )

        self.assertEqual(
            response.status_code, status.HTTP_400_BAD_REQUEST
        )
        self.assertEqual(
            AttendanceRemark.objects.count(), 0
        )


class SchoolAdminAPITests(BaseMultiTenantTestCase):
    def test_non_school_admin_forbidden(self):
        self.client.force_authenticate(self.teacher_a)

        response = self.client.get("/api/school-admin/classes/")

        self.assertEqual(
            response.status_code, status.HTTP_403_FORBIDDEN
        )

    def test_school_admin_sees_only_own_tenant_classes(self):
        self.client.force_authenticate(self.school_admin_a)

        response = self.client.get("/api/school-admin/classes/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_school_admin_can_create_student_in_own_class(self):
        self.client.force_authenticate(self.school_admin_a)

        response = self.client.post(
            "/api/school-admin/students/",
            data={
                "student_id": "STU002",
                "first_name": "Bilal",
                "last_name": "Raza",
                "date_of_birth": "2011-05-05",
                "class_room": self.class_a.id,
            },
        )

        self.assertEqual(
            response.status_code, status.HTTP_201_CREATED
        )

    def test_school_admin_cannot_create_student_in_other_tenant_class(
        self,
    ):
        self.client.force_authenticate(self.school_admin_a)

        response = self.client.post(
            "/api/school-admin/students/",
            data={
                "student_id": "STU002",
                "first_name": "Bilal",
                "last_name": "Raza",
                "date_of_birth": "2011-05-05",
                "class_room": self.class_b.id,
            },
        )

        self.assertEqual(
            response.status_code, status.HTTP_400_BAD_REQUEST
        )

    def test_school_admin_can_create_teacher_and_teacher_can_login(
        self,
    ):
        self.client.force_authenticate(self.school_admin_a)

        response = self.client.post(
            "/api/school-admin/teachers/",
            data={
                "username": "new_teacher",
                "first_name": "Hina",
                "last_name": "Malik",
                "password": "StrongPass123!",
            },
        )

        self.assertEqual(
            response.status_code, status.HTTP_201_CREATED
        )

        teacher = User.objects.get(username="new_teacher")
        self.assertEqual(teacher.role, User.Role.TEACHER)
        self.assertEqual(teacher.tenant_id, self.tenant_a.id)
        self.assertTrue(teacher.is_active)

        login_response = self.client.post(
            "/api/token/",
            data={
                "username": "new_teacher",
                "password": "StrongPass123!",
            },
        )
        self.assertEqual(
            login_response.status_code, status.HTTP_200_OK
        )
        self.assertIn("access", login_response.data)

    def test_school_admin_cannot_delete_teacher(self):
        self.client.force_authenticate(self.school_admin_a)

        response = self.client.delete(
            f"/api/school-admin/teachers/{self.teacher_a.id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def test_school_admin_cannot_assign_teacher_from_other_tenant(
        self,
    ):
        self.client.force_authenticate(self.school_admin_a)

        response = self.client.post(
            "/api/school-admin/teacher-assignments/",
            data={
                "teacher": self.teacher_b.id,
                "class_room": self.class_a.id,
                "subject": self.subject_a.id,
            },
        )

        self.assertEqual(
            response.status_code, status.HTTP_400_BAD_REQUEST
        )

    def test_school_admin_can_create_parent_and_parent_can_login(
        self,
    ):
        self.client.force_authenticate(self.school_admin_a)

        response = self.client.post(
            "/api/school-admin/parents/",
            data={
                "username": "ahmed_parent",
                "first_name": "Kamran",
                "last_name": "Khan",
                "student": self.student_a.id,
            },
        )

        self.assertEqual(
            response.status_code, status.HTTP_201_CREATED
        )
        temp_password = response.data["temporary_password"]
        self.assertTrue(temp_password)

        profile = ParentProfile.objects.get(
            user__username="ahmed_parent"
        )
        self.assertTrue(profile.must_change_password)

        login_response = self.client.post(
            "/api/token/",
            data={
                "username": "ahmed_parent",
                "password": temp_password,
            },
        )
        self.assertEqual(
            login_response.status_code, status.HTTP_200_OK
        )

    def test_school_admin_cannot_create_parent_for_other_tenant_student(
        self,
    ):
        self.client.force_authenticate(self.school_admin_a)

        response = self.client.post(
            "/api/school-admin/parents/",
            data={
                "username": "sara_parent",
                "student": self.student_b.id,
            },
        )

        self.assertEqual(
            response.status_code, status.HTTP_400_BAD_REQUEST
        )

    def test_school_admin_can_reset_parent_password(self):
        parent_user = User.objects.create_user(
            username="ahmed_parent",
            password="OldPass123!",
            role=User.Role.PARENT,
            tenant=self.tenant_a,
        )
        profile = ParentProfile.objects.create(
            user=parent_user,
            student=self.student_a,
            must_change_password=False,
        )

        self.client.force_authenticate(self.school_admin_a)

        response = self.client.post(
            f"/api/school-admin/parents/{profile.id}/reset-password/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        profile.refresh_from_db()
        self.assertTrue(profile.must_change_password)

    def test_school_admin_can_create_fee_invoice(self):
        self.client.force_authenticate(self.school_admin_a)

        response = self.client.post(
            "/api/school-admin/fee-invoices/",
            data={
                "student": self.student_a.id,
                "description": "September Fee",
                "amount": "15000.00",
                "due_date": "2026-09-30",
            },
        )

        self.assertEqual(
            response.status_code, status.HTTP_201_CREATED
        )
        self.assertTrue(response.data["invoice_number"])

    def test_school_admin_cannot_set_invoice_status_to_paid(self):
        invoice = FeeInvoice.objects.create(
            tenant=self.tenant_a,
            student=self.student_a,
            invoice_number="INV-100",
            description="September Fee",
            amount="15000.00",
            due_date="2026-09-30",
        )

        self.client.force_authenticate(self.school_admin_a)

        response = self.client.patch(
            f"/api/school-admin/fee-invoices/{invoice.id}/",
            data={"status": "PAID"},
        )

        self.assertEqual(
            response.status_code, status.HTTP_400_BAD_REQUEST
        )

    def test_school_admin_cannot_see_other_tenant_fee_invoices(self):
        FeeInvoice.objects.create(
            tenant=self.tenant_b,
            student=self.student_b,
            invoice_number="INV-200",
            description="September Fee",
            amount="15000.00",
            due_date="2026-09-30",
        )

        self.client.force_authenticate(self.school_admin_a)

        response = self.client.get(
            "/api/school-admin/fee-invoices/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_school_admin_can_view_and_update_school_setup(self):
        self.client.force_authenticate(self.school_admin_a)

        get_response = self.client.get("/api/school-admin/school/")
        self.assertEqual(
            get_response.status_code, status.HTTP_200_OK
        )
        self.assertEqual(
            get_response.data["name"], "ABC School"
        )

        patch_response = self.client.patch(
            "/api/school-admin/school/",
            data={
                "phone": "0311-0000000",
                "slug": "hacked-slug",
            },
        )

        self.assertEqual(
            patch_response.status_code, status.HTTP_200_OK
        )
        self.tenant_a.refresh_from_db()
        self.assertEqual(self.tenant_a.phone, "0311-0000000")
        # slug is read-only; the attempted change is ignored.
        self.assertEqual(self.tenant_a.slug, "abc-school")


class PlatformAdminAPITests(BaseMultiTenantTestCase):
    def test_school_admin_forbidden_from_platform_admin_endpoints(
        self,
    ):
        self.client.force_authenticate(self.school_admin_a)

        response = self.client.get("/api/platform-admin/tenants/")

        self.assertEqual(
            response.status_code, status.HTTP_403_FORBIDDEN
        )

    def test_platform_admin_can_create_tenant(self):
        self.client.force_authenticate(self.platform_admin)

        response = self.client.post(
            "/api/platform-admin/tenants/",
            data={
                "name": "New Horizon School",
                "email": "info@newhorizon.example.com",
            },
        )

        self.assertEqual(
            response.status_code, status.HTTP_201_CREATED
        )
        self.assertEqual(response.data["slug"], "new-horizon-school")

    def test_tenant_has_no_delete_endpoint(self):
        self.client.force_authenticate(self.platform_admin)

        response = self.client.delete(
            f"/api/platform-admin/tenants/{self.tenant_a.id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def test_platform_admin_can_create_school_admin_for_tenant(self):
        self.client.force_authenticate(self.platform_admin)

        response = self.client.post(
            f"/api/platform-admin/tenants/{self.tenant_b.id}/"
            "school-admins/",
            data={
                "username": "new_admin_b",
                "first_name": "Nadia",
                "last_name": "Sheikh",
            },
        )

        self.assertEqual(
            response.status_code, status.HTTP_201_CREATED
        )
        temp_password = response.data["temporary_password"]
        self.assertTrue(temp_password)

        created_admin = User.objects.get(
            username="new_admin_b"
        )
        self.assertEqual(created_admin.role, User.Role.SCHOOL_ADMIN)
        self.assertEqual(created_admin.tenant_id, self.tenant_b.id)

        login_response = self.client.post(
            "/api/token/",
            data={
                "username": "new_admin_b",
                "password": temp_password,
            },
        )
        self.assertEqual(
            login_response.status_code, status.HTTP_200_OK
        )
