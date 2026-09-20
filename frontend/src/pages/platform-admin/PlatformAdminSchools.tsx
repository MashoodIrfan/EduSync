import { ArrowRight, Plus, School as SchoolIcon } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"

import { useCreateTenant, useTenants } from "../../api/platformAdmin"
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
  extractErrorMessage,
} from "../../components/ui"

export function PlatformAdminSchools() {
  const { data, isLoading } = useTenants()
  const [showForm, setShowForm] = useState(false)

  if (isLoading) return <Spinner />

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <PageTitle subtitle="Every school on the platform, in one place.">Schools</PageTitle>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} />
          Register School
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((tenant) => (
          <Link key={tenant.id} to={`/platform-admin/schools/${tenant.id}`}>
            <Card className="h-full transition hover:border-indigo-200 hover:shadow-md">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <SchoolIcon size={18} strokeWidth={2} />
              </div>
              <p className="text-base font-semibold text-gray-900">{tenant.name}</p>
              <p className="mb-4 text-xs text-gray-400">{tenant.slug}</p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600">
                Manage
                <ArrowRight size={15} />
              </span>
            </Card>
          </Link>
        ))}
        {data?.length === 0 && (
          <Card className="col-span-full">
            <EmptyState>No schools registered yet.</EmptyState>
          </Card>
        )}
      </div>

      {showForm && <CreateSchoolModal onClose={() => setShowForm(false)} />}
    </div>
  )
}

function CreateSchoolModal({ onClose }: { onClose: () => void }) {
  const createTenant = useCreateTenant()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")

    try {
      await createTenant.mutateAsync({ name, email, phone, address })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <Modal title="Register School" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />

        <Field label="School Name">
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>

        <Field label="Email">
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>

        <Field label="Phone">
          <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
        </Field>

        <Field label="Address">
          <Input value={address} onChange={(event) => setAddress(event.target.value)} />
        </Field>

        <p className="text-xs text-gray-400">
          A URL-friendly slug will be generated automatically from the school name.
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createTenant.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
