import { useState, type FormEvent } from "react"

import { useCancelFeeInvoice, useCreateFeeInvoice, useFeeInvoices, useStudents } from "../../api/schoolAdmin"
import { Badge, Button, Card, ErrorBanner, Field, Input, Modal, PageTitle, Select, Spinner, extractErrorMessage } from "../../components/ui"

export function SchoolAdminFeeInvoices() {
  const { data, isLoading } = useFeeInvoices()
  const cancelInvoice = useCancelFeeInvoice()
  const [showForm, setShowForm] = useState(false)

  if (isLoading) return <Spinner />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <PageTitle>Fee Invoices</PageTitle>
        <Button onClick={() => setShowForm(true)}>Add Invoice</Button>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Invoice</th>
              <th className="px-4 py-2">Student</th>
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
                <td className="px-4 py-2">{invoice.student_name}</td>
                <td className="px-4 py-2">{invoice.description}</td>
                <td className="px-4 py-2">Rs. {invoice.amount}</td>
                <td className="px-4 py-2">{invoice.due_date}</td>
                <td className="px-4 py-2">
                  <Badge status={invoice.status} />
                </td>
                <td className="px-4 py-2 text-right">
                  {invoice.status === "UNPAID" && (
                    <Button variant="danger" onClick={() => cancelInvoice.mutate(invoice.id)}>
                      Cancel
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {showForm && <CreateInvoiceModal onClose={() => setShowForm(false)} />}
    </div>
  )
}

function CreateInvoiceModal({ onClose }: { onClose: () => void }) {
  const { data: students } = useStudents()
  const createInvoice = useCreateFeeInvoice()

  const [student, setStudent] = useState("")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")

    try {
      await createInvoice.mutateAsync({
        student: Number(student),
        description,
        amount,
        due_date: dueDate,
      })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <Modal title="Add Invoice" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />

        <Field label="Student">
          <Select value={student} onChange={(event) => setStudent(event.target.value)} required>
            <option value="">Select a student</option>
            {students?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.first_name} {item.last_name} ({item.student_id})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Description">
          <Input value={description} onChange={(event) => setDescription(event.target.value)} required />
        </Field>

        <Field label="Amount (Rs.)">
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </Field>

        <Field label="Due Date">
          <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createInvoice.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
