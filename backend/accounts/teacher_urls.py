
from django.urls import path

from .views import (
    TeacherAssignmentsView,
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
]
