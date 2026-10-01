import { Pencil, Trash2 } from "lucide-react"
import { useState, type FormEvent } from "react"

import {
  useClasses,
  useCreateStudent,
  useDeleteStudent,
  useStudents,
  useUpdateStudent,
} from "../../api/schoolAdmin"
import { Button, Card, ErrorBanner, Field, Input, LoadError, Modal, PageTitle, Select, Spinner, extractErrorMessage } from "../../components/ui"
import type { SchoolAdminStudentInfo } from "../../types"

export function SchoolAdminStudents() {
  const { data, isLoading, isError, refetch } = useStudents()
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<SchoolAdminStudentInfo | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SchoolAdminStudentInfo | null>(null)

  if (isLoading) return <Spinner />
  if (isError) return <LoadError onRetry={() => refetch()} />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <PageTitle>Students</PageTitle>
        <Button onClick={() => setShowForm(true)}>Add Student</Button>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Student ID</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Class</th>
              <th className="px-4 py-2">Date of Birth</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data?.map((student) => (
              <tr key={student.id} className="border-b border-gray-100">
                <td className="px-4 py-2">{student.student_id}</td>
                <td className="px-4 py-2">
                  {student.first_name} {student.last_name}
                </td>
                <td className="px-4 py-2">{student.class_name}</td>
                <td className="px-4 py-2">{student.date_of_birth ?? "—"}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => setEditTarget(student)}
                    aria-label="Edit"
                    className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(student)}
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
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No students yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {showForm && <CreateStudentModal onClose={() => setShowForm(false)} />}
      {editTarget && <EditStudentModal student={editTarget} onClose={() => setEditTarget(null)} />}
      {deleteTarget && (
        <DeleteStudentModal student={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}
    </div>
  )
}

function CreateStudentModal({ onClose }: { onClose: () => void }) {
  const { data: classes } = useClasses()
  const createStudent = useCreateStudent()

  const [studentId, setStudentId] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [classRoom, setClassRoom] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")

    try {
      await createStudent.mutateAsync({
        student_id: studentId,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        class_room: Number(classRoom),
      })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <Modal title="Add Student" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />

        <Field label="Student ID">
          <Input value={studentId} onChange={(event) => setStudentId(event.target.value)} required />
        </Field>

        <Field label="First Name">
          <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
        </Field>

        <Field label="Last Name">
          <Input value={lastName} onChange={(event) => setLastName(event.target.value)} />
        </Field>

        <Field label="Date of Birth">
          <Input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
        </Field>

        <Field label="Class">
          <Select value={classRoom} onChange={(event) => setClassRoom(event.target.value)} required>
            <option value="">Select a class</option>
            {classes?.map((klass) => (
              <option key={klass.id} value={klass.id}>
                {klass.name} {klass.section}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createStudent.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function EditStudentModal({
  student,
  onClose,
}: {
  student: SchoolAdminStudentInfo
  onClose: () => void
}) {
  const { data: classes } = useClasses()
  const updateStudent = useUpdateStudent()

  const [studentId, setStudentId] = useState(student.student_id)
  const [firstName, setFirstName] = useState(student.first_name)
  const [lastName, setLastName] = useState(student.last_name)
  const [dateOfBirth, setDateOfBirth] = useState(student.date_of_birth ?? "")
  const [classRoom, setClassRoom] = useState(String(student.class_room))
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")

    try {
      await updateStudent.mutateAsync({
        id: student.id,
        student_id: studentId,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        class_room: Number(classRoom),
      })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <Modal title="Edit Student" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />

        <Field label="Student ID">
          <Input value={studentId} onChange={(event) => setStudentId(event.target.value)} required />
        </Field>

        <Field label="First Name">
          <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
        </Field>

        <Field label="Last Name">
          <Input value={lastName} onChange={(event) => setLastName(event.target.value)} />
        </Field>

        <Field label="Date of Birth">
          <Input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
        </Field>

        <Field label="Class">
          <Select value={classRoom} onChange={(event) => setClassRoom(event.target.value)} required>
            {classes?.map((klass) => (
              <option key={klass.id} value={klass.id}>
                {klass.name} {klass.section}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateStudent.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteStudentModal({
  student,
  onClose,
}: {
  student: SchoolAdminStudentInfo
  onClose: () => void
}) {
  const deleteStudent = useDeleteStudent()
  const [error, setError] = useState("")

  async function handleDelete() {
    setError("")

    try {
      await deleteStudent.mutateAsync(student.id)
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <Modal title="Delete Student" onClose={onClose}>
      <ErrorBanner message={error} />
      <p className="mb-5 text-sm text-gray-600">
        Delete{" "}
        <span className="font-medium text-gray-900">
          {student.first_name} {student.last_name}
        </span>
        ? This can't be undone, and only works if the student has no attendance records, fee
        invoices, or linked parent account.
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleDelete} disabled={deleteStudent.isPending}>
          Delete
        </Button>
      </div>
    </Modal>
  )
}
