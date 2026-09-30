import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { useInitiatePayment, useParentFees } from "../../api/parent"
import { Badge, Button, Card, ErrorBanner, PageTitle, Spinner, extractErrorMessage } from "../../components/ui"

export function ParentFees() {
  const { data, isLoading } = useParentFees()
  const initiatePayment = useInitiatePayment()
  const [error, setError] = useState("")
  const [payingId, setPayingId] = useState<number | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // Captured once from the URL and kept in state, so the banner stays
  // visible even after the query param is stripped on the next line —
  // otherwise the banner and its own cleanup effect would both fire
  // off the same param and the banner would vanish within a frame.
  const [paymentResult] = useState(() => searchParams.get("payment"))

  useEffect(() => {
    if (!searchParams.get("payment")) return

    const next = new URLSearchParams(searchParams)
    next.delete("payment")
    setSearchParams(next, { replace: true })
    // Run once on mount only — this just cleans the URL bar, it must
    // not react to setSearchParams changing searchParams itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading) return <Spinner />

  async function handlePay(invoiceId: number) {
    setError("")
    setPayingId(invoiceId)

    try {
      const result = await initiatePayment.mutateAsync(invoiceId)
      window.location.href = result.checkout_url
    } catch (err) {
      setError(extractErrorMessage(err))
      setPayingId(null)
    }
  }

  return (
    <div>
      <PageTitle>Fees</PageTitle>
      {paymentResult === "success" && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Payment completed. It may take a few seconds to reflect below.
        </div>
      )}
      {paymentResult === "cancelled" && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Payment was cancelled — no charge was made.
        </div>
      )}
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
