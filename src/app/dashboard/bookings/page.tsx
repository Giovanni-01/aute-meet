import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { CancelBookingButton } from "@/components/cancel-booking-button"
import { RescheduleModalTrigger } from "@/components/reschedule-modal-trigger"
import { ChevronRight, CalendarDays, Clock, Video } from "lucide-react"

interface PageProps {
  searchParams: Promise<{ filter?: string }>
}

type Booking = {
  id: string
  attendee_name: string
  attendee_email: string
  attendee_notes: string | null
  start_time: string
  end_time: string
  meet_link: string | null
  status: string
  event_types: {
    id: string
    title: string
    slug: string
    duration_minutes: number
    color: string
  } | null
}

const TABS = [
  { key: "upcoming", label: "Próximas" },
  { key: "past", label: "Pasadas" },
  { key: "cancelled", label: "Canceladas" },
] as const

function formatDateTime(isoString: string, timezone?: string) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(isoString))
}

export default async function BookingsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { filter: rawFilter } = await searchParams
  const filter =
    rawFilter === "past" || rawFilter === "cancelled" ? rawFilter : "upcoming"

  const now = new Date().toISOString()

  let query = supabase
    .from("bookings")
    .select(
      "id, attendee_name, attendee_email, attendee_notes, start_time, end_time, meet_link, status, event_types(id, title, slug, duration_minutes, color)"
    )
    .eq("host_user_id", user.id)

  if (filter === "upcoming") {
    query = query.eq("status", "confirmed").gte("start_time", now)
    query = query.order("start_time", { ascending: true })
  } else if (filter === "past") {
    query = query.eq("status", "confirmed").lt("start_time", now)
    query = query.order("start_time", { ascending: false })
  } else {
    query = query.eq("status", "cancelled")
    query = query.order("start_time", { ascending: false })
  }

  const [bookingsResult, profileResult] = await Promise.all([
    query,
    supabase.from("profiles").select("username, timezone").eq("id", user.id).single(),
  ])

  const items = (bookingsResult.data as Booking[] | null) ?? []
  const timezone = (profileResult.data?.timezone as string | undefined) ?? "Europe/Madrid"
  const username = (profileResult.data?.username as string | undefined) ?? ""

  return (
    <div className="min-h-screen bg-[#F7F8F8]">
      <header className="border-b border-[#C2CDCF] bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <nav className="flex items-center gap-1.5 text-sm">
            <Link href="/dashboard" className="text-[#8A9F9F] transition-colors hover:text-[#64797C]">
              Dashboard
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-[#C2CDCF]" />
            <span className="font-semibold text-[#37585A]">Reservas</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Filter tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-[#C2CDCF] bg-white p-1 shadow-card">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={`/dashboard/bookings?filter=${tab.key}`}
              className={`flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors ${
                filter === tab.key
                  ? "bg-[#64797C] text-white"
                  : "text-[#8A9F9F] hover:text-[#37585A]"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Booking list */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#C2CDCF] bg-white px-6 py-16 text-center">
            <CalendarDays className="mb-4 h-10 w-10 text-[#C2CDCF]" />
            <p className="text-sm font-medium text-[#64797C]">
              {filter === "upcoming"
                ? "No tienes próximas reservas"
                : filter === "past"
                  ? "No hay reservas pasadas"
                  : "No hay reservas canceladas"}
            </p>
            {filter === "upcoming" && (
              <p className="mt-1 text-sm text-[#8A9F9F]">
                Comparte tu enlace público para que puedan agendarte.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((booking) => {
              const et = booking.event_types
              return (
                <div
                  key={booking.id}
                  className="overflow-hidden rounded-2xl border border-[#C2CDCF] bg-white shadow-card"
                >
                  <div className="flex items-stretch gap-0">
                    {/* Color strip */}
                    <div
                      className="w-1 shrink-0"
                      style={{ backgroundColor: et?.color ?? "#64797C" }}
                    />

                    <div className="flex flex-1 flex-col gap-3 px-5 py-4">
                      {/* Top row: event type + status */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#64797C]">
                          {et?.title ?? "Evento"}
                        </span>
                        {booking.status === "cancelled" && (
                          <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                            Cancelada
                          </span>
                        )}
                      </div>

                      {/* Attendee */}
                      <div>
                        <p className="text-sm font-medium text-[#37585A]">
                          {booking.attendee_name}
                        </p>
                        <p className="text-xs text-[#8A9F9F]">
                          {booking.attendee_email}
                        </p>
                        {booking.attendee_notes && (
                          <p className="mt-1 text-xs text-[#8A9F9F] italic">
                            &ldquo;{booking.attendee_notes}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Date + duration + Meet */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#8A9F9F]">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                          {formatDateTime(booking.start_time, timezone)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {et?.duration_minutes ?? "?"} min
                        </span>
                        {booking.meet_link && (
                          <a
                            href={booking.meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 font-medium text-[#64797C] hover:text-[#37585A]"
                          >
                            <Video className="h-3.5 w-3.5 shrink-0" />
                            Google Meet
                          </a>
                        )}
                      </div>

                      {/* Actions (upcoming confirmed only) */}
                      {booking.status === "confirmed" && filter === "upcoming" && (
                        <div className="flex items-center justify-end gap-2 border-t border-[#C2CDCF] pt-3">
                          {et?.slug && (
                            <RescheduleModalTrigger
                              bookingId={booking.id}
                              username={username}
                              slug={et.slug}
                              timezone={timezone}
                              attendeeName={booking.attendee_name}
                              currentStartTime={booking.start_time}
                            />
                          )}
                          <CancelBookingButton
                            bookingId={booking.id}
                            attendeeName={booking.attendee_name}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
