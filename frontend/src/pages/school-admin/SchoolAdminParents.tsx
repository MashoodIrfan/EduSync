import { useState, type FormEvent } from "react"

import {
  useCreateParent,
  useDeleteParent,
  useParents,
  useResetParentPassword,
  useStudents,
} from "../../api/schoolAdmin"
import { Button, Card, ErrorBanner, Field, Input, Modal, PageTitle, Select, Spinner, SuccessBanner, extractErrorMessage } from "../../components/ui"

export function SchoolAdminParents() {
  const { data, isLoading } = useParents()
  const resetPassword = useResetParentPassword()
  const deleteParent = useDeleteParent()
  const [showForm, setShowForm] = useState(false)
  const [resetResult, setResetResult] = useState<{ username: string; password: string } | null>(null)

  if (isLoading) return <Spinner />

  async function handleReset(id: number, username: string) {
    const result = await resetPassword.mutateAsync(id)
    setResetResult({ username, password: result.temporary_password })
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <PageTitle>Parents</PageTitle>
        <Button onClick={() => setShowForm(true)}>Add Parent</Button>
      </div>

      {resetResult && (
        <SuccessBanner
          message={`New temporary password for ${resetResult.username}: ${resetResult.password}`}
        />
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Username</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">Must Change Password</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data?.map((parent) => (
              <tr key={parent.id} className="border-b border-gray-100">
                <td className="px-4 py-2">{parent.username}</td>
                <td className="px-4 py-2">
                  {parent.first_name} {parent.last_name}
                </td>
                <td className="px-4 py-2">
                  {parent.student_name} ({parent.student_id})
                </td>
                <td className="px-4 py-2">{parent.must_change_password ? "Yes" : "No"}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <Button variant="secondary" onClick={() => handleReset(parent.id, parent.username)}>
                    Reset Password
                  </Button>
                  <Button variant="danger" onClick={() => deleteParent.mutate(parent.id)}>
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No parent accounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {showForm && <CreateParentModal onClose={() => setShowForm(false)} />}
    </div>
  )
}

function CreateParentModal({ onClose }: { onClose: () => void }) {
  const { data: students } = useStudents()
  const createParent = useCreateParent()

  const [username, setUsername] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [student, setStudent] = useState("")
  const [error, setError] = useState("")
  const [tempPassword, setTempPassword] = useState("")

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")

    try {
      const result = await createParent.mutateAsync({
        username,
        first_name: firstName,
        last_name: lastName,
        student: Number(student),
      })
      setTempPassword(result.temporary_password)
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <Modal title="Add Parent" onClose={onClose}>
      {tempPassword ? (
        <div className="space-y-4">
          <SuccessBanner
            message={`Account created. Temporary password: ${tempPassword} (share this with the parent — it will not be shown again).`}
          />
          <div className="flex justify-end">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorBanner message={error} />

          <Field label="Username">
            <Input value={username} onChange={(event) => setUsername(event.target.value)} required />
          </Field>

          <Field label="First Name">
            <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
          </Field>

          <Field label="Last Name">
            <Input value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </Field>

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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createParent.isPending}>
              Save
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
