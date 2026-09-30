
from django.core.exceptions import ImproperlyConfigured, ValidationError
from django.db import transaction

import stripe
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .gateways.stripe_gateway import StripeGateway
from .models import PaymentTransaction
from .services import (
    mark_payment_failed,
    mark_payment_success,
)


class StripeWebhookView(APIView):
    """
    Receives Stripe's server-to-server webhook events.

    Unlike a browser redirect (the old JazzCash return flow), nothing
    here ever comes from the customer's browser — Stripe calls this
    endpoint directly, so a failed signature check means the request
    isn't from Stripe at all. There is no legitimate-but-tampered case
    to fall back to, so an invalid signature is rejected outright
    without touching any transaction (unlike the old gateway, which had
    a VERIFICATION_REQUIRED fallback for exactly that in-between case).

    The actual payment state transition is delegated to
    payments.services so that idempotency remains centralized.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        gateway = StripeGateway()

        try:
            gateway.validate_configuration()
        except ImproperlyConfigured as exc:
            return Response(
                {"status": "error", "message": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        signature_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

        try:
            event = gateway.verify_webhook_event(request.body, signature_header)
        except (stripe.error.SignatureVerificationError, ValueError):
            return Response(
                {"status": "error", "message": "Invalid webhook signature."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event_type = event["type"]
        event_object = event["data"]["object"]

        if event_type == "checkout.session.completed":
            return self._handle_checkout_completed(gateway, event_object)

        if event_type == "checkout.session.expired":
            return self._handle_checkout_expired(event_object)

        # Every other event type is acknowledged but ignored — Stripe
        # sends many event categories we don't act on.
        return Response({"status": "ignored"}, status=status.HTTP_200_OK)

    def _handle_checkout_completed(self, gateway, session):
        transaction_id = getattr(session, "client_reference_id", "") or ""

        try:
            payment = (
                PaymentTransaction.objects
                .select_related("invoice")
                .get(transaction_id=transaction_id)
            )
        except PaymentTransaction.DoesNotExist:
            return Response(
                {"status": "error", "message": "Payment transaction was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if payment.gateway != PaymentTransaction.Gateway.STRIPE:
            return Response(
                {"status": "error", "message": "Invalid payment gateway."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expected_amount = gateway.format_amount(payment.amount)
        returned_amount = getattr(session, "amount_total", None)

        if returned_amount != expected_amount:
            return Response(
                {"status": "error", "message": "Payment amount does not match the invoice amount."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_intent_id = getattr(session, "payment_intent", "") or ""

        try:
            with transaction.atomic():
                payment_result = mark_payment_success(
                    payment.transaction_id,
                    gateway_reference=payment_intent_id,
                )
        except ValidationError as exc:
            return Response(
                {"status": "error", "message": str(exc)},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {
                "status": "success",
                "message": "Payment processed successfully.",
                "transaction_id": payment_result.transaction_id,
            },
            status=status.HTTP_200_OK,
        )

    def _handle_checkout_expired(self, session):
        transaction_id = getattr(session, "client_reference_id", "") or ""

        try:
            payment_result = mark_payment_failed(transaction_id)
        except PaymentTransaction.DoesNotExist:
            return Response(
                {"status": "error", "message": "Payment transaction was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "status": "failed",
                "message": "Checkout session expired.",
                "transaction_id": payment_result.transaction_id,
            },
            status=status.HTTP_200_OK,
        )
