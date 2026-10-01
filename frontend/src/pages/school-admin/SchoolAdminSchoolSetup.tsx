import { useEffect, useState, type FormEvent } from "react"

import { useSchool, useUpdateSchool } from "../../api/schoolAdmin"
import { Button, Card, ErrorBanner, Field, Input, LoadError, PageTitle, Spinner, SuccessBanner, extractErrorMessage } from "../../components/ui"

export function SchoolAdminSchoolSetup() {
  const { data: school, isLoading, isError, refetch } = useSchool()
  const updateSchool = useUpdateSchool()

  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (school) {
      setEmail(school.email)
      setPhone(school.phone)
      setAddress(school.address)
    }
  }, [school])

  if (isLoading) return <Spinner />
  if (isError) return <LoadError onRetry={() => refetch()} />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setSuccess("")

    try {
      // The backend treats `name` as read-only on this endpoint too —
      // sent here only so the payload shape matches what it expects.
      await updateSchool.mutateAsync({ name: school?.name ?? "", email, phone, address })
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
            <Input value={school?.name ?? ""} disabled readOnly className="bg-gray-50 text-gray-500" />
          </Field>
          <p className="-mt-2.5 text-xs text-gray-500">
            Only EduSync's Platform Admin can change your school's name.
          </p>

          <Field label="Email">
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>

          <Field label="Phone">
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </Field>

          <Field label="Address">
            <Input value={address} onChange={(event) => setAddress(event.target.value)} />
          </Field>

          <Button type="submit" disabled={updateSchool.isPending}>
            Save Changes
          </Button>
        </form>
      </Card>
    </div>
  )
}
