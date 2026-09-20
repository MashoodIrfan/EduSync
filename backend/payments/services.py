
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import FeeInvoice, PaymentTransaction


def update_invoice_status(invoice):
    if invoice.status == FeeInvoice.Status.CANCELLED:
        return invoice

    successful_payment_exists = invoice.payment_transactions.filter(
        status=PaymentTransaction.Status.SUCCESS
    ).exists()

    if successful_payment_exists:
        invoice.status = FeeInvoice.Status.PAID

    elif invoice.due_date < timezone.localdate():
        invoice.status = FeeInvoice.Status.OVERDUE

    else:
        invoice.status = FeeInvoice.Status.UNPAID

    invoice.save(update_fields=["status", "updated_at"])

    return invoice


@transaction.atomic
def mark_payment_success(
    transaction_id,
    gateway_reference="",
):
    payment = (
        PaymentTransaction.objects
        .select_for_update()
        .select_related("invoice")
        .get(transaction_id=transaction_id)
    )

    # Idempotency:
    # Ignore duplicate success callbacks.
    if payment.status == PaymentTransaction.Status.SUCCESS:
        return payment

    invoice = (
        FeeInvoice.objects
        .select_for_update()
        .get(pk=payment.invoice_id)
    )

    # An invoice cannot be paid twice.
    if invoice.status == FeeInvoice.Status.PAID:
        raise ValidationError(
            "This invoice has already been paid."
        )

    if invoice.status == FeeInvoice.Status.CANCELLED:
        raise ValidationError(
            "This invoice has been cancelled."
        )

    # Online payments must always cover the complete invoice.
    if payment.amount != invoice.amount:
        raise ValidationError(
            "Payment amount must equal the complete invoice amount."
        )

    payment.status = PaymentTransaction.Status.SUCCESS

    if gateway_reference:
        payment.gateway_reference = gateway_reference

    payment.save(
        update_fields=[
            "status",
            "gateway_reference",
            "updated_at",
        ]
    )

    update_invoice_status(invoice)

    return payment


@transaction.atomic
def mark_payment_pending(
    transaction_id,
    gateway_reference="",
):
    payment = (
        PaymentTransaction.objects
        .select_for_update()
        .get(transaction_id=transaction_id)
    )

    if payment.status == PaymentTransaction.Status.SUCCESS:
        return payment

    payment.status = PaymentTransaction.Status.PENDING

    if gateway_reference:
        payment.gateway_reference = gateway_reference

    payment.save(
        update_fields=[
            "status",
            "gateway_reference",
            "updated_at",
        ]
    )

    return payment


@transaction.atomic
def mark_payment_failed(
    transaction_id,
    gateway_reference="",
):
    payment = (
        PaymentTransaction.objects
        .select_for_update()
        .get(transaction_id=transaction_id)
    )

    if payment.status == PaymentTransaction.Status.SUCCESS:
        return payment

    payment.status = PaymentTransaction.Status.FAILED

    if gateway_reference:
        payment.gateway_reference = gateway_reference

    payment.save(
        update_fields=[
            "status",
            "gateway_reference",
            "updated_at",
        ]
    )

    return payment

