
from django.contrib.auth.password_validation import validate_password

from rest_framework import serializers

from academics.models import (
    Student,
    TeacherAssignment,
)
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


# =========================================================
# TEACHER SERIALIZERS
# =========================================================


class TeacherAssignmentSerializer(
    serializers.ModelSerializer
):
    class_id = serializers.IntegerField(
        source="class_room.id",
        read_only=True,
    )

    class_name = serializers.SerializerMethodField()

    subject_id = serializers.IntegerField(
        source="subject.id",
        read_only=True,
    )

    subject_name = serializers.CharField(
        source="subject.name",
        read_only=True,
    )

    subject_code = serializers.CharField(
        source="subject.code",
        read_only=True,
    )

    class Meta:
        model = TeacherAssignment
        fields = (
            "id",
            "class_id",
            "class_name",
            "subject_id",
            "subject_name",
            "subject_code",
            "created_at",
        )

    def get_class_name(self, obj):
        return str(obj.class_room)


class TeacherStudentSerializer(
    serializers.ModelSerializer
):
    student_name = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = (
            "id",
            "student_id",
            "student_name",
            "class_name",
            "date_of_birth",
        )

    def get_student_name(self, obj):
        return (
            f"{obj.first_name} "
            f"{obj.last_name}"
        ).strip()

    def get_class_name(self, obj):
        return str(obj.class_room)


class TeacherAttendanceSerializer(
    serializers.ModelSerializer
):
    student_id = serializers.CharField(
        source="student.student_id",
        read_only=True,
    )

    student_name = serializers.SerializerMethodField()

    class_name = serializers.SerializerMethodField()

    subject_id = serializers.IntegerField(
        source="subject.id",
        read_only=True,
    )

    subject_name = serializers.CharField(
        source="subject.name",
        read_only=True,
    )

    teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceRecord
        fields = (
            "id",
            "student_id",
            "student_name",
            "class_name",
            "subject_id",
            "subject_name",
            "teacher_name",
            "date",
            "status",
            "created_at",
            "updated_at",
        )

    def get_student_name(self, obj):
        return (
            f"{obj.student.first_name} "
            f"{obj.student.last_name}"
        ).strip()

    def get_class_name(self, obj):
        return str(obj.class_room)

    def get_teacher_name(self, obj):
        return (
            obj.teacher.get_full_name()
            or obj.teacher.username
        )


class TeacherAttendanceCreateSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = AttendanceRecord
        fields = (
            "student",
            "class_room",
            "subject",
            "date",
            "status",
        )

    def validate(self, attrs):
        request = self.context.get("request")

        if not request:
            raise serializers.ValidationError(
                "Request context is required."
            )

        teacher = request.user

        if not teacher.is_authenticated:
            raise serializers.ValidationError(
                "Authentication is required."
            )

        if teacher.role != "TEACHER":
            raise serializers.ValidationError(
                "Only teachers can mark attendance."
            )

        tenant = teacher.tenant

        if tenant is None:
            raise serializers.ValidationError(
                "Teacher must belong to a school."
            )

        student = attrs["student"]
        class_room = attrs["class_room"]
        subject = attrs["subject"]

        # -------------------------------------------------
        # Tenant checks
        # -------------------------------------------------

        if student.tenant_id != tenant.id:
            raise serializers.ValidationError(
                {
                    "student": (
                        "Student does not belong "
                        "to your school."
                    )
                }
            )

        if class_room.tenant_id != tenant.id:
            raise serializers.ValidationError(
                {
                    "class_room": (
                        "Class does not belong "
                        "to your school."
                    )
                }
            )

        if subject.tenant_id != tenant.id:
            raise serializers.ValidationError(
                {
                    "subject": (
                        "Subject does not belong "
                        "to your school."
                    )
                }
            )

        # -------------------------------------------------
        # Student must belong to selected class
        # -------------------------------------------------

        if student.class_room_id != class_room.id:
            raise serializers.ValidationError(
                {
                    "student": (
                        "Student is not enrolled "
                        "in the selected class."
                    )
                }
            )

        # -------------------------------------------------
        # Teacher must actually be assigned to the
        # selected class + subject.
        # -------------------------------------------------

        assignment_exists = (
            TeacherAssignment.objects.filter(
                teacher=teacher,
                tenant=tenant,
                class_room=class_room,
                subject=subject,
            ).exists()
        )

        if not assignment_exists:
            raise serializers.ValidationError(
                {
                    "subject": (
                        "You are not assigned "
                        "to this class and subject."
                    )
                }
            )

        # -------------------------------------------------
        # Prevent duplicate attendance for the same
        # student/class/subject/date.
        # -------------------------------------------------

        duplicate_exists = (
            AttendanceRecord.objects.filter(
                student=student,
                class_room=class_room,
                subject=subject,
                date=attrs["date"],
            ).exists()
        )

        if duplicate_exists:
            raise serializers.ValidationError(
                {
                    "date": (
                        "Attendance already exists "
                        "for this student, class, "
                        "subject, and date."
                    )
                }
            )

        return attrs

    def create(self, validated_data):
        request = self.context["request"]

        attendance = AttendanceRecord(
            tenant=request.user.tenant,
            teacher=request.user,
            **validated_data,
        )

        # Run the model-level validation as well.
        attendance.full_clean()

        attendance.save()

        return attendance


class TeacherAttendanceRemarkSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = AttendanceRemark
        fields = (
            "attendance_record",
            "remark",
        )

    def validate(self, attrs):
        request = self.context.get("request")

        if not request:
            raise serializers.ValidationError(
                "Request context is required."
            )

        teacher = request.user

        if not teacher.is_authenticated:
            raise serializers.ValidationError(
                "Authentication is required."
            )

        if teacher.role != "TEACHER":
            raise serializers.ValidationError(
                "Only teachers can add attendance remarks."
            )

        attendance_record = (
            attrs["attendance_record"]
        )

        # Tenant isolation.
        if (
            attendance_record.tenant_id
            != teacher.tenant_id
        ):
            raise serializers.ValidationError(
                {
                    "attendance_record": (
                        "Attendance record does not "
                        "belong to your school."
                    )
                }
            )

        # Only the teacher who marked attendance can
        # add the remark.
        if (
            attendance_record.teacher_id
            != teacher.id
        ):
            raise serializers.ValidationError(
                {
                    "attendance_record": (
                        "You can only add remarks "
                        "to attendance you marked."
                    )
                }
            )

        return attrs

    def create(self, validated_data):
        request = self.context["request"]

        remark = AttendanceRemark(
            teacher=request.user,
            **validated_data,
        )

        remark.full_clean()
        remark.save()

        return remark
