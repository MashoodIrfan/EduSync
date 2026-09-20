from django.shortcuts import get_object_or_404

from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from tenants.models import Tenant

from .models import User
from .permissions import IsPlatformAdmin
from .platform_admin_serializers import (
    PlatformAdminSchoolAdminSerializer,
    PlatformAdminTenantSerializer,
)


class PlatformAdminTenantViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    No destroy action: deleting a Tenant cascades to every User,
    Class, Subject, Student, TeacherAssignment, AttendanceRecord,
    FeeInvoice and PaymentTransaction that belongs to it. That kind
    of whole-school wipe needs a deliberate, guarded workflow, not a
    plain DELETE call.
    """

    permission_classes = [IsAuthenticated, IsPlatformAdmin]
    serializer_class = PlatformAdminTenantSerializer
    queryset = Tenant.objects.all().order_by("name")


class PlatformAdminSchoolAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]
    serializer_class = PlatformAdminSchoolAdminSerializer

    def get_tenant(self):
        return get_object_or_404(
            Tenant, pk=self.kwargs["tenant_id"]
        )

    def get_queryset(self):
        return User.objects.filter(
            role=User.Role.SCHOOL_ADMIN,
            tenant_id=self.kwargs["tenant_id"],
        ).order_by("first_name", "last_name")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["tenant"] = self.get_tenant()

        return context
