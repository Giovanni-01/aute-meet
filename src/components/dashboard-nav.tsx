"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  BookOpen,
  Settings,
  ExternalLink,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/event-types", label: "Tipos de evento", icon: CalendarDays },
  { href: "/dashboard/availability", label: "Disponibilidad", icon: Clock },
  { href: "/dashboard/bookings", label: "Reservas", icon: BookOpen },
  { href: "/dashboard/settings", label: "Ajustes", icon: Settings },
]

interface DashboardNavProps {
  publicProfileUrl?: string
}

export function DashboardNav({ publicProfileUrl }: DashboardNavProps) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
      {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-[#F5F5F5] font-medium text-[#37585A]"
                : "text-[#8A9F9F] hover:bg-[#F5F5F5] hover:text-[#64797C]"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        )
      })}

      <div className="mt-auto flex flex-col gap-1 pt-4">
        {publicProfileUrl && (
          <a
            href={publicProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#8A9F9F] transition-colors hover:bg-[#F5F5F5] hover:text-[#64797C]"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            Ver mi página
          </a>
        )}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#8A9F9F] transition-colors hover:bg-[#F5F5F5] hover:text-[#37585A]"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </nav>
  )
}
