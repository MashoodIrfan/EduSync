from django.contrib import admin

from .models import AttendanceRecord, AttendanceRemark


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = (
        "student",
        "class_room",
        "subject",
        "teacher",
        "date",
        "status",
        "tenant",
    )

    list_filter = (
        "tenant",
        "class_room",
        "subject",
        "status",
        "date",
    )

    search_fields = (
        "student__first_name",
        "student__last_name",
        "student__student_id",
        "teacher__username",
    )


@admin.register(AttendanceRemark)
class AttendanceRemarkAdmin(admin.ModelAdmin):
    list_display = (
        "attendance_record",
        "teacher",
        "created_at",
    )

    search_fields = (
        "attendance_record__student__first_name",
        "attendance_record__student__last_name",
        "remark",
    )