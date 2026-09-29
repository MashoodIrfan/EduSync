from .models import AuditLog


def log_action(action, instance, *, tenant=None, actor=None, changes=None):
    """
    Records one audit entry. Called explicitly at the specific point
    a sensitive action happens (not via signals) so the caller
    controls exactly what "changes" means for that action — and so
    a temporary password never accidentally ends up in `changes`.
    """

    AuditLog.objects.create(
        tenant=tenant,
        actor=actor,
        actor_label=(actor.get_full_name() or actor.username) if actor else "system",
        action=action,
        model_name=instance.__class__.__name__,
        object_id=str(instance.pk),
        object_repr=str(instance)[:255],
        changes=changes or {},
    )


def log_action_for_request(request, action, instance, changes=None, tenant=None):
    user = request.user if getattr(request, "user", None) and request.user.is_authenticated else None

    log_action(
        action,
        instance,
        tenant=tenant or (user.tenant if user else getattr(instance, "tenant", None)),
        actor=user,
        changes=changes,
    )
