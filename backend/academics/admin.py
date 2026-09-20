
from django.contrib import admin

from .models import (
    Class,
    Subject,
    Student,
    TeacherAssignment,
)


@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "section",
        "tenant",
        "created_at",
    )

    list_filter = (
        "tenant",
    )

    search_fields = (
        "name",
        "section",
    )


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code",
        "tenant",
        "created_at",
    )

    list_filter = (
        "tenant",
    )

    search_fields = (
        "name",
        "code",
    )


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = (
        "student_id",
        "first_name",
        "last_name",
        "class_room",
        "tenant",
        "created_at",
    )

    list_filter = (
        "tenant",
        "class_room",
    )

    search_fields = (
        "student_id",
        "first_name",
        "last_name",
    )
@admin.register(TeacherAssignment)
class TeacherAssignmentAdmin(admin.ModelAdmin):
    list_display = (
        "teacher",
        "class_room",
        "subject",
        "tenant",
        "created_at",
    )

    list_filter = (
        "tenant",
        "class_room",
        "subject",
    )

    search_fields = (
        "teacher__username",
        "teacher__first_name",
        "teacher__last_name",
        "class_room__name",
        "subject__name",
    )

