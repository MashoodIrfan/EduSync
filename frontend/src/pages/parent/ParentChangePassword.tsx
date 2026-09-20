import { useQueryClient } from "@tanstack/react-query"
import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"

import { useParentChangePassword } from "../../api/parent"
import { Button, Card, ErrorBanner, Field, Input, PageTitle, SuccessBanner, extractErrorMessage } from "../../components/ui"

export function ParentChangePassword() {
  const changePassword = useParentChangePassword()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setSuccess("")

    try {
      await changePassword.mutateAsync({
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })

      await queryClient.invalidateQueries({ queryKey: ["parent", "me"] })
      setSuccess("Password changed successfully.")
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")

      setTimeout(() => navigate("/parent"), 1000)
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <div>
      <PageTitle>Change Password</PageTitle>
      <Card className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorBanner message={error} />
          <SuccessBanner message={success} />

          <Field label="Current Password">
            <Input
              type="password"
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
              required
            />
          </Field>

          <Field label="New Password">
            <Input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </Field>

          <Field label="Confirm New Password">
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </Field>

          <Button type="submit" disabled={changePassword.isPending}>
            {changePassword.isPending ? "Saving..." : "Change Password"}
          </Button>
        </form>
      </Card>
    </div>
  )
}
