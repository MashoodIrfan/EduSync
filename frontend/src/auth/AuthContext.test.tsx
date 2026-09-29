import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { apiClient } from "../api/client"
import { tokenStorage } from "../api/tokenStorage"
import { AuthProvider, useAuth } from "./AuthContext"

vi.mock("../api/client", () => ({
  apiClient: { post: vi.fn() },
}))

const post = vi.mocked(apiClient.post)

// A minimal, unsigned-but-well-formed JWT carrying the custom claims
// EduSyncTokenObtainPairSerializer embeds — decoding doesn't verify
// the signature client-side, so this is enough to exercise jwtDecode.
function fakeToken(claims: Record<string, unknown>) {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }))
  const payload = btoa(JSON.stringify(claims))
  return `${header}.${payload}.signature`
}

const TEACHER_CLAIMS = {
  user_id: 5,
  role: "TEACHER",
  tenant_id: 2,
  username: "demo_teacher",
  first_name: "Demo",
  last_name: "Teacher",
}

function Probe() {
  const { user, isLoading, login, logout } = useAuth()

  if (isLoading) return <div>loading</div>

  return (
    <div>
      <div data-testid="user">{user ? `${user.username}:${user.role}` : "none"}</div>
      <button onClick={() => login("demo_teacher", "pw")}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  )
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear()
    post.mockReset()
  })

  it("has no user on mount when there is no stored token", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("none"))
  })

  it("decodes an existing stored token into a user on mount", async () => {
    tokenStorage.setTokens(fakeToken(TEACHER_CLAIMS), "refresh-token")

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("demo_teacher:TEACHER"),
    )
  })

  it("clears storage and stays logged out if the stored token is malformed", async () => {
    localStorage.setItem("edusync_access_token", "not-a-real-jwt")

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("none"))
    expect(tokenStorage.getAccess()).toBeNull()
  })

  it("login stores tokens and decodes the resulting user", async () => {
    post.mockResolvedValueOnce({
      data: { access: fakeToken(TEACHER_CLAIMS), refresh: "new-refresh" },
    })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("none"))
    screen.getByText("login").click()

    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("demo_teacher:TEACHER"),
    )
    expect(tokenStorage.getAccess()).not.toBeNull()
    expect(tokenStorage.getRefresh()).toBe("new-refresh")
  })

  it("logout clears the user and stored tokens", async () => {
    tokenStorage.setTokens(fakeToken(TEACHER_CLAIMS), "refresh-token")

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("demo_teacher:TEACHER"),
    )
    screen.getByText("logout").click()

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("none"))
    expect(tokenStorage.getAccess()).toBeNull()
  })
})
