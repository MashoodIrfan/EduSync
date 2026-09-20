
from django.urls import path

from .views import (
    TeacherAssignmentsView,
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
]
