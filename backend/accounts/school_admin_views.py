from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from academics.models import Class, Student, Subject, TeacherAssignment

from .models import User
from .permissions import IsSchoolAdmin
from .school_admin_serializers import (
    SchoolAdminClassSerializer,
    SchoolAdminStudentSerializer,
    SchoolAdminSubjectSerializer,
    SchoolAdminTeacherAssignmentSerializer,
    SchoolAdminTeacherSerializer,
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


class SchoolAdminTeacherViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    Teacher accounts are never hard-deleted here: their
    TeacherAssignment / AttendanceRecord / AttendanceRemark rows
    cascade-delete with the User, which would silently erase other
    students' attendance history. Use PATCH is_active=false instead.
    """

    permission_classes = [IsAuthenticated, IsSchoolAdmin]
    serializer_class = SchoolAdminTeacherSerializer

    def get_queryset(self):
        return User.objects.filter(
            role=User.Role.TEACHER,
            tenant=self.request.user.tenant,
        ).order_by("first_name", "last_name")


class SchoolAdminTeacherAssignmentViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated, IsSchoolAdmin]
    serializer_class = SchoolAdminTeacherAssignmentSerializer

    def get_queryset(self):
        return (
            TeacherAssignment.objects
            .filter(tenant=self.request.user.tenant)
            .select_related("teacher", "class_room", "subject")
            .order_by(
                "class_room__name",
                "class_room__section",
                "subject__name",
            )
        )
