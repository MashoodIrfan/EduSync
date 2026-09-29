import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import type { AuthUser } from "../types"
import { ProtectedRoute } from "./ProtectedRoute"
import * as AuthContextModule from "./AuthContext"

function mockAuth(overrides: Partial<ReturnType<typeof AuthContextModule.useAuth>>) {
  vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
    user: null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  })
}

function renderProtected(allowedRoles: AuthUser["role"][]) {
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route path="/" element={<div>home page</div>} />
        <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
          <Route path="/protected" element={<div>secret content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe("ProtectedRoute", () => {
  it("shows a loading state while auth is resolving", () => {
    mockAuth({ isLoading: true })
    renderProtected(["TEACHER"])

    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  it("redirects to /login when there is no authenticated user", () => {
    mockAuth({ user: null })
    renderProtected(["TEACHER"])

    expect(screen.getByText("login page")).toBeInTheDocument()
  })

  it("redirects to / when the user's role is not allowed", () => {
    mockAuth({
      user: { id: 1, role: "PARENT", tenantId: 2, username: "demo_parent" } as AuthUser,
    })
    renderProtected(["TEACHER"])

    expect(screen.getByText("home page")).toBeInTheDocument()
  })

  it("renders the protected content when the user's role is allowed", () => {
    mockAuth({
      user: { id: 1, role: "TEACHER", tenantId: 2, username: "demo_teacher" } as AuthUser,
    })
    renderProtected(["TEACHER"])

    expect(screen.getByText("secret content")).toBeInTheDocument()
  })
})
