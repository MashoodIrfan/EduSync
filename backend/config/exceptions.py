from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.views import exception_handler as drf_exception_handler


def custom_exception_handler(exc, context):
    """
    Model.full_clean() raises Django's ValidationError, which DRF's
    default handler does not understand and would otherwise let
    escape as an unhandled 500. Convert it into a proper DRF
    ValidationError so it comes back as a 400 with field-level detail.
    """
    if isinstance(exc, DjangoValidationError):
        if hasattr(exc, "message_dict"):
            detail = exc.message_dict
        else:
            detail = list(exc.messages)

        exc = DRFValidationError(detail)

    return drf_exception_handler(exc, context)
