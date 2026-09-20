from academics.models import Class, Student, Subject

from rest_framework import serializers


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
