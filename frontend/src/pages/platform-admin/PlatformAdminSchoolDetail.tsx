import { ArrowLeft, Plus, UserRound } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Link, useParams } from "react-router-dom"

import {
  useCreateSchoolAdmin,
  useDeleteSchoolAdmin,
  useSchoolAdmins,
  useTenant,
  useToggleSchoolAdminActive,
} from "../../api/platformAdmin"
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  Modal,
  PageTitle,
  Spinner,
  SuccessBanner,
  extractErrorMessage,
} from "../../components/ui"

export function PlatformAdminSchoolDetail() {
  const { tenantId } = useParams()
  const tenantIdNum = Number(tenantId)

  const { data: tenant, isLoading: tenantLoading } = useTenant(tenantIdNum)
  const { data: admins, isLoading: adminsLoading } = useSchoolAdmins(tenantIdNum)
  const toggleActive = useToggleSchoolAdminActive(tenantIdNum)
  const deleteAdmin = useDeleteSchoolAdmin(tenantIdNum)
  const [showForm, setShowForm] = useState(false)

  if (tenantLoading || adminsLoading) return <Spinner />

  return (
    <div>
      <Link
        to="/platform-admin"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft size={15} />
        All Schools
      </Link>

      <PageTitle subtitle={tenant?.slug}>{tenant?.name}</PageTitle>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium text-gray-400">Email</p>
          <p className="text-sm text-gray-900">{tenant?.email || "—"}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-gray-400">Phone</p>
          <p className="text-sm text-gray-900">{tenant?.phone || "—"}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-gray-400">Address</p>
          <p className="text-sm text-gray-900">{tenant?.address || "—"}</p>
        </Card>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">School Admins</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} />
          Add School Admin
        </Button>
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
            {admins?.map((admin) => (
              <tr key={admin.id} className="border-b border-gray-100">
                <td className="px-4 py-2">{admin.username}</td>
                <td className="px-4 py-2">
                  {admin.first_name} {admin.last_name}
                </td>
                <td className="px-4 py-2">{admin.email || "—"}</td>
                <td className="px-4 py-2">
                  <span className={admin.is_active ? "text-emerald-600" : "text-gray-400"}>
                    {admin.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  <Button
                    variant="secondary"
                    onClick={() => toggleActive.mutate({ id: admin.id, isActive: !admin.is_active })}
                  >
                    {admin.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button variant="danger" onClick={() => deleteAdmin.mutate(admin.id)}>
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {admins?.length === 0 && (
          <EmptyState>
            <UserRound size={20} className="mx-auto mb-2 text-gray-300" />
            No school admins yet — add one to give this school access.
          </EmptyState>
        )}
      </Card>

      {showForm && <CreateSchoolAdminModal tenantId={tenantIdNum} onClose={() => setShowForm(false)} />}
    </div>
  )
}

function CreateSchoolAdminModal({ tenantId, onClose }: { tenantId: number; onClose: () => void }) {
  const createAdmin = useCreateSchoolAdmin(tenantId)

  const [username, setUsername] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [tempPassword, setTempPassword] = useState("")

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")

    try {
      const result = await createAdmin.mutateAsync({
        username,
        first_name: firstName,
        last_name: lastName,
        email,
      })
      setTempPassword(result.temporary_password ?? "")
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <Modal title="Add School Admin" onClose={onClose}>
      {tempPassword ? (
        <div className="space-y-4">
          <SuccessBanner
            message={`Account created. Temporary password: ${tempPassword} (share this with the admin — it will not be shown again).`}
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

          <Field label="Email">
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>

          <p className="text-xs text-gray-400">
            A temporary password will be generated automatically — you'll see it once, right after
            creating the account.
          </p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createAdmin.isPending}>
              Save
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
