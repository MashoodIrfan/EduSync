
from rest_framework.permissions import BasePermission


class IsParent(BasePermission):
    message = "Only parent accounts can access this resource."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "PARENT"
        )


class CanUseParentPortal(BasePermission):
    message = (
        "Please change your temporary password "
        "before using the parent portal."
    )

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.user.role != "PARENT":
            return False

        try:
            profile = request.user.parent_profile
        except request.user.__class__.parent_profile.RelatedObjectDoesNotExist:
            return False

        return not profile.must_change_password


class IsTeacher(BasePermission):
    message = "Only teacher accounts can access this resource."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "TEACHER"
        )


class IsSchoolAdmin(BasePermission):
    message = "Only school admin accounts can access this resource."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "SCHOOL_ADMIN"
            and request.user.tenant_id is not None
        )
