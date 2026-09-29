from django.db import models


class AuditLog(models.Model):
    """
    Tracks privileged administrative and financial actions (account
    creation/deactivation, fee invoice changes, payment outcomes,
    tenant management) — not routine data entry like attendance
    marking, which is already fully traceable via its own records.

    actor uses SET_NULL (not CASCADE) and actor_label is denormalized
    so the audit trail survives the actor's account being deleted —
    that's the whole point of an audit log.
    """

    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="audit_logs",
    )

    actor = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )

    actor_label = models.CharField(max_length=150, blank=True)

    action = models.CharField(max_length=100)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=50, blank=True)
    object_repr = models.CharField(max_length=255, blank=True)

    changes = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.actor_label or 'system'} {self.action} {self.object_repr}"
