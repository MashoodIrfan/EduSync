from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models


class User(AbstractUser):

    class Role(models.TextChoices):
        PLATFORM_ADMIN = "PLATFORM_ADMIN", "Platform Admin"
        SCHOOL_ADMIN = "SCHOOL_ADMIN", "School Admin"
        TEACHER = "TEACHER", "Teacher"
        PARENT = "PARENT", "Parent"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.PARENT,
    )

    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="users",
    )


class ParentProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="parent_profile",
    )

    student = models.ForeignKey(
        "academics.Student",
        on_delete=models.CASCADE,
        related_name="parent_profiles",
    )

    must_change_password = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.user.role != User.Role.PARENT:
            raise ValidationError(
                "ParentProfile can only belong to a parent user."
            )

        if self.user.tenant_id != self.student.tenant_id:
            raise ValidationError(
                "Parent and student must belong to the same school."
            )

    def __str__(self):
        return f"{self.user.username} → {self.student}"
