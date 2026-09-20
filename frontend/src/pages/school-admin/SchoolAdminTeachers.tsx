import { useState, type FormEvent } from "react"

import { useCreateTeacher, useTeachers, useToggleTeacherActive } from "../../api/schoolAdmin"
import { Button, Card, ErrorBanner, Field, Input, Modal, PageTitle, Spinner, SuccessBanner, extractErrorMessage } from "../../components/ui"

export function SchoolAdminTeachers() {
  const { data, isLoading } = useTeachers()
  const toggleActive = useToggleTeacherActive()
  const [showForm, setShowForm] = useState(false)

  if (isLoading) return <Spinner />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <PageTitle>Teachers</PageTitle>
        <Button onClick={() => setShowForm(true)}>Add Teacher</Button>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Username</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data?.map((teacher) => (
              <tr key={teacher.id} className="border-b border-gray-100">
                <td className="px-4 py-2">{teacher.username}</td>
                <td className="px-4 py-2">
                  {teacher.first_name} {teacher.last_name}
                </td>
                <td className="px-4 py-2">{teacher.email || "—"}</td>
                <td className="px-4 py-2">
                  <span className={teacher.is_active ? "text-green-600" : "text-gray-400"}>
                    {teacher.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      toggleActive.mutate({ id: teacher.id, isActive: !teacher.is_active })
                    }
                  >
                    {teacher.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No teachers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {showForm && <CreateTeacherModal onClose={() => setShowForm(false)} />}
    </div>
  )
}

function CreateTeacherModal({ onClose }: { onClose: () => void }) {
  const createTeacher = useCreateTeacher()

  const [username, setUsername] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")

    try {
      await createTeacher.mutateAsync({
        username,
        first_name: firstName,
        last_name: lastName,
        email,
        password,
      })
      setSuccess("Teacher account created.")
      setTimeout(onClose, 800)
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <Modal title="Add Teacher" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />
        <SuccessBanner message={success} />

        <Field label="Username">
          <Input value={username} onChange={(event) => setUsername(event.target.value)} required />
        </Field>

        <Field label="First Name">
          <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
        </Field>

        <Field label="Last Name">
          <Input value={lastName} onChange={(event) => setLastName(event.target.value)} />
        </Field>

        <Field label="Email">
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>

        <Field label="Initial Password">
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createTeacher.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
