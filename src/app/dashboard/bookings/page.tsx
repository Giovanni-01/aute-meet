import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { BookingDetail, BookingDetailData } from "@/components/booking-detail"
import { CalendarDays } from "lucide-react"

interface PageProps {
  searchParams: Promise<{ filter?: string }>
}

const TABS = [
  { key: "upcoming", label: "Próximas" },
  { key: "past", label: "Pasadas" },
  { key: "cancelled", label: "Canceladas" },
] as const

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
      "id, attendee_name, attendee_email, attendee_notes, guest_emails, start_time, end_time, meet_link, google_event_id, status, host_notes, cancellation_reason, readai_notes, readai_report_url, event_types(id, title, slug, duration_minutes, color)"
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

  const items = (bookingsResult.data as BookingDetailData[] | null) ?? []
  const timezone = (profileResult.data?.timezone as string | undefined) ?? "Europe/Madrid"
  const username = (profileResult.data?.username as string | undefined) ?? ""

  return (
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
          {items.map((booking) => (
            <BookingDetail
              key={booking.id}
              booking={booking}
              filter={filter}
              timezone={timezone}
              username={username}
            />
          ))}
        </div>
      )}
    </main>
  )
}
