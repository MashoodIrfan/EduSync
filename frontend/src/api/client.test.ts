import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>()
  return {
    default: {
      ...actual.default,
      create: vi.fn(() => makeMockInstance()),
      post: vi.fn(),
    },
  }
})

function makeMockInstance() {
  const requestHandlers: Array<(config: any) => any> = []
  const responseHandlers: Array<{
    onFulfilled: (r: any) => any
    onRejected: (e: any) => any
  }> = []

  const instance: any = vi.fn((config: any) => instance.get(config))
  instance.interceptors = {
    request: { use: (fn: any) => requestHandlers.push(fn) },
    response: { use: (onFulfilled: any, onRejected: any) => responseHandlers.push({ onFulfilled, onRejected }) },
  }
  instance.__requestHandlers = requestHandlers
  instance.__responseHandlers = responseHandlers
  return instance
}

describe("apiClient token storage", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("attaches the Authorization header from stored access token", async () => {
    const { tokenStorage } = await import("./tokenStorage")
    tokenStorage.setTokens("access-123", "refresh-456")

    const { apiClient } = await import("./client")
    const handler = (apiClient as any).__requestHandlers[0]
    const config = handler({ headers: {} })

    expect(config.headers.Authorization).toBe("Bearer access-123")
  })

  it("does not attach an Authorization header when there is no token", async () => {
    const { apiClient } = await import("./client")
    const handler = (apiClient as any).__requestHandlers[0]
    const config = handler({ headers: {} })

    expect(config.headers.Authorization).toBeUndefined()
  })
})

describe("apiClient 401 refresh flow", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("refreshes the token once and retries the original request", async () => {
    const axios = (await import("axios")).default as any
    const { tokenStorage } = await import("./tokenStorage")
    tokenStorage.setTokens("old-access", "refresh-456")

    axios.post.mockResolvedValueOnce({ data: { access: "new-access" } })

    const { apiClient } = await import("./client")
    ;(apiClient as any).mockResolvedValueOnce({ data: "retried-ok" })

    const { onRejected } = (apiClient as any).__responseHandlers[0]

    const originalRequest = { url: "/some/protected/", headers: {}, _retry: undefined }
    const error = { config: originalRequest, response: { status: 401 } }

    const result = await onRejected(error)

    expect(axios.post).toHaveBeenCalledWith("/api/token/refresh/", { refresh: "refresh-456" })
    expect(originalRequest.headers).toMatchObject({ Authorization: "Bearer new-access" })
    expect(result).toEqual({ data: "retried-ok" })
    expect(tokenStorage.getAccess()).toBe("new-access")
  })

  it("does not attempt refresh for requests to the token endpoints themselves", async () => {
    const axios = (await import("axios")).default as any
    const { apiClient } = await import("./client")
    const { onRejected } = (apiClient as any).__responseHandlers[0]

    const originalRequest = { url: "/token/", headers: {} }
    const error = { config: originalRequest, response: { status: 401 } }

    await expect(onRejected(error)).rejects.toBe(error)
    expect(axios.post).not.toHaveBeenCalled()
  })

  it("clears tokens and redirects to /login when the refresh call itself fails", async () => {
    const axios = (await import("axios")).default as any
    const { tokenStorage } = await import("./tokenStorage")
    tokenStorage.setTokens("old-access", "bad-refresh")

    axios.post.mockRejectedValueOnce(new Error("refresh rejected"))

    const originalLocation = window.location
    const locationStub = { href: "" } as unknown as Location
    Object.defineProperty(window, "location", { value: locationStub, configurable: true })

    const { apiClient } = await import("./client")
    const { onRejected } = (apiClient as any).__responseHandlers[0]

    const originalRequest = { url: "/some/protected/", headers: {} }
    const error = { config: originalRequest, response: { status: 401 } }

    await expect(onRejected(error)).rejects.toThrow("refresh rejected")

    expect(tokenStorage.getAccess()).toBeNull()
    expect(tokenStorage.getRefresh()).toBeNull()
    expect(window.location.href).toBe("/login")

    Object.defineProperty(window, "location", { value: originalLocation, configurable: true })
  })

  it("does not retry a request that has already been retried once", async () => {
    const axios = (await import("axios")).default as any
    const { apiClient } = await import("./client")
    const { onRejected } = (apiClient as any).__responseHandlers[0]

    const originalRequest = { url: "/some/protected/", headers: {}, _retry: true }
    const error = { config: originalRequest, response: { status: 401 } }

    await expect(onRejected(error)).rejects.toBe(error)
    expect(axios.post).not.toHaveBeenCalled()
  })
})
