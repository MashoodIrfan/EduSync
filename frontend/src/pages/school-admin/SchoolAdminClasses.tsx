import { useState, type FormEvent } from "react"

import { useClasses, useCreateClass } from "../../api/schoolAdmin"
import { Button, Card, ErrorBanner, Field, Input, Modal, PageTitle, Spinner, extractErrorMessage } from "../../components/ui"

export function SchoolAdminClasses() {
  const { data, isLoading } = useClasses()
  const [showForm, setShowForm] = useState(false)

  if (isLoading) return <Spinner />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <PageTitle>Classes</PageTitle>
        <Button onClick={() => setShowForm(true)}>Add Class</Button>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Section</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((klass) => (
              <tr key={klass.id} className="border-b border-gray-100">
                <td className="px-4 py-2">{klass.name}</td>
                <td className="px-4 py-2">{klass.section}</td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-gray-500">
                  No classes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {showForm && <CreateClassModal onClose={() => setShowForm(false)} />}
    </div>
  )
}

function CreateClassModal({ onClose }: { onClose: () => void }) {
  const createClass = useCreateClass()
  const [name, setName] = useState("")
  const [section, setSection] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")

    try {
      await createClass.mutateAsync({ name, section })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <Modal title="Add Class" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />

        <Field label="Name">
          <Input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Grade 8" />
        </Field>

        <Field label="Section">
          <Input value={section} onChange={(event) => setSection(event.target.value)} placeholder="A" />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createClass.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
