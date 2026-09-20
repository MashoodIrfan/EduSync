from django.utils.crypto import get_random_string

from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from academics.models import Class, Student, Subject, TeacherAssignment
from payments.models import FeeInvoice, PaymentTransaction

from .models import ParentProfile, User
from .permissions import IsSchoolAdmin
from .school_admin_serializers import (
    SchoolAdminClassSerializer,
    SchoolAdminFeeInvoiceSerializer,
    SchoolAdminParentCreateSerializer,
    SchoolAdminParentListSerializer,
    SchoolAdminPaymentTransactionSerializer,
    SchoolAdminStudentSerializer,
    SchoolAdminSubjectSerializer,
    SchoolAdminTeacherAssignmentSerializer,
    SchoolAdminTeacherSerializer,
    SchoolAdminTenantSerializer,
)


class SchoolAdminClassViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSchoolAdmin]
    serializer_class = SchoolAdminClassSerializer

    def get_queryset(self):
        return Class.objects.filter(
            tenant=self.request.user.tenant
        ).order_by("name", "section")


class SchoolAdminSubjectViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSchoolAdmin]
    serializer_class = SchoolAdminSubjectSerializer

    def get_queryset(self):
        return Subject.objects.filter(
            tenant=self.request.user.tenant
        ).order_by("name")


class SchoolAdminStudentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSchoolAdmin]
    serializer_class = SchoolAdminStudentSerializer

    def get_queryset(self):
        queryset = Student.objects.filter(
            tenant=self.request.user.tenant
        ).select_related("class_room")

        class_room_id = self.request.query_params.get(
            "class_room"
        )

        if class_room_id:
            queryset = queryset.filter(
                class_room_id=class_room_id
            )

        return queryset.order_by("first_name", "last_name")


class SchoolAdminTeacherViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    Teacher accounts are never hard-deleted here: their
    TeacherAssignment / AttendanceRecord / AttendanceRemark rows
    cascade-delete with the User, which would silently erase other
    students' attendance history. Use PATCH is_active=false instead.
    """

    permission_classes = [IsAuthenticated, IsSchoolAdmin]
    serializer_class = SchoolAdminTeacherSerializer

    def get_queryset(self):
        return User.objects.filter(
            role=User.Role.TEACHER,
            tenant=self.request.user.tenant,
        ).order_by("first_name", "last_name")


class SchoolAdminTeacherAssignmentViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated, IsSchoolAdmin]
    serializer_class = SchoolAdminTeacherAssignmentSerializer

    def get_queryset(self):
        return (
            TeacherAssignment.objects
            .filter(tenant=self.request.user.tenant)
            .select_related("teacher", "class_room", "subject")
            .order_by(
                "class_room__name",
                "class_room__section",
                "subject__name",
            )
        )


class SchoolAdminParentViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated, IsSchoolAdmin]

    def get_queryset(self):
        return (
            ParentProfile.objects
            .filter(user__tenant=self.request.user.tenant)
            .select_related("user", "student")
            .order_by("user__first_name", "user__last_name")
        )

    def get_serializer_class(self):
        if self.action == "create":
            return SchoolAdminParentCreateSerializer

        return SchoolAdminParentListSerializer

    def perform_destroy(self, instance):
        # Deleting the login account cascades to the ParentProfile.
        instance.user.delete()

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        profile = self.get_object()
        new_password = get_random_string(10)

        profile.user.set_password(new_password)
        profile.user.save(update_fields=["password"])

        profile.must_change_password = True
        profile.save(update_fields=["must_change_password"])

        return Response(
            {
                "id": profile.id,
                "username": profile.user.username,
                "temporary_password": new_password,
                "must_change_password": True,
            }
        )


class SchoolAdminFeeInvoiceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSchoolAdmin]
    serializer_class = SchoolAdminFeeInvoiceSerializer

    def get_queryset(self):
        queryset = FeeInvoice.objects.filter(
            tenant=self.request.user.tenant
        ).select_related("student")

        student_id = self.request.query_params.get("student")
        invoice_status = self.request.query_params.get("status")

        if student_id:
            queryset = queryset.filter(student_id=student_id)

        if invoice_status:
            queryset = queryset.filter(status=invoice_status)

        return queryset.order_by("-due_date", "-created_at")


class SchoolAdminPaymentTransactionViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated, IsSchoolAdmin]
    serializer_class = SchoolAdminPaymentTransactionSerializer

    def get_queryset(self):
        queryset = PaymentTransaction.objects.filter(
            tenant=self.request.user.tenant
        ).select_related("invoice", "invoice__student", "parent")

        invoice_id = self.request.query_params.get("invoice")
        payment_status = self.request.query_params.get("status")

        if invoice_id:
            queryset = queryset.filter(invoice_id=invoice_id)

        if payment_status:
            queryset = queryset.filter(status=payment_status)

        return queryset.order_by("-created_at")


class SchoolAdminTenantView(RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated, IsSchoolAdmin]
    serializer_class = SchoolAdminTenantSerializer

    def get_object(self):
        return self.request.user.tenant
