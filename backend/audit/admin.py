from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "tenant",
        "actor_label",
        "action",
        "model_name",
        "object_repr",
    )

    list_filter = (
        "tenant",
        "action",
        "model_name",
    )

    search_fields = (
        "actor_label",
        "object_repr",
        "action",
    )

    readonly_fields = [field.name for field in AuditLog._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
