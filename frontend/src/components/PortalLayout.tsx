import type { ComponentType, ReactNode } from "react"
import { useState } from "react"
import { LogOut } from "lucide-react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"

import { useAuth } from "../auth/AuthContext"
import { Logo } from "./Logo"
import { Button, Modal } from "./ui"

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  end?: boolean
  badge?: number
}

interface PortalLayoutProps {
  title: string
  navItems: NavItem[]
  banner?: ReactNode
  statusBadge?: ReactNode
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function PortalLayout({ title, navItems, banner, statusBadge }: PortalLayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  function handleLogout() {
    logout()
    navigate("/login")
  }

  const displayName = user?.firstName || user?.username || ""
  const roleLabel = user?.role.replace("_", " ")

  return (
    <div className="flex min-h-screen bg-stone-50">
      <aside className="hidden w-64 shrink-0 flex-col bg-brand-800 lg:flex">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
          <Logo />
          <div>
            <p className="text-sm font-semibold leading-tight text-white">EduSync</p>
            <p className="text-xs leading-tight text-brand-200">{title}</p>
          </div>
        </div>

        {statusBadge && <div className="border-b border-white/10 px-5 py-3">{statusBadge}</div>}

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-brand-200 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={18}
                      strokeWidth={2}
                      className={isActive ? "text-terracotta-200" : "text-brand-300 group-hover:text-brand-100"}
                    />
                    <span className="flex-1">{item.label}</span>
                    {!!item.badge && (
                      <span className="rounded-full bg-terracotta-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terracotta-500 text-xs font-semibold text-white">
              {initialsOf(displayName) || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{displayName}</p>
              <p className="truncate text-xs capitalize text-brand-300">{roleLabel}</p>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              aria-label="Log out"
              className="rounded-md p-1.5 text-brand-300 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3.5 lg:hidden">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-sm font-semibold text-gray-900">EduSync</span>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-stone-100"
          >
            <LogOut size={15} />
            Log out
          </button>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-stone-200 bg-white px-3 py-1.5 lg:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-gray-500"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {banner}

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      {showLogoutConfirm && (
        <Modal title="Log out?" onClose={() => setShowLogoutConfirm(false)}>
          <p className="text-sm text-gray-600">
            You'll need to sign in again to access your account.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
