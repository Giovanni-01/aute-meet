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

// Columns added by the bookings migration (may not exist if migration hasn't been run)
const SELECT_NEW_COLS = ", host_notes, cancellation_reason, readai_notes, readai_report_url"
const SELECT_BASE =
  "id, attendee_name, attendee_email, attendee_notes, guest_emails, start_time, end_time, meet_link, google_event_id, status, event_types(id, title, slug, duration_minutes, color)"

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

  // Build a typed query given a select string
  async function runQuery(selectStr: string) {
    let q = supabase
      .from("bookings")
      .select(selectStr)
      .eq("host_user_id", user!.id)

    if (filter === "upcoming") {
      return q.eq("status", "confirmed").gte("start_time", now).order("start_time", { ascending: true })
    } else if (filter === "past") {
      return q.eq("status", "confirmed").lt("start_time", now).order("start_time", { ascending: false })
    } else {
      return q.eq("status", "cancelled").order("start_time", { ascending: false })
    }
  }

  // Try with new columns; fall back if the migration hasn't been applied yet
  const fullResult = await runQuery(SELECT_BASE + SELECT_NEW_COLS)

  let items: BookingDetailData[]

  if (fullResult.error) {
    // New columns missing — retry without them and fill in null defaults
    const fallback = await runQuery(SELECT_BASE)
    items = ((fallback.data ?? []) as unknown as BookingDetailData[]).map((b) => ({
      ...b,
      host_notes: null,
      cancellation_reason: null,
      readai_notes: null,
      readai_report_url: null,
    }))
  } else {
    items = (fullResult.data as unknown as BookingDetailData[] | null) ?? []
  }

  const profileResult = await supabase
    .from("profiles")
    .select("username, timezone")
    .eq("id", user.id)
    .single()

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
