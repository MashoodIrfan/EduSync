
from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .school_admin_views import (
    SchoolAdminClassViewSet,
    SchoolAdminFeeInvoiceViewSet,
    SchoolAdminParentViewSet,
    SchoolAdminPaymentTransactionViewSet,
    SchoolAdminStudentViewSet,
    SchoolAdminSubjectViewSet,
    SchoolAdminTeacherAssignmentViewSet,
    SchoolAdminTeacherViewSet,
    SchoolAdminTenantView,
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
router.register("parents", SchoolAdminParentViewSet, basename="school-admin-parent")
router.register(
    "fee-invoices",
    SchoolAdminFeeInvoiceViewSet,
    basename="school-admin-fee-invoice",
)
router.register(
    "payments",
    SchoolAdminPaymentTransactionViewSet,
    basename="school-admin-payment",
)


urlpatterns = [
    path(
        "school/",
        SchoolAdminTenantView.as_view(),
        name="school-admin-school-setup",
    ),

    path("", include(router.urls)),
]
