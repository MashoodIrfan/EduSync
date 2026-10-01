import { Pencil, Trash2 } from "lucide-react"
import { useState, type FormEvent } from "react"

import { useClasses, useCreateClass, useDeleteClass, useUpdateClass } from "../../api/schoolAdmin"
import { Button, Card, ErrorBanner, Field, Input, LoadError, Modal, PageTitle, Spinner, extractErrorMessage } from "../../components/ui"
import type { SchoolAdminClassInfo } from "../../types"

export function SchoolAdminClasses() {
  const { data, isLoading, isError, refetch } = useClasses()
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<SchoolAdminClassInfo | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SchoolAdminClassInfo | null>(null)

  if (isLoading) return <Spinner />
  if (isError) return <LoadError onRetry={() => refetch()} />

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
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data?.map((klass) => (
              <tr key={klass.id} className="border-b border-gray-100">
                <td className="px-4 py-2">{klass.name}</td>
                <td className="px-4 py-2">{klass.section}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => setEditTarget(klass)}
                    aria-label="Edit"
                    className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(klass)}
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
                  No classes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {showForm && <CreateClassModal onClose={() => setShowForm(false)} />}
      {editTarget && <EditClassModal classItem={editTarget} onClose={() => setEditTarget(null)} />}
      {deleteTarget && (
        <DeleteClassModal classItem={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}
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

function EditClassModal({ classItem, onClose }: { classItem: SchoolAdminClassInfo; onClose: () => void }) {
  const updateClass = useUpdateClass()
  const [name, setName] = useState(classItem.name)
  const [section, setSection] = useState(classItem.section)
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")

    try {
      await updateClass.mutateAsync({ id: classItem.id, name, section })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <Modal title="Edit Class" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />

        <Field label="Name">
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>

        <Field label="Section">
          <Input value={section} onChange={(event) => setSection(event.target.value)} />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateClass.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteClassModal({ classItem, onClose }: { classItem: SchoolAdminClassInfo; onClose: () => void }) {
  const deleteClass = useDeleteClass()
  const [error, setError] = useState("")

  async function handleDelete() {
    setError("")

    try {
      await deleteClass.mutateAsync(classItem.id)
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <Modal title="Delete Class" onClose={onClose}>
      <ErrorBanner message={error} />
      <p className="mb-5 text-sm text-gray-600">
        Delete <span className="font-medium text-gray-900">{classItem.name} {classItem.section}</span>?
        This can't be undone, and only works if the class has no students, teacher assignments, or
        attendance records.
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleDelete} disabled={deleteClass.isPending}>
          Delete
        </Button>
      </div>
    </Modal>
  )
}
