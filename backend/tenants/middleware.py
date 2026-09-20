from django.db import connection, transaction

from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken


# Endpoints that legitimately need to run before (or without) tenant
# context: authentication itself is a global lookup by username, the
# JazzCash callback authenticates itself via secure hash instead of a
# JWT, and Django admin/static assets are handled via the superuser
# check below.
BYPASS_PATH_PREFIXES = (
    "/api/token/",
    "/api/payments/jazzcash/return/",
    "/admin/",
    "/static/",
)


class TenantContextMiddleware:
    """
    Sets PostgreSQL session variables (app.current_tenant_id,
    app.bypass_rls) so Row-Level Security policies can enforce tenant
    isolation at the database layer — a second line of defense behind
    the view/serializer-level tenant checks that already exist.

    Must sit AFTER AuthenticationMiddleware in MIDDLEWARE, so
    request.user is already resolved for session-authenticated
    requests (Django admin). For JWT-authenticated API requests,
    request.user isn't resolved until DRF's view dispatch runs deep
    inside get_response(), so the access token is decoded here
    instead — its signature is verified, so the tenant_id/role claims
    it carries can be trusted.

    Wraps the rest of the request in one DB transaction because
    PostgreSQL's SET LOCAL only holds for the current transaction.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        with transaction.atomic():
            self._apply_tenant_context(request)
            response = self.get_response(request)

        return response

    def _apply_tenant_context(self, request):
        bypass, tenant_id = self._resolve_context(request)

        # PostgreSQL's SET/SET LOCAL does not support bind
        # parameters, so these values must be interpolated directly.
        # This is safe only because both are strictly constrained
        # right above: `bypass` is always the literal "true"/"false",
        # and `tenant_id` is always either None or a real int (a
        # signature-verified JWT claim, or request.user.tenant_id
        # straight from the ORM) — never raw user input.
        bypass_sql = "true" if bypass else "false"
        tenant_sql = str(int(tenant_id)) if tenant_id is not None else ""

        with connection.cursor() as cursor:
            cursor.execute(f"SET LOCAL app.bypass_rls = '{bypass_sql}'")
            cursor.execute(f"SET LOCAL app.current_tenant_id = '{tenant_sql}'")

    def _resolve_context(self, request):
        if request.path.startswith(BYPASS_PATH_PREFIXES):
            return True, None

        session_user = getattr(request, "user", None)

        if session_user is not None and session_user.is_authenticated:
            # Session-authenticated (Django admin).
            if session_user.is_superuser:
                return True, None

            return False, session_user.tenant_id

        # JWT-authenticated API request: decode it ourselves since
        # DRF hasn't resolved request.user yet at this point.
        token = self._extract_bearer_token(request)

        if not token:
            return False, None

        try:
            access_token = AccessToken(token)
        except TokenError:
            return False, None

        if access_token.get("role") == "PLATFORM_ADMIN":
            return True, None

        return False, access_token.get("tenant_id")

    @staticmethod
    def _extract_bearer_token(request):
        header = request.META.get("HTTP_AUTHORIZATION", "")

        if header.startswith("Bearer "):
            return header[len("Bearer ") :]

        return None
