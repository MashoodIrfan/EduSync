from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


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
