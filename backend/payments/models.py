
from django.core.exceptions import ValidationError
from django.db import models


class FeeInvoice(models.Model):

    class Status(models.TextChoices):
        UNPAID = "UNPAID", "Unpaid"
        PAID = "PAID", "Paid"
        OVERDUE = "OVERDUE", "Overdue"
        CANCELLED = "CANCELLED", "Cancelled"

    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="fee_invoices",
    )

    student = models.ForeignKey(
        "academics.Student",
        on_delete=models.CASCADE,
        related_name="fee_invoices",
    )

    invoice_number = models.CharField(
        max_length=50,
        unique=True,
    )

    description = models.CharField(
        max_length=255,
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    due_date = models.DateField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.UNPAID,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.student.tenant_id != self.tenant_id:
            raise ValidationError(
                "Student and invoice must belong to the same school."
            )

        if self.amount <= 0:
            raise ValidationError(
                "Invoice amount must be greater than zero."
            )

    def __str__(self):
        return f"{self.invoice_number} - {self.student}"


class PaymentTransaction(models.Model):

    class Gateway(models.TextChoices):
        JAZZCASH = "JAZZCASH", "JazzCash"

    class Status(models.TextChoices):
        INITIATED = "INITIATED", "Initiated"
        PENDING = "PENDING", "Pending"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"
        VERIFICATION_REQUIRED = (
            "VERIFICATION_REQUIRED",
            "Verification Required",
        )

    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="payment_transactions",
    )

    invoice = models.ForeignKey(
        FeeInvoice,
        on_delete=models.PROTECT,
        related_name="payment_transactions",
    )

    parent = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="payment_transactions",
    )

    transaction_id = models.CharField(
        max_length=100,
        unique=True,
    )

    gateway = models.CharField(
        max_length=20,
        choices=Gateway.choices,
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.INITIATED,
    )

    gateway_reference = models.CharField(
        max_length=255,
        blank=True,
    )

    gateway_response_code = models.CharField(
        max_length=20,
        blank=True,
    )

    gateway_response_message = models.CharField(
        max_length=255,
        blank=True,
    )

    retrieval_reference_number = models.CharField(
        max_length=50,
        blank=True,
    )

    authorization_code = models.CharField(
        max_length=50,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.parent.role != "PARENT":
            raise ValidationError(
                "Only parent accounts can make fee payments."
            )

        if self.parent.tenant_id != self.tenant_id:
            raise ValidationError(
                "Parent and transaction must belong to the same school."
            )

        if self.invoice.tenant_id != self.tenant_id:
            raise ValidationError(
                "Invoice and transaction must belong to the same school."
            )

        if self.invoice.student.tenant_id != self.tenant_id:
            raise ValidationError(
                "Student and transaction must belong to the same school."
            )

        if self.amount <= 0:
            raise ValidationError(
                "Payment amount must be greater than zero."
            )

    def __str__(self):
        return f"{self.transaction_id} - {self.status}"

