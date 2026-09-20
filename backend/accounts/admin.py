from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import ParentProfile, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):

    fieldsets = UserAdmin.fieldsets + (
        (
            "EduSync Information",
            {
                "fields": ("role", "tenant"),
            },
        ),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "EduSync Information",
            {
                "fields": ("role", "tenant"),
            },
        ),
    )


@admin.register(ParentProfile)
class ParentProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "student",
        "must_change_password",
        "created_at",
    )

    list_filter = (
        "must_change_password",
        "student__tenant",
    )

    search_fields = (
        "user__username",
        "user__first_name",
        "user__last_name",
        "student__first_name",
        "student__last_name",
        "student__student_id",
    )
