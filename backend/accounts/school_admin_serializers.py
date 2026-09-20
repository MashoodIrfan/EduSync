from django.contrib.auth.password_validation import validate_password

from rest_framework import serializers

from academics.models import Class, Student, Subject, TeacherAssignment

from .models import User


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
