
from django.core.exceptions import ValidationError
from django.db import models


class Class(models.Model):
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="classes",
    )

    name = models.CharField(max_length=100)
    section = models.CharField(
        max_length=50,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        if self.section:
            return f"{self.name} - {self.section}"

        return self.name


class Subject(models.Model):
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="subjects",
    )

    name = models.CharField(max_length=100)

    code = models.CharField(
        max_length=30,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.name


class Student(models.Model):
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="students",
    )

    student_id = models.CharField(
        max_length=50
    )

    first_name = models.CharField(
        max_length=100
    )

    last_name = models.CharField(
        max_length=100,
        blank=True,
    )

    date_of_birth = models.DateField(
        null=True,
        blank=True,
    )

    class_room = models.ForeignKey(
        Class,
        on_delete=models.PROTECT,
        related_name="students",
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def clean(self):
        if (
            self.class_room.tenant_id
            != self.tenant_id
        ):
            raise ValidationError(
                "Student and Class must belong "
                "to the same school."
            )

    def __str__(self):
        return (
            f"{self.first_name} "
            f"{self.last_name}"
        ).strip()


class TeacherAssignment(models.Model):
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="teacher_assignments",
    )

    teacher = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="teaching_assignments",
    )

    class_room = models.ForeignKey(
        Class,
        on_delete=models.CASCADE,
        related_name="teacher_assignments",
    )

    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="teacher_assignments",
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=(
                    "teacher",
                    "class_room",
                    "subject",
                ),
                name="unique_teacher_class_subject",
            )
        ]

    def clean(self):
        if self.teacher.role != "TEACHER":
            raise ValidationError(
                "Only users with the Teacher role "
                "can be assigned."
            )

        if (
            self.teacher.tenant_id
            != self.tenant_id
        ):
            raise ValidationError(
                "Teacher and assignment must belong "
                "to the same school."
            )

        if (
            self.class_room.tenant_id
            != self.tenant_id
        ):
            raise ValidationError(
                "Class and assignment must belong "
                "to the same school."
            )

        if (
            self.subject.tenant_id
            != self.tenant_id
        ):
            raise ValidationError(
                "Subject and assignment must belong "
                "to the same school."
            )

    def __str__(self):
        return (
            f"{self.teacher.username} - "
            f"{self.class_room} - "
            f"{self.subject}"
        )

