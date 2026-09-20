
from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .school_admin_views import (
    SchoolAdminClassViewSet,
    SchoolAdminStudentViewSet,
    SchoolAdminSubjectViewSet,
)


router = DefaultRouter()
router.register("classes", SchoolAdminClassViewSet, basename="school-admin-class")
router.register("subjects", SchoolAdminSubjectViewSet, basename="school-admin-subject")
router.register("students", SchoolAdminStudentViewSet, basename="school-admin-student")


urlpatterns = [
    path("", include(router.urls)),
]
