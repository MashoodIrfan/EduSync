import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { PlatformAdminSchoolAdminInfo, PlatformAdminTenantInfo } from "../types"
import { apiClient } from "./client"

export function useTenants() {
  return useQuery({
    queryKey: ["platform", "tenants"],
    queryFn: async () => (await apiClient.get<PlatformAdminTenantInfo[]>("/platform-admin/tenants/")).data,
  })
}

export function useTenant(tenantId: number) {
  return useQuery({
    queryKey: ["platform", "tenants", tenantId],
    queryFn: async () =>
      (await apiClient.get<PlatformAdminTenantInfo>(`/platform-admin/tenants/${tenantId}/`)).data,
    enabled: Number.isFinite(tenantId),
  })
}

export function useCreateTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { name: string; email: string; phone: string; address: string }) =>
      (await apiClient.post<PlatformAdminTenantInfo>("/platform-admin/tenants/", payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] }),
  })
}

export function useUpdateTenant(tenantId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Partial<Pick<PlatformAdminTenantInfo, "name" | "email" | "phone" | "address">>) =>
      (await apiClient.patch<PlatformAdminTenantInfo>(`/platform-admin/tenants/${tenantId}/`, payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] })
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants", tenantId] })
    },
  })
}

export function useSchoolAdmins(tenantId: number) {
  return useQuery({
    queryKey: ["platform", "tenants", tenantId, "school-admins"],
    queryFn: async () =>
      (
        await apiClient.get<PlatformAdminSchoolAdminInfo[]>(
          `/platform-admin/tenants/${tenantId}/school-admins/`,
        )
      ).data,
    enabled: Number.isFinite(tenantId),
  })
}

export function useCreateSchoolAdmin(tenantId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      username: string
      first_name: string
      last_name: string
      email: string
    }) =>
      (
        await apiClient.post<PlatformAdminSchoolAdminInfo>(
          `/platform-admin/tenants/${tenantId}/school-admins/`,
          payload,
        )
      ).data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants", tenantId, "school-admins"] }),
  })
}

export function useToggleSchoolAdminActive(tenantId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) =>
      (
        await apiClient.patch(`/platform-admin/tenants/${tenantId}/school-admins/${id}/`, {
          is_active: isActive,
        })
      ).data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants", tenantId, "school-admins"] }),
  })
}

export function useDeleteSchoolAdmin(tenantId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) =>
      (await apiClient.delete(`/platform-admin/tenants/${tenantId}/school-admins/${id}/`)).data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants", tenantId, "school-admins"] }),
  })
}
