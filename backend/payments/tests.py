
import hashlib
import hmac
import json
import time
from datetime import date
from unittest.mock import patch

from django.test import override_settings
from django.urls import reverse

from rest_framework.test import APIClient

from accounts.models import User
from academics.models import Class as SchoolClass
from academics.models import Student
from payments.gateways.stripe_gateway import StripeGateway
from payments.models import FeeInvoice, PaymentTransaction
from tenants.models import Tenant
from tenants.test_utils import RLSTestCase

STRIPE_WEBHOOK_SECRET = "whsec_test_secret"


def sign_stripe_payload(payload_dict, secret=STRIPE_WEBHOOK_SECRET, timestamp=None):
    """
    Build a raw body + Stripe-Signature header the same way Stripe's
    own webhook signer does, without needing network access:

        signed_payload = f"{timestamp}.{body}"
        signature = HMAC-SHA256(secret, signed_payload)
        header = f"t={timestamp},v1={signature}"
    """

    body = json.dumps(payload_dict).encode("utf-8")
    timestamp = timestamp or int(time.time())
    signed_payload = f"{timestamp}.{body.decode('utf-8')}".encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()

    return body, f"t={timestamp},v1={signature}"


def checkout_session_completed_event(transaction_id, amount_total, event_id="evt_test_1"):
    return {
        "id": event_id,
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_123",
                "client_reference_id": transaction_id,
                "amount_total": amount_total,
                "payment_intent": "pi_test_123",
            }
        },
    }


def checkout_session_expired_event(transaction_id, event_id="evt_test_2"):
    return {
        "id": event_id,
        "type": "checkout.session.expired",
        "data": {
            "object": {
                "id": "cs_test_123",
                "client_reference_id": transaction_id,
            }
        },
    }


@override_settings(
    STRIPE_SECRET_KEY="sk_test_fake",
    STRIPE_PUBLISHABLE_KEY="pk_test_fake",
    STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET,
    FRONTEND_URL="https://example.com",
)
class StripeWebhookTests(RLSTestCase):
    def setUp(self):
        self.client = APIClient()

        self.tenant = Tenant.objects.create(
            name="ABC School",
            slug="abc-school",
            email="abc@example.com",
            phone="03000000000",
            address="Lahore",
        )

        self.school_class = SchoolClass.objects.create(
            tenant=self.tenant,
            name="Grade 8",
            section="A",
        )

        self.student = Student.objects.create(
            tenant=self.tenant,
            student_id="STU001",
            first_name="Ahmed",
            last_name="Khan",
            date_of_birth=date(2010, 1, 1),
            class_room=self.school_class,
        )

        self.parent = User.objects.create_user(
            username="ahmed_parent",
            password="TestPassword123!",
            role="PARENT",
            tenant=self.tenant,
        )

        self.invoice = FeeInvoice.objects.create(
            tenant=self.tenant,
            student=self.student,
            invoice_number="INV-001",
            description="September Fee",
            amount="15000.00",
            due_date=date(2026, 9, 30),
        )

        self.payment = PaymentTransaction.objects.create(
            tenant=self.tenant,
            invoice=self.invoice,
            parent=self.parent,
            transaction_id="EDU20260919012345678",
            gateway=PaymentTransaction.Gateway.STRIPE,
            amount="15000.00",
            status=PaymentTransaction.Status.INITIATED,
        )

        self.gateway = StripeGateway()

    def post_webhook(self, event_dict):
        body, sig_header = sign_stripe_payload(event_dict)
        return self.client.post(
            reverse("stripe-webhook"),
            data=body,
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE=sig_header,
        )

    def test_checkout_completed_marks_payment_paid(self):
        expected_amount = self.gateway.format_amount(self.payment.amount)
        event = checkout_session_completed_event(
            self.payment.transaction_id, expected_amount
        )

        response = self.post_webhook(event)

        self.assertEqual(response.status_code, 200)

        self.payment.refresh_from_db()
        self.invoice.refresh_from_db()

        self.assertEqual(self.payment.status, PaymentTransaction.Status.SUCCESS)
        self.assertEqual(self.invoice.status, FeeInvoice.Status.PAID)
        self.assertEqual(self.payment.gateway_reference, "pi_test_123")

    def test_duplicate_completed_event_is_idempotent(self):
        expected_amount = self.gateway.format_amount(self.payment.amount)
        event = checkout_session_completed_event(
            self.payment.transaction_id, expected_amount
        )

        first_response = self.post_webhook(event)
        second_response = self.post_webhook(event)

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)

        self.payment.refresh_from_db()
        self.invoice.refresh_from_db()

        self.assertEqual(self.payment.status, PaymentTransaction.Status.SUCCESS)
        self.assertEqual(self.invoice.status, FeeInvoice.Status.PAID)

    def test_invalid_signature_is_rejected_without_touching_the_transaction(self):
        event = checkout_session_completed_event(self.payment.transaction_id, 1500000)
        body = json.dumps(event).encode("utf-8")

        response = self.client.post(
            reverse("stripe-webhook"),
            data=body,
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE="t=1,v1=deadbeef",
        )

        self.assertEqual(response.status_code, 400)

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PaymentTransaction.Status.INITIATED)

    def test_amount_mismatch_is_rejected(self):
        event = checkout_session_completed_event(self.payment.transaction_id, 999999)

        response = self.post_webhook(event)

        self.assertEqual(response.status_code, 400)

        self.payment.refresh_from_db()
        self.invoice.refresh_from_db()

        self.assertEqual(self.payment.status, PaymentTransaction.Status.INITIATED)
        self.assertNotEqual(self.invoice.status, FeeInvoice.Status.PAID)

    def test_checkout_expired_marks_payment_failed(self):
        event = checkout_session_expired_event(self.payment.transaction_id)

        response = self.post_webhook(event)

        self.assertEqual(response.status_code, 200)

        self.payment.refresh_from_db()
        self.invoice.refresh_from_db()

        self.assertEqual(self.payment.status, PaymentTransaction.Status.FAILED)
        self.assertNotEqual(self.invoice.status, FeeInvoice.Status.PAID)

    def test_unknown_transaction_id_returns_404(self):
        event = checkout_session_completed_event("does-not-exist", 1500000)

        response = self.post_webhook(event)

        self.assertEqual(response.status_code, 404)

    def test_unhandled_event_type_is_acknowledged_and_ignored(self):
        event = {
            "id": "evt_test_3",
            "type": "payment_intent.created",
            "data": {"object": {}},
        }

        response = self.post_webhook(event)

        self.assertEqual(response.status_code, 200)


