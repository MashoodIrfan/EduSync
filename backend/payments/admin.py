
from django.contrib import admin

from .models import FeeInvoice, PaymentTransaction


@admin.register(FeeInvoice)
class FeeInvoiceAdmin(admin.ModelAdmin):
    list_display = (
        "invoice_number",
        "student",
        "amount",
        "due_date",
        "status",
        "tenant",
        "created_at",
    )

    list_filter = (
        "tenant",
        "status",
        "due_date",
    )

    search_fields = (
        "invoice_number",
        "student__first_name",
        "student__last_name",
        "student__student_id",
    )


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "transaction_id",
        "invoice",
        "parent",
        "gateway",
        "amount",
        "status",
        "gateway_reference",
        "gateway_response_code",
        "retrieval_reference_number",
        "tenant",
        "created_at",
    )

    list_filter = (
        "tenant",
        "gateway",
        "status",
        "gateway_response_code",
    )

    search_fields = (
        "transaction_id",
        "gateway_reference",
        "gateway_response_code",
        "gateway_response_message",
        "retrieval_reference_number",
        "authorization_code",
        "invoice__invoice_number",
        "parent__username",
    )

    readonly_fields = (
        "transaction_id",
        "gateway",
        "amount",
        "gateway_reference",
        "gateway_response_code",
        "gateway_response_message",
        "retrieval_reference_number",
        "authorization_code",
        "created_at",
        "updated_at",
    )
