
from datetime import date

from django.test import TestCase, override_settings
from django.urls import reverse

from rest_framework.test import APIClient

from accounts.models import User
from academics.models import Class as SchoolClass
from academics.models import Student
from payments.gateways.jazzcash import JazzCashGateway
from payments.models import FeeInvoice, PaymentTransaction
from tenants.models import Tenant


@override_settings(
    JAZZCASH_MERCHANT_ID="TEST-MERCHANT",
    JAZZCASH_PASSWORD="TEST-PASSWORD",
    JAZZCASH_SHARED_SECRET="TEST-SHARED-SECRET",
    JAZZCASH_PAYMENT_URL="https://sandbox.example.com/pay",
    JAZZCASH_RETURN_URL=(
        "https://example.com/api/payments/"
        "jazzcash/return/"
    ),
)
class JazzCashCallbackTests(TestCase):
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
            gateway=PaymentTransaction.Gateway.JAZZCASH,
            amount="15000.00",
            status=PaymentTransaction.Status.INITIATED,
        )

        self.gateway = JazzCashGateway()

    def build_callback_payload(
        self,
        response_code="000",
        amount=None,
        secure_hash=True,
    ):
        """
        Build a fake JazzCash callback payload using
        the same gateway hashing logic used by EduSync.
        """

        if amount is None:
            amount = self.gateway.format_amount(
                self.payment.amount
            )

        payload = {
            "pp_Version": "1.1",
            "pp_TxnType": "MWALLET",
            "pp_Language": "EN",
            "pp_MerchantID": "TEST-MERCHANT",
            "pp_TxnRefNo": self.payment.transaction_id,
            "pp_Amount": amount,
            "pp_TxnCurrency": "PKR",
            "pp_BillReference": (
                self.invoice.invoice_number
            ),
            "pp_ReturnURL": (
                "https://example.com/api/payments/"
                "jazzcash/return/"
            ),
            "pp_ResponseCode": response_code,
            "pp_ResponseMessage": (
                "Success"
                if response_code == "000"
                else "Transaction failed"
            ),
            "pp_RetreivalReferenceNo": "RRN123456789",
            "pp_AuthCode": "AUTH123",
            "ppmpf_1": self.invoice.invoice_number,
            "ppmpf_2": "",
            "ppmpf_3": "",
            "ppmpf_4": "",
            "ppmpf_5": "",
        }

        if secure_hash:
            payload["pp_SecureHash"] = (
                self.gateway.generate_secure_hash(
                    payload
                )
            )
        else:
            payload["pp_SecureHash"] = (
                "INVALID-HASH"
            )

        return payload

    def test_successful_callback_marks_payment_paid(self):
        payload = self.build_callback_payload()

        response = self.client.post(
            reverse("jazzcash-return"),
            data=payload,
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.payment.refresh_from_db()
        self.invoice.refresh_from_db()

        self.assertEqual(
            self.payment.status,
            PaymentTransaction.Status.SUCCESS,
        )

        self.assertEqual(
            self.invoice.status,
            FeeInvoice.Status.PAID,
        )

        self.assertEqual(
            self.payment.gateway_response_code,
            "000",
        )

        self.assertEqual(
            self.payment.gateway_reference,
            "RRN123456789",
        )

        self.assertEqual(
            self.payment.retrieval_reference_number,
            "RRN123456789",
        )

        self.assertEqual(
            self.payment.authorization_code,
            "AUTH123",
        )

    def test_duplicate_success_callback_is_idempotent(self):
        payload = self.build_callback_payload()

        first_response = self.client.post(
            reverse("jazzcash-return"),
            data=payload,
        )

        second_response = self.client.post(
            reverse("jazzcash-return"),
            data=payload,
        )

        self.assertEqual(
            first_response.status_code,
            200,
        )

        self.assertEqual(
            second_response.status_code,
            200,
        )

        self.payment.refresh_from_db()
        self.invoice.refresh_from_db()

        self.assertEqual(
            self.payment.status,
            PaymentTransaction.Status.SUCCESS,
        )

        self.assertEqual(
            self.invoice.status,
            FeeInvoice.Status.PAID,
        )

    def test_invalid_hash_requires_verification(self):
        payload = self.build_callback_payload(
            secure_hash=False,
        )

        response = self.client.post(
            reverse("jazzcash-return"),
            data=payload,
        )

        self.assertEqual(
            response.status_code,
            400,
        )

        self.payment.refresh_from_db()

        self.assertEqual(
            self.payment.status,
            PaymentTransaction.Status
            .VERIFICATION_REQUIRED,
        )

        self.invoice.refresh_from_db()

        self.assertNotEqual(
            self.invoice.status,
            FeeInvoice.Status.PAID,
        )

    def test_amount_mismatch_requires_verification(self):
        payload = self.build_callback_payload(
            amount="1000000",
        )

        response = self.client.post(
            reverse("jazzcash-return"),
            data=payload,
        )

        self.assertEqual(
            response.status_code,
            400,
        )

        self.payment.refresh_from_db()

        self.assertEqual(
            self.payment.status,
            PaymentTransaction.Status
            .VERIFICATION_REQUIRED,
        )

        self.invoice.refresh_from_db()

        self.assertNotEqual(
            self.invoice.status,
            FeeInvoice.Status.PAID,
        )

    def test_failed_callback_marks_payment_failed(self):
        payload = self.build_callback_payload(
            response_code="001",
        )

        response = self.client.post(
            reverse("jazzcash-return"),
            data=payload,
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.payment.refresh_from_db()
        self.invoice.refresh_from_db()

        self.assertEqual(
            self.payment.status,
            PaymentTransaction.Status.FAILED,
        )

        self.assertNotEqual(
            self.invoice.status,
            FeeInvoice.Status.PAID,
        )
