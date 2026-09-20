import { usePayments } from "../../api/schoolAdmin"
import { Badge, Card, PageTitle, Spinner } from "../../components/ui"

export function SchoolAdminPayments() {
  const { data, isLoading } = usePayments()

  if (isLoading) return <Spinner />

  return (
    <div>
      <PageTitle>Payments</PageTitle>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Transaction</th>
              <th className="px-4 py-2">Invoice</th>
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">Parent</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((payment) => (
              <tr key={payment.id} className="border-b border-gray-100">
                <td className="px-4 py-2">{payment.transaction_id}</td>
                <td className="px-4 py-2">{payment.invoice_number}</td>
                <td className="px-4 py-2">{payment.student_name}</td>
                <td className="px-4 py-2">{payment.parent_username}</td>
                <td className="px-4 py-2">Rs. {payment.amount}</td>
                <td className="px-4 py-2">
                  <Badge status={payment.status} />
                </td>
                <td className="px-4 py-2">{new Date(payment.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                  No payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
