import { Pencil, Trash2 } from "lucide-react"
import { useState, type FormEvent } from "react"

import { useCreateSubject, useDeleteSubject, useSubjects, useUpdateSubject } from "../../api/schoolAdmin"
import { Button, Card, ErrorBanner, Field, Input, LoadError, Modal, PageTitle, Spinner, extractErrorMessage } from "../../components/ui"
import type { SchoolAdminSubjectInfo } from "../../types"

export function SchoolAdminSubjects() {
  const { data, isLoading, isError, refetch } = useSubjects()
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<SchoolAdminSubjectInfo | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SchoolAdminSubjectInfo | null>(null)

  if (isLoading) return <Spinner />
  if (isError) return <LoadError onRetry={() => refetch()} />

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
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data?.map((subject) => (
              <tr key={subject.id} className="border-b border-gray-100">
                <td className="px-4 py-2">{subject.name}</td>
                <td className="px-4 py-2">{subject.code}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => setEditTarget(subject)}
                    aria-label="Edit"
                    className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(subject)}
                    aria-label="Delete"
                    className="rounded-md p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                  No subjects yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {showForm && <CreateSubjectModal onClose={() => setShowForm(false)} />}
      {editTarget && <EditSubjectModal subject={editTarget} onClose={() => setEditTarget(null)} />}
      {deleteTarget && (
        <DeleteSubjectModal subject={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}
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

function EditSubjectModal({
  subject,
  onClose,
}: {
  subject: SchoolAdminSubjectInfo
  onClose: () => void
}) {
  const updateSubject = useUpdateSubject()
  const [name, setName] = useState(subject.name)
  const [code, setCode] = useState(subject.code)
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")

    try {
      await updateSubject.mutateAsync({ id: subject.id, name, code })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <Modal title="Edit Subject" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />

        <Field label="Name">
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>

        <Field label="Code">
          <Input value={code} onChange={(event) => setCode(event.target.value)} />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateSubject.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteSubjectModal({
  subject,
  onClose,
}: {
  subject: SchoolAdminSubjectInfo
  onClose: () => void
}) {
  const deleteSubject = useDeleteSubject()
  const [error, setError] = useState("")

  async function handleDelete() {
    setError("")

    try {
      await deleteSubject.mutateAsync(subject.id)
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <Modal title="Delete Subject" onClose={onClose}>
      <ErrorBanner message={error} />
      <p className="mb-5 text-sm text-gray-600">
        Delete <span className="font-medium text-gray-900">{subject.name}</span>? This can't be
        undone, and only works if the subject has no teacher assignments or attendance records.
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleDelete} disabled={deleteSubject.isPending}>
          Delete
        </Button>
      </div>
    </Modal>
  )
}
