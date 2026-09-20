
from django.urls import path

from .views import TeacherAssignmentsView


urlpatterns = [
    path(
        "assignments/",
        TeacherAssignmentsView.as_view(),
        name="teacher-assignments",
    ),
]
