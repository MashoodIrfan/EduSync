from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from academics.models import Class, Student, Subject

from .permissions import IsSchoolAdmin
from .school_admin_serializers import (
    SchoolAdminClassSerializer,
    SchoolAdminStudentSerializer,
    SchoolAdminSubjectSerializer,
)


class SchoolAdminClassViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSchoolAdmin]
    serializer_class = SchoolAdminClassSerializer

    def get_queryset(self):
        return Class.objects.filter(
            tenant=self.request.user.tenant
        ).order_by("name", "section")


class SchoolAdminSubjectViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSchoolAdmin]
    serializer_class = SchoolAdminSubjectSerializer

    def get_queryset(self):
        return Subject.objects.filter(
            tenant=self.request.user.tenant
        ).order_by("name")


class SchoolAdminStudentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSchoolAdmin]
    serializer_class = SchoolAdminStudentSerializer

    def get_queryset(self):
        queryset = Student.objects.filter(
            tenant=self.request.user.tenant
        ).select_related("class_room")

        class_room_id = self.request.query_params.get(
            "class_room"
        )

        if class_room_id:
            queryset = queryset.filter(
                class_room_id=class_room_id
            )

        return queryset.order_by("first_name", "last_name")
