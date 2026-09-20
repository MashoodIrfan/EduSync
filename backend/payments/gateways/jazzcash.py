
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import hmac

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.utils import timezone


class JazzCashGateway:
    name = "JAZZCASH"

    def __init__(self):
        self.merchant_id = settings.JAZZCASH_MERCHANT_ID
        self.password = settings.JAZZCASH_PASSWORD
        self.shared_secret = settings.JAZZCASH_SHARED_SECRET
        self.payment_url = settings.JAZZCASH_PAYMENT_URL
        self.return_url = settings.JAZZCASH_RETURN_URL

    def validate_configuration(self):
        missing = []

        if not self.merchant_id:
            missing.append("JAZZCASH_MERCHANT_ID")

        if not self.password:
            missing.append("JAZZCASH_PASSWORD")

        if not self.shared_secret:
            missing.append("JAZZCASH_SHARED_SECRET")

        if not self.payment_url:
            missing.append("JAZZCASH_PAYMENT_URL")

        if not self.return_url:
            missing.append("JAZZCASH_RETURN_URL")

        if missing:
            raise ImproperlyConfigured(
                "Missing JazzCash configuration: "
                + ", ".join(missing)
            )

    @staticmethod
    def format_amount(amount):
        """
        Convert a PKR amount into JazzCash integer format.

        Example:
            15000.00 -> "1500000"
        """

        amount = Decimal(amount)

        amount_in_minor_units = (
            amount * Decimal("100")
        ).quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        )

        return str(int(amount_in_minor_units))

    @staticmethod
    def format_datetime(value):
        """
        Convert a Django datetime into:

        YYYYMMDDHHMMSS
        """

        return timezone.localtime(value).strftime(
            "%Y%m%d%H%M%S"
        )

    @staticmethod
    def _hashable_fields(payload):
        """
        Return the JazzCash fields used to calculate
        the secure hash.

        The secure hash itself is excluded.

        We include:
            pp_*
            ppmpf_*
            ppmbf_*

        JazzCash optional merchant/member-bank fields
        are part of the transaction message.
        """

        fields = {}

        for key, value in payload.items():
            key = str(key)

            if key == "pp_SecureHash":
                continue

            if not (
                key.startswith("pp_")
                or key.startswith("ppmpf_")
                or key.startswith("ppmbf_")
            ):
                continue

            fields[key] = (
                "" if value is None else str(value)
            )

        return fields

    def _build_hash_message(self, payload):
        """
        Build the message required by JazzCash's
        SHA-256 secure-hash process.

        Format:

            SharedSecret + sorted field values

        IMPORTANT:
        There are NO separators between values.
        """

        fields = self._hashable_fields(payload)

        sorted_keys = sorted(fields.keys())

        values = [
            fields[key]
            for key in sorted_keys
        ]

        return (
            self.shared_secret
            + "".join(values)
        )

    def generate_secure_hash(self, payload):
        """
        Generate JazzCash SHA-256 secure hash.
        """

        self.validate_configuration()

        message = self._build_hash_message(
            payload
        )

        digest = hashlib.sha256(
            message.encode("utf-8")
        ).hexdigest().upper()

        return digest

    def verify_response_hash(self, payload):
        """
        Verify the secure hash returned by JazzCash.

        Returns:

            True  -> valid hash
            False -> invalid/missing hash
        """

        received_hash = str(
            payload.get(
                "pp_SecureHash",
                "",
            )
        ).strip()

        if not received_hash:
            return False

        try:
            expected_hash = (
                self.generate_secure_hash(
                    payload
                )
            )
        except ImproperlyConfigured:
            return False

        return hmac.compare_digest(
            received_hash.upper(),
            expected_hash.upper(),
        )

    def build_payment_payload(
        self,
        payment_transaction,
    ):
        """
        Build the HTTP POST form fields that EduSync
        sends to the JazzCash Payment Portal.

        Current EduSync flow:

            Payment Portal v1.1
            MWALLET
            PKR
        """

        self.validate_configuration()

        created_at = payment_transaction.created_at

        expiry_time = (
            created_at
            + timedelta(hours=3)
        )

        payload = {
            # Payment Portal version.
            "pp_Version": "1.1",

            # Mobile Wallet.
            "pp_TxnType": "MWALLET",

            "pp_Language": "EN",

            "pp_MerchantID": (
                self.merchant_id
            ),

            "pp_SubMerchantID": "",

            "pp_Password": (
                self.password
            ),

            # Bank/Product fields are only used
            # for DD according to the v1.1 guide.
            "pp_BankID": "",
            "pp_ProductID": "",

            "pp_TxnRefNo": (
                payment_transaction.transaction_id
            ),

            "pp_Amount": (
                self.format_amount(
                    payment_transaction.amount
                )
            ),

            "pp_TxnCurrency": "PKR",

            "pp_TxnDateTime": (
                self.format_datetime(
                    created_at
                )
            ),

            "pp_TxnExpiryDateTime": (
                self.format_datetime(
                    expiry_time
                )
            ),

            "pp_BillReference": (
                payment_transaction
                .invoice
                .invoice_number
            ),

            "pp_Description": (
                f"EduSync fee payment "
                f"{payment_transaction.invoice.invoice_number}"
            ),

            "pp_ReturnURL": (
                self.return_url
            ),

            # Merchant-defined optional fields.
            # These are returned by JazzCash
            # with the transaction response.
            "ppmpf_1": (
                payment_transaction
                .invoice
                .invoice_number
            ),

            "ppmpf_2": "",
            "ppmpf_3": "",
            "ppmpf_4": "",
            "ppmpf_5": "",
        }

        payload["pp_SecureHash"] = (
            self.generate_secure_hash(
                payload
            )
        )

        return payload

