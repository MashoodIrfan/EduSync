from django.db import connection
from django.http import JsonResponse


def health_check(request):
    """
    Used by hosting platforms (Render) to know the service is actually
    ready, not just that the process started — a real query, not just
    a static 200, so a broken DB connection is caught too.
    """

    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        cursor.fetchone()

    return JsonResponse({"status": "ok"})
