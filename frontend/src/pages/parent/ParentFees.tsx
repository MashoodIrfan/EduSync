import { useState } from "react"

import { useInitiatePayment, useParentFees } from "../../api/parent"
import { Badge, Button, Card, ErrorBanner, PageTitle, Spinner, extractErrorMessage } from "../../components/ui"

function submitToGateway(paymentUrl: string, formFields: Record<string, string>) {
  const form = document.createElement("form")
  form.method = "POST"
  form.action = paymentUrl

  for (const [key, value] of Object.entries(formFields)) {
    const input = document.createElement("input")
    input.type = "hidden"
    input.name = key
    input.value = value
    form.appendChild(input)
  }

  document.body.appendChild(form)
  form.submit()
}

export function ParentFees() {
  const { data, isLoading } = useParentFees()
  const initiatePayment = useInitiatePayment()
  const [error, setError] = useState("")
  const [payingId, setPayingId] = useState<number | null>(null)

  if (isLoading) return <Spinner />

  async function handlePay(invoiceId: number) {
    setError("")
    setPayingId(invoiceId)

    try {
      const result = await initiatePayment.mutateAsync(invoiceId)
      submitToGateway(result.payment_url, result.form_fields)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setPayingId(null)
    }
  }

  return (
    <div>
      <PageTitle>Fees</PageTitle>
      <ErrorBanner message={error} />
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Invoice</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Due Date</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data?.map((invoice) => (
              <tr key={invoice.id} className="border-b border-gray-100">
                <td className="px-4 py-2">{invoice.invoice_number}</td>
                <td className="px-4 py-2">{invoice.description}</td>
                <td className="px-4 py-2">Rs. {invoice.amount}</td>
                <td className="px-4 py-2">{invoice.due_date}</td>
                <td className="px-4 py-2">
                  <Badge status={invoice.status} />
                </td>
                <td className="px-4 py-2 text-right">
                  {invoice.status === "UNPAID" && (
                    <Button onClick={() => handlePay(invoice.id)} disabled={payingId === invoice.id}>
                      {payingId === invoice.id ? "Redirecting..." : "Pay Now"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