@override_settings(
    STRIPE_SECRET_KEY="sk_test_fake",
    STRIPE_PUBLISHABLE_KEY="pk_test_fake",
    STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET,
    FRONTEND_URL="https://example.com",
)
class StripeCheckoutSessionCreationTests(RLSTestCase):
    """
    create_checkout_session() itself makes a real HTTP call to Stripe's
    API, so it's mocked here rather than hitting the network — keeps
    the suite fast, deterministic, and independent of having real
    Stripe credentials configured anywhere (including in CI).
    """

    def setUp(self):
        self.tenant = Tenant.objects.create(
            name="ABC School",
            slug="abc-school",
            email="abc@example.com",
            phone="03000000000",
            address="Lahore",
        )

        self.school_class = SchoolClass.objects.create(
            tenant=self.tenant,
            name="Grade 8",
            section="A",
        )

        self.student = Student.objects.create(
            tenant=self.tenant,
            student_id="STU001",
            first_name="Ahmed",
            last_name="Khan",
            date_of_birth=date(2010, 1, 1),
            class_room=self.school_class,
        )

        self.parent = User.objects.create_user(
            username="ahmed_parent",
            password="TestPassword123!",
            role="PARENT",
            tenant=self.tenant,
        )

        self.invoice = FeeInvoice.objects.create(
            tenant=self.tenant,
            student=self.student,
            invoice_number="INV-001",
            description="September Fee",
            amount="15000.00",
            due_date=date(2026, 9, 30),
        )

        self.payment = PaymentTransaction.objects.create(
            tenant=self.tenant,
            invoice=self.invoice,
            parent=self.parent,
            transaction_id="EDU20260919012345678",
            gateway=PaymentTransaction.Gateway.STRIPE,
            amount="15000.00",
            status=PaymentTransaction.Status.INITIATED,
        )

    @patch("payments.gateways.stripe_gateway.stripe.checkout.Session.create")
    def test_builds_a_session_for_the_full_invoice_amount(self, mock_create):
        mock_create.return_value = type("FakeSession", (), {"url": "https://checkout.stripe.com/test"})()

        gateway = StripeGateway()
        session = gateway.create_checkout_session(self.payment)

        self.assertEqual(session.url, "https://checkout.stripe.com/test")

        _, kwargs = mock_create.call_args
        self.assertEqual(kwargs["client_reference_id"], self.payment.transaction_id)
        self.assertEqual(kwargs["line_items"][0]["price_data"]["unit_amount"], 1500000)
        self.assertEqual(kwargs["line_items"][0]["price_data"]["currency"], "pkr")

    @override_settings(STRIPE_SECRET_KEY="")
    def test_raises_when_not_configured(self):
        from django.core.exceptions import ImproperlyConfigured

        gateway = StripeGateway()

        with self.assertRaises(ImproperlyConfigured):
            gateway.create_checkout_session(self.payment)
