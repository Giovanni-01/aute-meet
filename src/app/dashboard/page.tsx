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

  // Fetch the user's calendar connections (RLS ensures only their rows)
  const { data: connections } = await supabase
    .from("calendar_connections")
    .select("id, provider, provider_account_email, token_expires_at, created_at")
    .eq("provider", "google")
    .order("created_at", { ascending: false })

  const googleConnection = (connections as CalendarConnection[] | null)?.[0] ?? null

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
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl bg-slate-900 p-2">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-semibold text-slate-900">
              Aute Meet
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-slate-200 text-xs text-slate-600">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col sm:flex">
                <span className="text-sm font-medium text-slate-900">
                  {displayName}
                </span>
                <span className="text-xs text-slate-500">{user.email}</span>
              </div>
            </div>

            <form action="/auth/signout" method="post">
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="gap-2 text-slate-500 hover:text-slate-900"
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
          <h1 className="text-2xl font-semibold text-slate-900">
            Bienvenido, {displayName.split(" ")[0]}
          </h1>
          <p className="text-slate-500">
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
          <h2 className="mb-3 text-sm font-medium text-slate-700">
            Calendarios conectados
          </h2>

          {googleConnection ? (
            /* Connected state */
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                  <Calendar className="h-5 w-5 text-slate-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-900">
                    Google Calendar
                  </span>
                  <span className="text-xs text-slate-500">
                    {googleConnection.provider_account_email}
                  </span>
                  {googleConnection.token_expires_at && (
                    <span className="text-xs text-slate-400">
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
            /* Disconnected state */
            <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                  <Calendar className="h-5 w-5 text-slate-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-700">
                    Google Calendar
                  </span>
                  <span className="text-xs text-slate-400">
                    No conectado
                  </span>
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

        {/* ── Event types placeholder ── */}
        <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <CalendarDays className="mb-4 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">
            Todavía no tienes tipos de evento
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Pronto podrás crear y gestionar tus reuniones desde aquí.
          </p>
        </div>
      </main>
    </div>
  )
}
