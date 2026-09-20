
from django.urls import path

from .views import (
    ParentAttendanceView,
    ParentChangePasswordView,
    ParentFeesView,
    ParentInitiatePaymentView,
    ParentMeView,
    ParentPaymentHistoryView,
    ParentRemarksView,
)


urlpatterns = [
    path(
        "me/",
        ParentMeView.as_view(),
        name="parent-me",
    ),

    path(
        "change-password/",
        ParentChangePasswordView.as_view(),
        name="parent-change-password",
    ),

    path(
        "attendance/",
        ParentAttendanceView.as_view(),
        name="parent-attendance",
    ),

    path(
        "remarks/",
        ParentRemarksView.as_view(),
        name="parent-remarks",
    ),

    path(
        "fees/",
        ParentFeesView.as_view(),
        name="parent-fees",
    ),

    path(
        "payments/",
        ParentPaymentHistoryView.as_view(),
        name="parent-payment-history",
    ),

    path(
        "payments/initiate/",
        ParentInitiatePaymentView.as_view(),
        name="parent-initiate-payment",
    ),
]
