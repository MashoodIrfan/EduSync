
from django.urls import path

from .views import (
    TeacherAssignmentsView,
    TeacherAttendanceRemarkView,
    TeacherAttendanceView,
    TeacherClassStudentsView,
)


urlpatterns = [
    path(
        "assignments/",
        TeacherAssignmentsView.as_view(),
        name="teacher-assignments",
    ),

    path(
        "classes/<int:class_id>/students/",
        TeacherClassStudentsView.as_view(),
        name="teacher-class-students",
    ),

    path(
        "attendance/",
        TeacherAttendanceView.as_view(),
        name="teacher-attendance",
    ),

    path(
        "attendance/<int:attendance_id>/remark/",
        TeacherAttendanceRemarkView.as_view(),
        name="teacher-attendance-remark",
    ),
]
