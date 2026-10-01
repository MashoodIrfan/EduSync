from datetime import date

from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from academics.models import Class, Student, Subject, TeacherAssignment
from attendance.models import (
    AttendanceRecord,
    AttendanceRemark,
    AttendanceStatusChange,
)
from payments.models import FeeInvoice
from tenants.models import Tenant
from tenants.test_utils import RLSTestCase

from .models import ParentProfile, User


class BaseMultiTenantTestCase(RLSTestCase):
    """
    Sets up two separate schools (tenants) with their own class,
    subject, student and teacher, so every test can assert that a
    user from tenant A can never see or touch tenant B's data.

    Authenticates with a real, signed JWT (not DRF's
    force_authenticate() shortcut) so that TenantContextMiddleware —
    which decodes the Authorization header itself, since request.user
    isn't resolved yet at the point it runs — sees the same tenant
    context a real client request would.
    """

    def authenticate_as(self, user):
        access = RefreshToken.for_user(user).access_token
        access["role"] = user.role
        access["tenant_id"] = user.tenant_id
        access["username"] = user.username
        access["first_name"] = user.first_name
        access["last_name"] = user.last_name

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

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
        self.authenticate_as(self.teacher_a)

        response = self.client.get("/api/teacher/assignments/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["subject_name"], "Mathematics"
        )

    def test_teacher_can_view_students_of_assigned_class(self):
        self.authenticate_as(self.teacher_a)

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
        self.authenticate_as(self.teacher_b)

        response = self.client.get(
            f"/api/teacher/classes/{self.class_b.id}/students/"
        )

        self.assertEqual(
            response.status_code, status.HTTP_404_NOT_FOUND
        )

    def test_teacher_cannot_view_students_of_other_tenant_class(self):
        self.authenticate_as(self.teacher_a)

        response = self.client.get(
            f"/api/teacher/classes/{self.class_b.id}/students/"
        )

        self.assertEqual(
            response.status_code, status.HTTP_404_NOT_FOUND
        )

    def test_teacher_can_mark_attendance_for_assigned_class_subject(
        self,
    ):
        self.authenticate_as(self.teacher_a)

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
        self.authenticate_as(self.teacher_b)

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

    def test_resubmitting_same_status_updates_without_logging_a_change(
        self,
    ):
        self.authenticate_as(self.teacher_a)

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
            second.status_code, status.HTTP_200_OK
        )
        self.assertEqual(
            AttendanceRecord.objects.count(), 1
        )
        self.assertEqual(
            AttendanceStatusChange.objects.count(), 0
        )

    def test_resubmitting_a_different_status_updates_and_logs_the_change(
        self,
    ):
        self.authenticate_as(self.teacher_a)

        first = self.client.post(
            "/api/teacher/attendance/",
            data={
                "student": self.student_a.id,
                "class_room": self.class_a.id,
                "subject": self.subject_a.id,
                "date": "2026-09-20",
                "status": "PRESENT",
            },
        )
        second = self.client.post(
            "/api/teacher/attendance/",
            data={
                "student": self.student_a.id,
                "class_room": self.class_a.id,
                "subject": self.subject_a.id,
                "date": "2026-09-20",
                "status": "ABSENT",
            },
        )

        self.assertEqual(
            first.status_code, status.HTTP_201_CREATED
        )
        self.assertEqual(
            second.status_code, status.HTTP_200_OK
        )

        record = AttendanceRecord.objects.get(
            id=first.data["id"]
        )
        self.assertEqual(
            record.status, "ABSENT"
        )
        self.assertEqual(
            AttendanceRecord.objects.count(), 1
        )

        change = AttendanceStatusChange.objects.get()
        self.assertEqual(
            change.previous_status, "PRESENT"
        )
        self.assertEqual(
            change.new_status, "ABSENT"
        )
        self.assertEqual(
            change.teacher_id, self.teacher_a.id
        )

    def test_another_teacher_cannot_overwrite_existing_attendance(self):
        AttendanceRecord.objects.create(
            tenant=self.tenant_a,
            student=self.student_a,
            class_room=self.class_a,
            subject=self.subject_a,
            teacher=self.teacher_a,
            date="2026-09-20",
            status=AttendanceRecord.Status.PRESENT,
        )

        other_teacher = User.objects.create_user(
            username="other_teacher_a",
            password="TestPassword123!",
            role="TEACHER",
            tenant=self.tenant_a,
        )
        TeacherAssignment.objects.create(
            tenant=self.tenant_a,
            teacher=other_teacher,
            class_room=self.class_a,
            subject=self.subject_a,
        )

        self.authenticate_as(other_teacher)

        response = self.client.post(
            "/api/teacher/attendance/",
            data={
                "student": self.student_a.id,
                "class_room": self.class_a.id,
                "subject": self.subject_a.id,
                "date": "2026-09-20",
                "status": "ABSENT",
            },
        )

        self.assertEqual(
            response.status_code, status.HTTP_400_BAD_REQUEST
        )
        self.assertEqual(
            AttendanceRecord.objects.get().status, "PRESENT"
        )

    def test_remark_saved_alongside_status_in_one_request(self):
        self.authenticate_as(self.teacher_a)

        response = self.client.post(
            "/api/teacher/attendance/",
            data={
                "student": self.student_a.id,
                "class_room": self.class_a.id,
                "subject": self.subject_a.id,
                "date": "2026-09-20",
                "status": "PRESENT",
                "remark": "Great participation today.",
            },
        )

        self.assertEqual(
            response.status_code, status.HTTP_201_CREATED
        )
        self.assertEqual(
            response.data["remark"], "Great participation today."
        )
        self.assertEqual(
            AttendanceRemark.objects.count(), 1
        )

    def test_status_change_list_scoped_to_own_teacher_and_tenant(self):
        self.authenticate_as(self.teacher_a)

        self.client.post(
            "/api/teacher/attendance/",
            data={
                "student": self.student_a.id,
                "class_room": self.class_a.id,
                "subject": self.subject_a.id,
                "date": "2026-09-20",
                "status": "PRESENT",
            },
        )
        self.client.post(
            "/api/teacher/attendance/",
            data={
                "student": self.student_a.id,
                "class_room": self.class_a.id,
                "subject": self.subject_a.id,
                "date": "2026-09-20",
                "status": "LATE",
            },
        )

        response = self.client.get(
            "/api/teacher/attendance/status-changes/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["previous_status"], "PRESENT"
        )
        self.assertEqual(
            response.data[0]["new_status"], "LATE"
        )
        self.assertEqual(
            response.data[0]["student_name"], "Ahmed Khan"
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

        self.authenticate_as(self.teacher_a)

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

        self.authenticate_as(other_teacher)

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
        self.authenticate_as(self.teacher_a)

        response = self.client.get("/api/school-admin/classes/")

        self.assertEqual(
            response.status_code, status.HTTP_403_FORBIDDEN
        )

    def test_school_admin_sees_only_own_tenant_classes(self):
        self.authenticate_as(self.school_admin_a)

        response = self.client.get("/api/school-admin/classes/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_school_admin_can_create_student_in_own_class(self):
        self.authenticate_as(self.school_admin_a)

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
        self.authenticate_as(self.school_admin_a)

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

    def test_school_admin_can_edit_class(self):
        self.authenticate_as(self.school_admin_a)

        response = self.client.patch(
            f"/api/school-admin/classes/{self.class_a.id}/",
            data={"name": "Grade 9"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.class_a.refresh_from_db()
        self.assertEqual(self.class_a.name, "Grade 9")

    def test_school_admin_can_delete_empty_class(self):
        self.authenticate_as(self.school_admin_a)

        empty_class = Class.objects.create(
            tenant=self.tenant_a, name="Grade 10", section="C"
        )

        response = self.client.delete(
            f"/api/school-admin/classes/{empty_class.id}/"
        )

        self.assertEqual(
            response.status_code, status.HTTP_204_NO_CONTENT
        )
        self.assertFalse(
            Class.objects.filter(id=empty_class.id).exists()
        )

    def test_school_admin_cannot_delete_class_with_students(self):
        self.authenticate_as(self.school_admin_a)

        # self.class_a already has self.student_a enrolled and
        # self.assignment_a teaching it.
        response = self.client.delete(
            f"/api/school-admin/classes/{self.class_a.id}/"
        )

        self.assertEqual(
            response.status_code, status.HTTP_400_BAD_REQUEST
        )
        self.assertTrue(
            Class.objects.filter(id=self.class_a.id).exists()
        )

    def test_school_admin_can_edit_subject(self):
        self.authenticate_as(self.school_admin_a)

        response = self.client.patch(
            f"/api/school-admin/subjects/{self.subject_a.id}/",
            data={"name": "Advanced Mathematics"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.subject_a.refresh_from_db()
        self.assertEqual(self.subject_a.name, "Advanced Mathematics")

    def test_school_admin_can_delete_empty_subject(self):
        self.authenticate_as(self.school_admin_a)

        empty_subject = Subject.objects.create(
            tenant=self.tenant_a, name="Art", code="ART"
        )

        response = self.client.delete(
            f"/api/school-admin/subjects/{empty_subject.id}/"
        )

        self.assertEqual(
            response.status_code, status.HTTP_204_NO_CONTENT
        )

    def test_school_admin_cannot_delete_subject_with_assignments(self):
        self.authenticate_as(self.school_admin_a)

        # self.subject_a already has self.assignment_a teaching it.
        response = self.client.delete(
            f"/api/school-admin/subjects/{self.subject_a.id}/"
        )

        self.assertEqual(
            response.status_code, status.HTTP_400_BAD_REQUEST
        )
        self.assertTrue(
            Subject.objects.filter(id=self.subject_a.id).exists()
        )

    def test_school_admin_can_edit_student(self):
        self.authenticate_as(self.school_admin_a)

        response = self.client.patch(
            f"/api/school-admin/students/{self.student_a.id}/",
            data={"first_name": "Ahmad"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student_a.refresh_from_db()
        self.assertEqual(self.student_a.first_name, "Ahmad")

    def test_school_admin_can_delete_student_with_no_activity(self):
        self.authenticate_as(self.school_admin_a)

        fresh_student = Student.objects.create(
            tenant=self.tenant_a,
            student_id="STU099",
            first_name="New",
            last_name="Student",
            date_of_birth=date(2012, 1, 1),
            class_room=self.class_a,
        )

        response = self.client.delete(
            f"/api/school-admin/students/{fresh_student.id}/"
        )

        self.assertEqual(
            response.status_code, status.HTTP_204_NO_CONTENT
        )

    def test_school_admin_cannot_delete_student_with_attendance(self):
        self.authenticate_as(self.school_admin_a)

        AttendanceRecord.objects.create(
            tenant=self.tenant_a,
            student=self.student_a,
            class_room=self.class_a,
            subject=self.subject_a,
            teacher=self.teacher_a,
            date="2026-09-20",
            status=AttendanceRecord.Status.PRESENT,
        )

        response = self.client.delete(
            f"/api/school-admin/students/{self.student_a.id}/"
        )

        self.assertEqual(
            response.status_code, status.HTTP_400_BAD_REQUEST
        )
        self.assertTrue(
            Student.objects.filter(id=self.student_a.id).exists()
        )

    def test_school_admin_cannot_delete_student_with_parent_account(
        self,
    ):
        self.authenticate_as(self.school_admin_a)

        parent = User.objects.create_user(
            username="parent_for_delete_test",
            password="Pass1234!",
            role=User.Role.PARENT,
            tenant=self.tenant_a,
        )
        ParentProfile.objects.create(
            user=parent, student=self.student_a
        )

        response = self.client.delete(
            f"/api/school-admin/students/{self.student_a.id}/"
        )

        self.assertEqual(
            response.status_code, status.HTTP_400_BAD_REQUEST
        )
        self.assertTrue(
            Student.objects.filter(id=self.student_a.id).exists()
        )

    def test_school_admin_can_create_teacher_and_teacher_can_login(
        self,
    ):
        self.authenticate_as(self.school_admin_a)

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
        self.authenticate_as(self.school_admin_a)

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
        self.authenticate_as(self.school_admin_a)

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
        self.authenticate_as(self.school_admin_a)

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
        self.authenticate_as(self.school_admin_a)

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

        self.authenticate_as(self.school_admin_a)

        response = self.client.post(
            f"/api/school-admin/parents/{profile.id}/reset-password/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        profile.refresh_from_db()
        self.assertTrue(profile.must_change_password)

    def test_school_admin_can_create_fee_invoice(self):
        self.authenticate_as(self.school_admin_a)

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

        self.authenticate_as(self.school_admin_a)

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

        self.authenticate_as(self.school_admin_a)

        response = self.client.get(
            "/api/school-admin/fee-invoices/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_school_admin_can_view_and_update_school_setup(self):
        self.authenticate_as(self.school_admin_a)

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
                "name": "Hacked School Name",
            },
        )

        self.assertEqual(
            patch_response.status_code, status.HTTP_200_OK
        )
        self.tenant_a.refresh_from_db()
        self.assertEqual(self.tenant_a.phone, "0311-0000000")
        # slug and name are read-only here; only Platform Admin can
        # change a school's name. Attempted changes are ignored.
        self.assertEqual(self.tenant_a.slug, "abc-school")
        self.assertEqual(self.tenant_a.name, "ABC School")


class PlatformAdminAPITests(BaseMultiTenantTestCase):
    def test_school_admin_forbidden_from_platform_admin_endpoints(
        self,
    ):
        self.authenticate_as(self.school_admin_a)

        response = self.client.get("/api/platform-admin/tenants/")

        self.assertEqual(
            response.status_code, status.HTTP_403_FORBIDDEN
        )

    def test_platform_admin_can_create_tenant(self):
        self.authenticate_as(self.platform_admin)

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
        self.authenticate_as(self.platform_admin)

        response = self.client.delete(
            f"/api/platform-admin/tenants/{self.tenant_a.id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def test_platform_admin_can_create_school_admin_for_tenant(self):
        self.authenticate_as(self.platform_admin)

        tenant_c = Tenant.objects.create(
            name="Riverside Academy", slug="riverside-academy"
        )

        response = self.client.post(
            f"/api/platform-admin/tenants/{tenant_c.id}/"
            "school-admins/",
            data={
                "username": "new_admin_c",
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
            username="new_admin_c"
        )
        self.assertEqual(created_admin.role, User.Role.SCHOOL_ADMIN)
        self.assertEqual(created_admin.tenant_id, tenant_c.id)

        login_response = self.client.post(
            "/api/token/",
            data={
                "username": "new_admin_c",
                "password": temp_password,
            },
        )
        self.assertEqual(
            login_response.status_code, status.HTTP_200_OK
        )

    def test_platform_admin_cannot_create_second_admin_for_tenant(self):
        self.authenticate_as(self.platform_admin)

        response = self.client.post(
            f"/api/platform-admin/tenants/{self.tenant_b.id}/"
            "school-admins/",
            data={
                "username": "second_admin_b",
                "first_name": "Second",
                "last_name": "Admin",
            },
        )

        self.assertEqual(
            response.status_code, status.HTTP_400_BAD_REQUEST
        )
        self.assertFalse(
            User.objects.filter(username="second_admin_b").exists()
        )

    def test_platform_admin_can_add_admin_after_existing_one_deactivated(self):
        self.authenticate_as(self.platform_admin)

        self.school_admin_b.is_active = False
        self.school_admin_b.save()

        response = self.client.post(
            f"/api/platform-admin/tenants/{self.tenant_b.id}/"
            "school-admins/",
            data={
                "username": "replacement_admin_b",
                "first_name": "Replacement",
                "last_name": "Admin",
            },
        )

        self.assertEqual(
            response.status_code, status.HTTP_201_CREATED
        )

    def test_platform_admin_can_add_admin_after_existing_one_removed(self):
        self.authenticate_as(self.platform_admin)

        response = self.client.delete(
            f"/api/platform-admin/tenants/{self.tenant_b.id}/"
            f"school-admins/{self.school_admin_b.id}/"
        )
        self.assertEqual(
            response.status_code, status.HTTP_204_NO_CONTENT
        )

        response = self.client.post(
            f"/api/platform-admin/tenants/{self.tenant_b.id}/"
            "school-admins/",
            data={
                "username": "replacement_admin_b",
                "first_name": "Replacement",
                "last_name": "Admin",
            },
        )

        self.assertEqual(
            response.status_code, status.HTTP_201_CREATED
        )
