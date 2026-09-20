
from django.core.exceptions import ImproperlyConfigured, ValidationError
from django.db import transaction

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .gateways.jazzcash import JazzCashGateway
from .models import PaymentTransaction
from .services import (
    mark_payment_failed,
    mark_payment_success,
)


class JazzCashReturnView(APIView):
    """
    Receives the payment result POST sent by JazzCash.

    JazzCash calls this endpoint after processing the
    payment. The endpoint does not use JWT because the
    caller is the payment gateway.

    Security checks:
        1. Transaction exists.
        2. Gateway is JazzCash.
        3. Merchant ID matches our configuration.
        4. Secure hash is valid.
        5. Returned amount matches our transaction.
        6. Invoice reference matches.
        7. Response code determines success/failure.

    The actual payment state transition is delegated to
    payments.services so that idempotency remains centralized.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        # Convert incoming values into normal strings.
        payload = {
            str(key): (
                "" if value is None else str(value)
            )
            for key, value in request.data.items()
        }

        transaction_id = payload.get(
            "pp_TxnRefNo",
            "",
        ).strip()

        if not transaction_id:
            return Response(
                {
                    "status": "error",
                    "message": (
                        "JazzCash transaction reference "
                        "was not provided."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payment = (
                PaymentTransaction.objects
                .select_related(
                    "invoice",
                    "parent",
                )
                .get(
                    transaction_id=transaction_id,
                )
            )
        except PaymentTransaction.DoesNotExist:
            return Response(
                {
                    "status": "error",
                    "message": (
                        "Payment transaction was not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # This callback must belong to a JazzCash transaction.
        if (
            payment.gateway
            != PaymentTransaction.Gateway.JAZZCASH
        ):
            return Response(
                {
                    "status": "error",
                    "message": (
                        "Invalid payment gateway."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        gateway = JazzCashGateway()

        try:
            gateway.validate_configuration()
        except ImproperlyConfigured as exc:
            return Response(
                {
                    "status": "error",
                    "message": str(exc),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # -------------------------------------------------
        # 1. Verify Merchant ID
        # -------------------------------------------------

        returned_merchant_id = payload.get(
            "pp_MerchantID",
            "",
        ).strip()

        if returned_merchant_id != gateway.merchant_id:
            self._mark_verification_required(
                transaction_id=payment.transaction_id,
                payload=payload,
                reason="Invalid merchant ID.",
            )

            return Response(
                {
                    "status": "error",
                    "message": "Invalid merchant ID.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # 2. Verify Secure Hash
        # -------------------------------------------------

        if not gateway.verify_response_hash(payload):
            self._mark_verification_required(
                transaction_id=payment.transaction_id,
                payload=payload,
                reason="Invalid secure hash.",
            )

            return Response(
                {
                    "status": "error",
                    "message": "Invalid secure hash.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # 3. Verify returned amount
        # -------------------------------------------------

        returned_amount = payload.get(
            "pp_Amount",
            "",
        ).strip()

        expected_amount = gateway.format_amount(
            payment.amount
        )

        if returned_amount != expected_amount:
            self._mark_verification_required(
                transaction_id=payment.transaction_id,
                payload=payload,
                reason="Payment amount mismatch.",
            )

            return Response(
                {
                    "status": "error",
                    "message": (
                        "Payment amount does not match "
                        "the invoice amount."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # 4. Verify invoice reference
        # -------------------------------------------------

        returned_bill_reference = payload.get(
            "pp_BillReference",
            "",
        ).strip()

        if (
            returned_bill_reference
            and returned_bill_reference
            != payment.invoice.invoice_number
        ):
            self._mark_verification_required(
                transaction_id=payment.transaction_id,
                payload=payload,
                reason="Invoice reference mismatch.",
            )

            return Response(
                {
                    "status": "error",
                    "message": (
                        "Invoice reference does not match."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # 5. Read JazzCash response information
        # -------------------------------------------------

        response_code = payload.get(
            "pp_ResponseCode",
            "",
        ).strip()

        response_message = payload.get(
            "pp_ResponseMessage",
            "",
        ).strip()

        # IMPORTANT:
        # JazzCash documentation spells this field:
        # pp_RetreivalReferenceNo
        retrieval_reference = payload.get(
            "pp_RetreivalReferenceNo",
            "",
        ).strip()

        authorization_code = payload.get(
            "pp_AuthCode",
            "",
        ).strip()

        # -------------------------------------------------
        # 6. Store gateway response information
        # -------------------------------------------------

        with transaction.atomic():
            locked_payment = (
                PaymentTransaction.objects
                .select_for_update()
                .get(
                    pk=payment.pk,
                )
            )

            locked_payment.gateway_response_code = (
                response_code
            )

            locked_payment.gateway_response_message = (
                response_message
            )

            locked_payment.retrieval_reference_number = (
                retrieval_reference
            )

            locked_payment.authorization_code = (
                authorization_code
            )

            if retrieval_reference:
                locked_payment.gateway_reference = (
                    retrieval_reference
                )

            locked_payment.save(
                update_fields=[
                    "gateway_response_code",
                    "gateway_response_message",
                    "retrieval_reference_number",
                    "authorization_code",
                    "gateway_reference",
                    "updated_at",
                ]
            )

            # -------------------------------------------------
            # 7. Process successful/failed gateway response
            # -------------------------------------------------

            try:
                if response_code == "000":
                    payment_result = (
                        mark_payment_success(
                            locked_payment.transaction_id,
                            gateway_reference=(
                                retrieval_reference
                            ),
                        )
                    )

                    return Response(
                        {
                            "status": "success",
                            "message": (
                                "Payment processed "
                                "successfully."
                            ),
                            "transaction_id": (
                                payment_result.transaction_id
                            ),
                        },
                        status=status.HTTP_200_OK,
                    )

                payment_result = (
                    mark_payment_failed(
                        locked_payment.transaction_id,
                        gateway_reference=(
                            retrieval_reference
                        ),
                    )
                )

            except ValidationError as exc:
                return Response(
                    {
                        "status": "error",
                        "message": str(exc),
                    },
                    status=status.HTTP_409_CONFLICT,
                )

        return Response(
            {
                "status": "failed",
                "message": (
                    response_message
                    or "JazzCash payment failed."
                ),
                "transaction_id": (
                    payment_result.transaction_id
                ),
                "response_code": response_code,
            },
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def _mark_verification_required(
        transaction_id,
        payload,
        reason="",
    ):
        """
        Store an untrusted/suspicious callback.

        We use VERIFICATION_REQUIRED instead of FAILED
        because an invalid hash, merchant ID, or amount
        means we cannot safely determine that the callback
        is a genuine payment failure.

        A transaction that is already SUCCESS is never
        downgraded.
        """

        with transaction.atomic():
            payment = (
                PaymentTransaction.objects
                .select_for_update()
                .get(
                    transaction_id=transaction_id,
                )
            )

            payment.gateway_response_code = (
                payload.get(
                    "pp_ResponseCode",
                    "",
                )
            )

            payment.gateway_response_message = (
                payload.get(
                    "pp_ResponseMessage",
                    "",
                )
                or reason
            )

            # JazzCash's documented spelling.
            payment.retrieval_reference_number = (
                payload.get(
                    "pp_RetreivalReferenceNo",
                    "",
                )
            )

            payment.authorization_code = (
                payload.get(
                    "pp_AuthCode",
                    "",
                )
            )

            if payment.status != (
                PaymentTransaction.Status.SUCCESS
            ):
                payment.status = (
                    PaymentTransaction.Status
                    .VERIFICATION_REQUIRED
                )

            retrieval_reference = (
                payload.get(
                    "pp_RetreivalReferenceNo",
                    "",
                )
            )

            if retrieval_reference:
                payment.gateway_reference = (
                    retrieval_reference
                )

            payment.save(
                update_fields=[
                    "status",
                    "gateway_response_code",
                    "gateway_response_message",
                    "retrieval_reference_number",
                    "authorization_code",
                    "gateway_reference",
                    "updated_at",
                ]
            )
