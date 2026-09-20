import { useState, type FormEvent } from "react"

import { useCreateSubject, useSubjects } from "../../api/schoolAdmin"
import { Button, Card, ErrorBanner, Field, Input, Modal, PageTitle, Spinner, extractErrorMessage } from "../../components/ui"

export function SchoolAdminSubjects() {
  const { data, isLoading } = useSubjects()
  const [showForm, setShowForm] = useState(false)

  if (isLoading) return <Spinner />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <PageTitle>Subjects</PageTitle>
        <Button onClick={() => setShowForm(true)}>Add Subject</Button>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Code</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((subject) => (
              <tr key={subject.id} className="border-b border-gray-100">
                <td className="px-4 py-2">{subject.name}</td>
                <td className="px-4 py-2">{subject.code}</td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-gray-500">
                  No subjects yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {showForm && <CreateSubjectModal onClose={() => setShowForm(false)} />}
    </div>
  )
}

function CreateSubjectModal({ onClose }: { onClose: () => void }) {
  const createSubject = useCreateSubject()
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")

    try {
      await createSubject.mutateAsync({ name, code })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <Modal title="Add Subject" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />

        <Field label="Name">
          <Input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Mathematics" />
        </Field>

        <Field label="Code">
          <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="MATH" />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createSubject.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
