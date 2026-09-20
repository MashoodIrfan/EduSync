import { useState, type FormEvent } from "react"

import { useClasses, useCreateStudent, useStudents } from "../../api/schoolAdmin"
import { Button, Card, ErrorBanner, Field, Input, Modal, PageTitle, Select, Spinner, extractErrorMessage } from "../../components/ui"

export function SchoolAdminStudents() {
  const { data, isLoading } = useStudents()
  const [showForm, setShowForm] = useState(false)

  if (isLoading) return <Spinner />

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
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  No students yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {showForm && <CreateStudentModal onClose={() => setShowForm(false)} />}
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
