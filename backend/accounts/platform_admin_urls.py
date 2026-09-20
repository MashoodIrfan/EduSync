
from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .platform_admin_views import (
    PlatformAdminSchoolAdminViewSet,
    PlatformAdminTenantViewSet,
)


router = DefaultRouter()
router.register(
    "tenants",
    PlatformAdminTenantViewSet,
    basename="platform-admin-tenant",
)


school_admin_list = PlatformAdminSchoolAdminViewSet.as_view(
    {"get": "list", "post": "create"}
)

school_admin_detail = PlatformAdminSchoolAdminViewSet.as_view(
    {
        "get": "retrieve",
        "put": "update",
        "patch": "partial_update",
        "delete": "destroy",
    }
)


urlpatterns = [
    path(
        "tenants/<int:tenant_id>/school-admins/",
        school_admin_list,
        name="platform-admin-school-admin-list",
    ),

    path(
        "tenants/<int:tenant_id>/school-admins/<int:pk>/",
        school_admin_detail,
        name="platform-admin-school-admin-detail",
    ),

    path("", include(router.urls)),
]
