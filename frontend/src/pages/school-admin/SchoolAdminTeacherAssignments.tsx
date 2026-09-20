import { useState, type FormEvent } from "react"

import {
  useClasses,
  useCreateTeacherAssignment,
  useDeleteTeacherAssignment,
  useSubjects,
  useTeacherAssignments,
  useTeachers,
} from "../../api/schoolAdmin"
import { Button, Card, ErrorBanner, Field, Modal, PageTitle, Select, Spinner, extractErrorMessage } from "../../components/ui"

export function SchoolAdminTeacherAssignments() {
  const { data, isLoading } = useTeacherAssignments()
  const deleteAssignment = useDeleteTeacherAssignment()
  const [showForm, setShowForm] = useState(false)

  if (isLoading) return <Spinner />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <PageTitle>Teacher Assignments</PageTitle>
        <Button onClick={() => setShowForm(true)}>Add Assignment</Button>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Teacher</th>
              <th className="px-4 py-2">Class</th>
              <th className="px-4 py-2">Subject</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data?.map((assignment) => (
              <tr key={assignment.id} className="border-b border-gray-100">
                <td className="px-4 py-2">{assignment.teacher_name}</td>
                <td className="px-4 py-2">{assignment.class_name}</td>
                <td className="px-4 py-2">{assignment.subject_name}</td>
                <td className="px-4 py-2 text-right">
                  <Button variant="danger" onClick={() => deleteAssignment.mutate(assignment.id)}>
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  No assignments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {showForm && <CreateAssignmentModal onClose={() => setShowForm(false)} />}
    </div>
  )
}

function CreateAssignmentModal({ onClose }: { onClose: () => void }) {
  const { data: teachers } = useTeachers()
  const { data: classes } = useClasses()
  const { data: subjects } = useSubjects()
  const createAssignment = useCreateTeacherAssignment()

  const [teacher, setTeacher] = useState("")
  const [classRoom, setClassRoom] = useState("")
  const [subject, setSubject] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")

    try {
      await createAssignment.mutateAsync({
        teacher: Number(teacher),
        class_room: Number(classRoom),
        subject: Number(subject),
      })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <Modal title="Add Assignment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />

        <Field label="Teacher">
          <Select value={teacher} onChange={(event) => setTeacher(event.target.value)} required>
            <option value="">Select a teacher</option>
            {teachers?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.first_name} {item.last_name} ({item.username})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Class">
          <Select value={classRoom} onChange={(event) => setClassRoom(event.target.value)} required>
            <option value="">Select a class</option>
            {classes?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} {item.section}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Subject">
          <Select value={subject} onChange={(event) => setSubject(event.target.value)} required>
            <option value="">Select a subject</option>
            {subjects?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createAssignment.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
