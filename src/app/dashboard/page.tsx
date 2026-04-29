import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DisconnectCalendarButton } from "@/components/disconnect-calendar-button"
import {
  CalendarDays,
  LogOut,
  CheckCircle,
  TriangleAlert,
  Calendar,
  Link2,
  Clock,
  Plus,
  ArrowRight,
  Settings,
} from "lucide-react"

interface DashboardPageProps {
  searchParams: Promise<{
    calendar_connected?: string
    calendar_error?: string
  }>
}

type CalendarConnection = {
  id: string
  provider: string
  provider_account_email: string
  token_expires_at: string | null
  created_at: string
}

type EventType = {
  id: string
  title: string
  slug: string
  duration_minutes: number
  color: string
  is_active: boolean
}

const CALENDAR_ERROR_MESSAGES: Record<string, string> = {
  oauth_denied: "Has cancelado la conexión con Google Calendar.",
  invalid_state:
    "La solicitud no es válida (posible problema de CSRF). Por favor, inténtalo de nuevo.",
  token_exchange_failed:
    "No hemos podido obtener los tokens de Google. Por favor, inténtalo de nuevo.",
  db_error:
    "Error al guardar la conexión. Por favor, inténtalo de nuevo o contacta con el administrador.",
}

function getCalendarErrorMessage(errorCode: string): string {
  return (
    CALENDAR_ERROR_MESSAGES[errorCode] ??
    "Ha ocurrido un error al conectar Google Calendar. Por favor, inténtalo de nuevo."
  )
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch calendar connections
  const { data: connections } = await supabase
    .from("calendar_connections")
    .select("id, provider, provider_account_email, token_expires_at, created_at")
    .eq("provider", "google")
    .order("created_at", { ascending: false })

  const googleConnection = (connections as CalendarConnection[] | null)?.[0] ?? null

  // Fetch event types
  const { data: eventTypes } = await supabase
    .from("event_types")
    .select("id, title, slug, duration_minutes, color, is_active")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const items = (eventTypes as EventType[] | null) ?? []

  // Fetch availability rule count
  const { count: availabilityCount } = await supabase
    .from("availability_rules")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)

  const { calendar_connected, calendar_error } = await searchParams

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email ??
    "Usuario"

  const avatarUrl: string | undefined =
    user.user_metadata?.avatar_url ?? user.user_metadata?.picture

  const initials = displayName
    .split(" ")
    .map((part: string) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div className="min-h-screen bg-[#F7F8F8]">
      {/* Top nav */}
      <header className="border-b border-[#C2CDCF] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl bg-[#64797C] p-2">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-semibold text-[#37585A]">
              Aute Meet
            </span>
          </div>

          {/* Quick nav links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard/event-types" className="text-sm font-medium text-[#64797C] hover:text-[#37585A] transition-colors">
              Tipos de evento
            </Link>
            <Link href="/dashboard/availability" className="text-sm font-medium text-[#64797C] hover:text-[#37585A] transition-colors">
              Disponibilidad
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-[#64797C] text-xs text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col sm:flex">
                <span className="text-sm font-medium text-[#37585A]">
                  {displayName}
                </span>
                <span className="text-xs text-[#8A9F9F]">{user.email}</span>
              </div>
            </div>

            <form action="/auth/signout" method="post">
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="gap-2 text-[#8A9F9F] hover:text-[#37585A]"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-[#37585A]">
            Bienvenido, {displayName.split(" ")[0]}
          </h1>
          <p className="text-[#8A9F9F]">
            Tu panel de Aute Meet. Aquí aparecerán tus tipos de evento y
            próximas reservas.
          </p>
        </div>

        {/* ── Banners ── */}
        {calendar_connected === "1" && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>Google Calendar conectado correctamente.</span>
          </div>
        )}

        {calendar_error && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            <span>{getCalendarErrorMessage(calendar_error)}</span>
          </div>
        )}

        {/* ── Google Calendar connection card ── */}
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#64797C]">
            Calendarios conectados
          </h2>

          {googleConnection ? (
            <div className="flex items-center justify-between rounded-2xl border border-[#C2CDCF] bg-white px-5 py-4 shadow-card">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F5]">
                  <Calendar className="h-5 w-5 text-[#64797C]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#37585A]">
                    Google Calendar
                  </span>
                  <span className="text-xs text-[#8A9F9F]">
                    {googleConnection.provider_account_email}
                  </span>
                  {googleConnection.token_expires_at && (
                    <span className="text-xs text-[#8A9F9F]">
                      Token expira:{" "}
                      {new Date(
                        googleConnection.token_expires_at
                      ).toLocaleString("es-ES", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </div>

              <DisconnectCalendarButton connectionId={googleConnection.id} />
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-2xl border border-dashed border-[#C2CDCF] bg-white px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F5]">
                  <Calendar className="h-5 w-5 text-[#8A9F9F]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#64797C]">
                    Google Calendar
                  </span>
                  <span className="text-xs text-[#8A9F9F]">No conectado</span>
                </div>
              </div>

              <Button
                render={<Link href="/api/calendar/google/connect" />}
                size="sm"
                className="gap-1.5"
              >
                <Link2 className="h-3.5 w-3.5" />
                Conectar Google Calendar
              </Button>
            </div>
          )}
        </section>

        {/* ── Quick actions ── */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {/* Event types card */}
          <Link
            href="/dashboard/event-types"
            className="group flex items-center justify-between rounded-2xl border border-[#C2CDCF] bg-white px-5 py-4 shadow-card transition-colors hover:border-[#8A9F9F]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F5]">
                <CalendarDays className="h-5 w-5 text-[#64797C]" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#37585A]">
                  Tipos de evento
                </span>
                <span className="text-xs text-[#8A9F9F]">
                  {items.length === 0
                    ? "Ninguno creado"
                    : `${items.length} tipo${items.length !== 1 ? "s" : ""}`}
                </span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#C2CDCF] transition-colors group-hover:text-[#8A9F9F]" />
          </Link>

          {/* Availability card */}
          <Link
            href="/dashboard/availability"
            className="group flex items-center justify-between rounded-2xl border border-[#C2CDCF] bg-white px-5 py-4 shadow-card transition-colors hover:border-[#8A9F9F]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F5]">
                <Settings className="h-5 w-5 text-[#64797C]" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#37585A]">
                  Disponibilidad
                </span>
                <span className="text-xs text-[#8A9F9F]">
                  {(availabilityCount ?? 0) === 0
                    ? "Sin configurar"
                    : `${availabilityCount} franja${availabilityCount !== 1 ? "s" : ""} configurada${availabilityCount !== 1 ? "s" : ""}`}
                </span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#C2CDCF] transition-colors group-hover:text-[#8A9F9F]" />
          </Link>
        </section>

        {/* ── Recent event types preview ── */}
        {items.length > 0 && (
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[#64797C]">
                Tus tipos de evento
              </h2>
              <Link
                href="/dashboard/event-types"
                className="text-xs text-[#8A9F9F] hover:text-[#64797C]"
              >
                Ver todos →
              </Link>
            </div>
            <div className="space-y-2">
              {items.slice(0, 3).map((et) => (
                <div
                  key={et.id}
                  className="flex items-center gap-4 rounded-xl border border-[#C2CDCF] bg-white px-4 py-3"
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: et.color }}
                  />
                  <span
                    className={`text-sm ${
                      et.is_active
                        ? "font-medium text-[#37585A]"
                        : "text-[#8A9F9F]"
                    }`}
                  >
                    {et.title}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-[#8A9F9F]">
                    <Clock className="h-3 w-3" />
                    {et.duration_minutes} min
                  </div>
                  {!et.is_active && (
                    <span className="rounded bg-[#F5F5F5] px-1.5 py-0.5 text-xs text-[#8A9F9F]">
                      Inactivo
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {items.length === 0 && (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#C2CDCF] bg-white px-6 py-16 text-center">
            <CalendarDays className="mb-4 h-10 w-10 text-[#C2CDCF]" />
            <p className="text-sm font-medium text-[#64797C]">
              Todavía no tienes tipos de evento
            </p>
            <p className="mt-1 text-sm text-[#8A9F9F]">
              Crea tu primer tipo de evento para que puedan agendarte.
            </p>
            <Button
              render={<Link href="/dashboard/event-types/new" />}
              size="sm"
              className="mt-4 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Crear tipo de evento
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
