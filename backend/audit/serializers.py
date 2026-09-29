from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source="tenant.name", read_only=True, default="")

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "school_name",
            "actor_label",
            "action",
            "model_name",
            "object_repr",
            "changes",
            "created_at",
        )
