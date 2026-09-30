from decimal import Decimal, ROUND_HALF_UP

import stripe
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


class StripeGateway:
    name = "STRIPE"

    def __init__(self):
        self.secret_key = settings.STRIPE_SECRET_KEY
        self.publishable_key = settings.STRIPE_PUBLISHABLE_KEY
        self.webhook_secret = settings.STRIPE_WEBHOOK_SECRET
        self.frontend_url = settings.FRONTEND_URL

    def validate_configuration(self):
        missing = []

        if not self.secret_key:
            missing.append("STRIPE_SECRET_KEY")

        if not self.webhook_secret:
            missing.append("STRIPE_WEBHOOK_SECRET")

        if missing:
            raise ImproperlyConfigured(
                "Missing Stripe configuration: " + ", ".join(missing)
            )

    @staticmethod
    def format_amount(amount):
        """
        Convert a PKR amount into Stripe's minor-unit integer format.

        PKR is a 2-decimal-place currency for Stripe, same as USD:
            15000.00 -> 1500000
        """

        amount = Decimal(amount)

        amount_in_minor_units = (amount * Decimal("100")).quantize(
            Decimal("1"), rounding=ROUND_HALF_UP
        )

        return int(amount_in_minor_units)

    def create_checkout_session(self, payment_transaction):
        """
        Create a Stripe Checkout Session for the full invoice amount.

        The amount is always derived from the invoice server-side
        (never from the client), matching the "no partial payments"
        rule enforced everywhere else in the payment flow.
        """

        self.validate_configuration()

        invoice = payment_transaction.invoice

        return stripe.checkout.Session.create(
            api_key=self.secret_key,
            mode="payment",
            client_reference_id=payment_transaction.transaction_id,
            metadata={"transaction_id": payment_transaction.transaction_id},
            line_items=[
                {
                    "price_data": {
                        "currency": "pkr",
                        "unit_amount": self.format_amount(payment_transaction.amount),
                        "product_data": {
                            "name": f"EduSync fee payment {invoice.invoice_number}",
                            "description": invoice.description,
                        },
                    },
                    "quantity": 1,
                }
            ],
            success_url=f"{self.frontend_url}/parent/fees?payment=success",
            cancel_url=f"{self.frontend_url}/parent/fees?payment=cancelled",
        )

    def verify_webhook_event(self, payload, signature_header):
        """
        Verify and decode an incoming Stripe webhook.

        Raises stripe.error.SignatureVerificationError (or ValueError
        for a malformed payload) if the signature doesn't check out —
        callers must treat that as an untrusted request and reject it
        outright, since unlike a browser redirect, a webhook with a bad
        signature has no legitimate transaction to fall back to.
        """

        self.validate_configuration()

        return stripe.Webhook.construct_event(
            payload, signature_header, self.webhook_secret
        )
