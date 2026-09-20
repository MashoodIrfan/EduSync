import type { ComponentType, ReactNode } from "react"
import { LogOut } from "lucide-react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"

import { useAuth } from "../auth/AuthContext"
import { Logo } from "./Logo"

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  end?: boolean
}

interface PortalLayoutProps {
  title: string
  navItems: NavItem[]
  banner?: ReactNode
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function PortalLayout({ title, navItems, banner }: PortalLayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate("/login")
  }

  const displayName = user?.firstName || user?.username || ""
  const roleLabel = user?.role.replace("_", " ")

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-5">
          <Logo />
          <div>
            <p className="text-sm font-semibold leading-tight text-gray-900">EduSync</p>
            <p className="text-xs leading-tight text-gray-400">{title}</p>
          </div>
        </div>

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
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={18}
                      strokeWidth={2}
                      className={isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600"}
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
              {initialsOf(displayName) || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{displayName}</p>
              <p className="truncate text-xs capitalize text-gray-400">{roleLabel}</p>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Log out"
              className="rounded-md p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3.5 lg:hidden">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-sm font-semibold text-gray-900">EduSync</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <LogOut size={15} />
            Log out
          </button>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-3 py-1.5 lg:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                  isActive ? "bg-indigo-50 text-indigo-700" : "text-gray-500"
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
    </div>
  )
}
