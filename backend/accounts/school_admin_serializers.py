import uuid

from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils.crypto import get_random_string

from rest_framework import serializers

from academics.models import Class, Student, Subject, TeacherAssignment
from payments.models import FeeInvoice, PaymentTransaction
from tenants.models import Tenant

from .models import ParentProfile, User


def _check_same_tenant(value, request, label):
    if value.tenant_id != request.user.tenant_id:
        raise serializers.ValidationError(
            f"{label} does not belong to your school."
        )

    return value


# =============================================================
# CLASSES / SUBJECTS
# =============================================================


class SchoolAdminClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = Class
        fields = (
            "id",
            "name",
            "section",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def create(self, validated_data):
        request = self.context["request"]

        class_room = Class(
            tenant=request.user.tenant,
            **validated_data,
        )
        class_room.full_clean()
        class_room.save()

        return class_room

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.full_clean()
        instance.save()

        return instance


class SchoolAdminSubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = (
            "id",
            "name",
            "code",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def create(self, validated_data):
        request = self.context["request"]

        subject = Subject(
            tenant=request.user.tenant,
            **validated_data,
        )
        subject.full_clean()
        subject.save()

        return subject

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.full_clean()
        instance.save()

        return instance


# =============================================================
# TEACHER ACCOUNTS
# =============================================================


class SchoolAdminTeacherSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        validators=[validate_password],
    )

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "password",
            "is_active",
            "date_joined",
        )
        read_only_fields = ("id", "date_joined")

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError(
                {"password": "This field is required."}
            )

        return attrs

    def create(self, validated_data):
        request = self.context["request"]

        password = validated_data.pop("password")

        # New accounts are always active; DRF's BooleanField treats
        # a missing "is_active" in multipart/HTML-style input as an
        # unchecked checkbox (False) rather than falling back to the
        # model default, so an omitted field would otherwise create
        # a pre-disabled login. Deactivation is a PATCH, not a
        # creation-time concern.
        validated_data.pop("is_active", None)

        teacher = User(
            role=User.Role.TEACHER,
            tenant=request.user.tenant,
            is_active=True,
            **validated_data,
        )
        teacher.set_password(password)
        teacher.full_clean(exclude=["password"])
        teacher.save()

        return teacher

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.full_clean(exclude=["password"])
        instance.save()

        return instance


# =============================================================
# TEACHER ASSIGNMENTS
# =============================================================


class SchoolAdminTeacherAssignmentSerializer(
    serializers.ModelSerializer
):
    teacher_name = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()
    subject_name = serializers.CharField(
        source="subject.name", read_only=True
    )

    class Meta:
        model = TeacherAssignment
        fields = (
            "id",
            "teacher",
            "teacher_name",
            "class_room",
            "class_name",
            "subject",
            "subject_name",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    def get_teacher_name(self, obj):
        return obj.teacher.get_full_name() or obj.teacher.username

    def get_class_name(self, obj):
        return str(obj.class_room)

    def validate_teacher(self, value):
        request = self.context["request"]

        if value.role != User.Role.TEACHER:
            raise serializers.ValidationError(
                "Selected user is not a teacher."
            )

        return _check_same_tenant(value, request, "Teacher")

    def validate_class_room(self, value):
        return _check_same_tenant(
            value, self.context["request"], "Class"
        )

    def validate_subject(self, value):
        return _check_same_tenant(
            value, self.context["request"], "Subject"
        )

    def create(self, validated_data):
        request = self.context["request"]

        assignment = TeacherAssignment(
            tenant=request.user.tenant,
            **validated_data,
        )
        assignment.full_clean()
        assignment.save()

        return assignment


# =============================================================
# PARENT ACCOUNTS
# =============================================================


class SchoolAdminParentListSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source="user.username", read_only=True
    )
    first_name = serializers.CharField(
        source="user.first_name", read_only=True
    )
    last_name = serializers.CharField(
        source="user.last_name", read_only=True
    )
    email = serializers.EmailField(
        source="user.email", read_only=True
    )
    student_id = serializers.CharField(
        source="student.student_id", read_only=True
    )
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = ParentProfile
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "student_id",
            "student_name",
            "must_change_password",
            "created_at",
        )

    def get_student_name(self, obj):
        return (
            f"{obj.student.first_name} "
            f"{obj.student.last_name}"
        ).strip()


