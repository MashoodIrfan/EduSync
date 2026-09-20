from decimal import Decimal, InvalidOperation
import uuid

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from academics.models import TeacherAssignment
from attendance.models import AttendanceRecord, AttendanceRemark
from payments.models import FeeInvoice, PaymentTransaction
from payments.gateways import get_payment_gateway

from .permissions import CanUseParentPortal, IsParent, IsTeacher
from .serializers import (
    AttendanceRecordSerializer,
    AttendanceRemarkSerializer,
    FeeInvoiceSerializer,
    ParentChangePasswordSerializer,
    ParentProfileSerializer,
    PaymentTransactionSerializer,
    TeacherAssignmentSerializer,
)


class ParentMeView(APIView):
    permission_classes = [
        IsAuthenticated,
        IsParent,
    ]

    def get(self, request):
        profile = request.user.parent_profile

        serializer = ParentProfileSerializer(profile)

        return Response(serializer.data)


class ParentChangePasswordView(APIView):
    permission_classes = [
        IsAuthenticated,
        IsParent,
    ]

    def post(self, request):
        serializer = ParentChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)

        user = request.user

        user.set_password(
            serializer.validated_data["new_password"]
        )

        user.save(update_fields=["password"])

        profile = user.parent_profile
        profile.must_change_password = False
        profile.save(update_fields=["must_change_password"])

        return Response(
            {
                "message": "Password changed successfully.",
                "must_change_password": False,
            }
        )


class ParentAttendanceView(generics.ListAPIView):
    permission_classes = [
        IsAuthenticated,
        CanUseParentPortal,
    ]

    serializer_class = AttendanceRecordSerializer

    def get_queryset(self):
        profile = self.request.user.parent_profile
        student = profile.student

        return (
            AttendanceRecord.objects
            .filter(
                student=student,
                tenant=self.request.user.tenant,
            )
            .select_related(
                "subject",
                "teacher",
            )
            .order_by("-date", "-id")
        )


class ParentRemarksView(generics.ListAPIView):
    permission_classes = [
        IsAuthenticated,
        CanUseParentPortal,
    ]

    serializer_class = AttendanceRemarkSerializer

    def get_queryset(self):
        profile = self.request.user.parent_profile
        student = profile.student

        return (
            AttendanceRemark.objects
            .filter(
                attendance_record__student=student,
                attendance_record__tenant=self.request.user.tenant,
            )
            .select_related(
                "teacher",
                "attendance_record",
                "attendance_record__subject",
            )
            .order_by(
                "-attendance_record__date",
                "-created_at",
            )
        )


class ParentFeesView(generics.ListAPIView):
    permission_classes = [
        IsAuthenticated,
        CanUseParentPortal,
    ]

    serializer_class = FeeInvoiceSerializer

    def get_queryset(self):
        profile = self.request.user.parent_profile

        return (
            FeeInvoice.objects
            .filter(
                student=profile.student,
                tenant=self.request.user.tenant,
            )
            .prefetch_related("payment_transactions")
            .order_by("-due_date", "-created_at")
        )


class ParentPaymentHistoryView(generics.ListAPIView):
    permission_classes = [
        IsAuthenticated,
        CanUseParentPortal,
    ]

    serializer_class = PaymentTransactionSerializer

    def get_queryset(self):
        profile = self.request.user.parent_profile

        return (
            PaymentTransaction.objects
            .filter(
                parent=self.request.user,
                invoice__student=profile.student,
                tenant=self.request.user.tenant,
            )
            .select_related("invoice")
            .order_by("-created_at")
        )
class ParentInitiatePaymentView(APIView):
    permission_classes = [
        IsAuthenticated,
        CanUseParentPortal,
    ]

    def post(self, request):
        profile = request.user.parent_profile

        invoice_id = request.data.get("invoice_id")

        if not invoice_id:
            return Response(
                {
                    "detail": "invoice_id is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            invoice = FeeInvoice.objects.get(
                id=invoice_id,
                student=profile.student,
                tenant=request.user.tenant,
            )
        except FeeInvoice.DoesNotExist:
            return Response(
                {
                    "detail": "Invoice not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if invoice.status == FeeInvoice.Status.CANCELLED:
            return Response(
                {
                    "detail": "This invoice has been cancelled."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if invoice.status == FeeInvoice.Status.PAID:
            return Response(
                {
                    "detail": "This invoice has already been paid."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prevent multiple active payment attempts
        # for the same invoice.
        existing_transaction = (
            PaymentTransaction.objects
            .filter(
                invoice=invoice,
                parent=request.user,
                status__in=[
                    PaymentTransaction.Status.INITIATED,
                    PaymentTransaction.Status.PENDING,
                ],
            )
            .order_by("-created_at")
            .first()
        )

        if existing_transaction:
            transaction = existing_transaction
        else:
            transaction_id = (
                f"EDU{uuid.uuid4().hex[:17].upper()}"
            )

            transaction = (
                PaymentTransaction.objects.create(
                    tenant=request.user.tenant,
                    invoice=invoice,
                    parent=request.user,
                    transaction_id=transaction_id,
                    gateway=(
                        PaymentTransaction.Gateway.JAZZCASH
                    ),
                    amount=invoice.amount,
                    status=(
                        PaymentTransaction.Status.INITIATED
                    ),
                )
            )

        gateway = get_payment_gateway()

        try:
            payment_payload = (
                gateway.build_payment_payload(
                    transaction
                )
            )
        except Exception as exc:
            return Response(
                {
                    "detail": (
                        "JazzCash payment configuration "
                        "is not ready."
                    ),
                    "error": str(exc),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "transaction_id": transaction.transaction_id,
                "invoice_number": invoice.invoice_number,
                "amount": str(transaction.amount),
                "gateway": transaction.gateway,
                "status": transaction.status,
                "payment_url": gateway.payment_url,
                "form_fields": payment_payload,
            },
            status=status.HTTP_201_CREATED,
        )


# =============================================================
# TEACHER VIEWS
# =============================================================


class TeacherAssignmentsView(generics.ListAPIView):
    permission_classes = [
        IsAuthenticated,
        IsTeacher,
    ]

    serializer_class = TeacherAssignmentSerializer

    def get_queryset(self):
        return (
            TeacherAssignment.objects
            .filter(
                teacher=self.request.user,
                tenant=self.request.user.tenant,
            )
            .select_related(
                "class_room",
                "subject",
            )
            .order_by(
                "class_room__name",
                "class_room__section",
                "subject__name",
            )
        )
