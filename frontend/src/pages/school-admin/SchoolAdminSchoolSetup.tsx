import { useEffect, useState, type FormEvent } from "react"

import { useSchool, useUpdateSchool } from "../../api/schoolAdmin"
import { Button, Card, ErrorBanner, Field, Input, PageTitle, Spinner, SuccessBanner, extractErrorMessage } from "../../components/ui"

export function SchoolAdminSchoolSetup() {
  const { data: school, isLoading } = useSchool()
  const updateSchool = useUpdateSchool()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (school) {
      setName(school.name)
      setEmail(school.email)
      setPhone(school.phone)
      setAddress(school.address)
    }
  }, [school])

  if (isLoading) return <Spinner />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setSuccess("")

    try {
      await updateSchool.mutateAsync({ name, email, phone, address })
      setSuccess("School details updated.")
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <div>
      <PageTitle>School Setup</PageTitle>
      <Card className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorBanner message={error} />
          <SuccessBanner message={success} />

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

          <p className="text-xs text-gray-500">Slug: {school?.slug} (read-only)</p>

          <Button type="submit" disabled={updateSchool.isPending}>
            Save Changes
          </Button>
        </form>
      </Card>
    </div>
  )
}