class SchoolAdminParentCreateSerializer(serializers.Serializer):
    username = serializers.CharField()
    first_name = serializers.CharField(
        required=False, allow_blank=True
    )
    last_name = serializers.CharField(
        required=False, allow_blank=True
    )
    email = serializers.EmailField(
        required=False, allow_blank=True
    )
    student = serializers.PrimaryKeyRelatedField(
        queryset=Student.objects.all()
    )
    password = serializers.CharField(
        required=False, write_only=True
    )

    def validate_student(self, value):
        return _check_same_tenant(
            value, self.context["request"], "Student"
        )

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError(
                "This username is already taken."
            )

        return value

    def create(self, validated_data):
        request = self.context["request"]
        student = validated_data["student"]
        password = (
            validated_data.get("password")
            or get_random_string(10)
        )

        with transaction.atomic():
            parent_user = User(
                username=validated_data["username"],
                first_name=validated_data.get(
                    "first_name", ""
                ),
                last_name=validated_data.get(
                    "last_name", ""
                ),
                email=validated_data.get("email", ""),
                role=User.Role.PARENT,
                tenant=request.user.tenant,
            )
            parent_user.set_password(password)
            parent_user.full_clean(exclude=["password"])
            parent_user.save()

            profile = ParentProfile(
                user=parent_user,
                student=student,
                must_change_password=True,
            )
            profile.full_clean()
            profile.save()

        profile._temporary_password = password

        return profile

    def to_representation(self, instance):
        return {
            "id": instance.id,
            "username": instance.user.username,
            "student_id": instance.student.student_id,
            "student_name": (
                f"{instance.student.first_name} "
                f"{instance.student.last_name}"
            ).strip(),
            "must_change_password": instance.must_change_password,
            "temporary_password": getattr(
                instance, "_temporary_password", None
            ),
        }


# =============================================================
# STUDENTS
# =============================================================


class SchoolAdminStudentSerializer(serializers.ModelSerializer):
    class_name = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = (
            "id",
            "student_id",
            "first_name",
            "last_name",
            "date_of_birth",
            "class_room",
            "class_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def get_class_name(self, obj):
        return str(obj.class_room)

    def validate_class_room(self, value):
        return _check_same_tenant(
            value, self.context["request"], "Class"
        )

    def create(self, validated_data):
        request = self.context["request"]

        student = Student(
            tenant=request.user.tenant,
            **validated_data,
        )
        student.full_clean()
        student.save()

        return student

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.full_clean()
        instance.save()

        return instance


# =============================================================
# FEE INVOICES
# =============================================================


class SchoolAdminFeeInvoiceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = FeeInvoice
        fields = (
            "id",
            "invoice_number",
            "student",
            "student_name",
            "description",
            "amount",
            "due_date",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "invoice_number",
            "created_at",
            "updated_at",
        )

    def get_student_name(self, obj):
        return (
            f"{obj.student.first_name} "
            f"{obj.student.last_name}"
        ).strip()

    def validate_student(self, value):
        return _check_same_tenant(
            value, self.context["request"], "Student"
        )

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Amount must be greater than zero."
            )

        return value

    def validate_status(self, value):
        # PAID is a server-driven outcome of a successful payment
        # (see payments/services.py::mark_payment_success). Admins
        # may cancel or reopen an invoice, but must never be able
        # to forge a paid status by hand.
        if value == FeeInvoice.Status.PAID:
            raise serializers.ValidationError(
                "Invoice status cannot be set to PAID manually. "
                "It is set automatically when a payment succeeds."
            )

        return value

    def create(self, validated_data):
        request = self.context["request"]

        invoice = FeeInvoice(
            tenant=request.user.tenant,
            invoice_number=(
                f"INV{uuid.uuid4().hex[:12].upper()}"
            ),
            **validated_data,
        )
        invoice.full_clean()
        invoice.save()

        return invoice

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.full_clean()
        instance.save()

        return instance


# =============================================================
# PAYMENTS (READ-ONLY)
# =============================================================


class SchoolAdminPaymentTransactionSerializer(
    serializers.ModelSerializer
):
    invoice_number = serializers.CharField(
        source="invoice.invoice_number", read_only=True
    )
    parent_username = serializers.CharField(
        source="parent.username", read_only=True
    )
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = PaymentTransaction
        fields = (
            "id",
            "transaction_id",
            "invoice_number",
            "student_name",
            "parent_username",
            "gateway",
            "amount",
            "status",
            "gateway_reference",
            "created_at",
            "updated_at",
        )

    def get_student_name(self, obj):
        student = obj.invoice.student

        return (
            f"{student.first_name} "
            f"{student.last_name}"
        ).strip()


# =============================================================
# SCHOOL SETUP
# =============================================================


class SchoolAdminTenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = (
            "id",
            "name",
            "slug",
            "email",
            "phone",
            "address",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "slug",
            "created_at",
            "updated_at",
        )
