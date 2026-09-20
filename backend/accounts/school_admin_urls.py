
from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .school_admin_views import (
    SchoolAdminClassViewSet,
    SchoolAdminStudentViewSet,
    SchoolAdminSubjectViewSet,
    SchoolAdminTeacherAssignmentViewSet,
    SchoolAdminTeacherViewSet,
)


router = DefaultRouter()
router.register("classes", SchoolAdminClassViewSet, basename="school-admin-class")
router.register("subjects", SchoolAdminSubjectViewSet, basename="school-admin-subject")
router.register("students", SchoolAdminStudentViewSet, basename="school-admin-student")
router.register("teachers", SchoolAdminTeacherViewSet, basename="school-admin-teacher")
router.register(
    "teacher-assignments",
    SchoolAdminTeacherAssignmentViewSet,
    basename="school-admin-teacher-assignment",
)


urlpatterns = [
    path("", include(router.urls)),
]
