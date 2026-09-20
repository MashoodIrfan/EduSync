
from django.contrib.auth.password_validation import validate_password

from rest_framework import serializers

from attendance.models import (
    AttendanceRecord,
    AttendanceRemark,
)
from payments.models import (
    FeeInvoice,
    PaymentTransaction,
)

from .models import ParentProfile


class ParentProfileSerializer(serializers.ModelSerializer):
    student_id = serializers.CharField(
        source="student.student_id",
        read_only=True,
    )

    student_name = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()

    class Meta:
        model = ParentProfile
        fields = (
            "student_id",
            "student_name",
            "class_name",
            "must_change_password",
        )

    def get_student_name(self, obj):
        return (
            f"{obj.student.first_name} "
            f"{obj.student.last_name}"
        ).strip()

    def get_class_name(self, obj):
        return str(obj.student.class_room)


class AttendanceRecordSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(
        source="subject.name",
        read_only=True,
    )

    teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceRecord
        fields = (
            "id",
            "subject_name",
            "teacher_name",
            "date",
            "status",
        )

    def get_teacher_name(self, obj):
        return (
            obj.teacher.get_full_name()
            or obj.teacher.username
        )


class AttendanceRemarkSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()

    date = serializers.DateField(
        source="attendance_record.date",
        read_only=True,
    )

    subject_name = serializers.CharField(
        source="attendance_record.subject.name",
        read_only=True,
    )

    class Meta:
        model = AttendanceRemark
        fields = (
            "id",
            "subject_name",
            "teacher_name",
            "date",
            "remark",
            "created_at",
        )

    def get_teacher_name(self, obj):
        return (
            obj.teacher.get_full_name()
            or obj.teacher.username
        )


class FeeInvoiceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()

    class Meta:
        model = FeeInvoice
        fields = (
            "id",
            "invoice_number",
            "student_name",
            "description",
            "amount",
            "due_date",
            "status",
            "remaining_amount",
            "created_at",
        )

    def get_student_name(self, obj):
        return (
            f"{obj.student.first_name} "
            f"{obj.student.last_name}"
        ).strip()

    def get_remaining_amount(self, obj):
        successful_payments = (
            obj.payment_transactions.filter(
                status=PaymentTransaction.Status.SUCCESS
            )
        )

        paid_amount = sum(
            payment.amount
            for payment in successful_payments
        )

        return obj.amount - paid_amount


class PaymentTransactionSerializer(
    serializers.ModelSerializer
):
    invoice_number = serializers.CharField(
        source="invoice.invoice_number",
        read_only=True,
    )

    class Meta:
        model = PaymentTransaction
        fields = (
            "id",
            "transaction_id",
            "invoice_number",
            "gateway",
            "amount",
            "status",
            "gateway_reference",
            "created_at",
            "updated_at",
        )


class ParentChangePasswordSerializer(
    serializers.Serializer
):
    old_password = serializers.CharField(
        write_only=True,
        required=True,
    )

    new_password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
    )

    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
    )

    def validate(self, attrs):
        if (
            attrs["new_password"]
            != attrs["confirm_password"]
        ):
            raise serializers.ValidationError(
                {
                    "confirm_password": (
                        "Passwords do not match."
                    )
                }
            )

        if not self.context["request"].user.check_password(
            attrs["old_password"]
        ):
            raise serializers.ValidationError(
                {
                    "old_password": (
                        "Current password is incorrect."
                    )
                }
            )

        return attrs
