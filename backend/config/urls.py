
from django.contrib import admin
from django.urls import include, path

from rest_framework_simplejwt.views import TokenRefreshView

from accounts.jwt_views import EduSyncTokenObtainPairView


urlpatterns = [
    path(
        "admin/",
        admin.site.urls,
    ),

    path(
        "api/token/",
        EduSyncTokenObtainPairView.as_view(),
        name="token-obtain-pair",
    ),

    path(
        "api/token/refresh/",
        TokenRefreshView.as_view(),
        name="token-refresh",
    ),

    path(
        "api/parent/",
        include("accounts.urls"),
    ),

    path(
        "api/teacher/",
        include("accounts.teacher_urls"),
    ),

    path(
        "api/school-admin/",
        include("accounts.school_admin_urls"),
    ),

    path(
        "api/platform-admin/",
        include("accounts.platform_admin_urls"),
    ),

    path(
        "api/payments/",
        include("payments.urls"),
    ),
]
