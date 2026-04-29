import { notFound } from "next/navigation"
import { createServiceClient } from "@/lib/supabase/service"
import { BookingWidget } from "@/components/booking-widget"
import { CalendarDays } from "lucide-react"

type PageProps = { params: Promise<{ username: string; slug: string }> }

export default async function BookingPage({ params }: PageProps) {
  const { username, slug } = await params
  const db = createServiceClient()

  // ── Load profile ────────────────────────────────────────────────────────────
  const { data: profile } = await db
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, timezone")
    .eq("username", username)
    .single()

  if (!profile) notFound()

  const p = profile as {
    id: string
    username: string
    full_name: string
    avatar_url: string | null
    bio: string | null
    timezone: string
  }

  const timezone = p.timezone ?? "Europe/Madrid"

  // ── Load event type ─────────────────────────────────────────────────────────
  const { data: et } = await db
    .from("event_types")
    .select("id, title, slug, duration_minutes, color, description")
    .eq("user_id", p.id)
    .eq("slug", slug)
    .eq("is_active", true)
    .single()

  if (!et) notFound()

  const eventType = et as {
    id: string
    title: string
    slug: string
    duration_minutes: number
    color: string
    description: string | null
  }

  // ── Load availability rules (to tell the widget which days are bookable) ──
  const { data: rules } = await db
    .from("availability_rules")
    .select("day_of_week")
    .eq("user_id", p.id)

  const availableDayOfWeeks = [
    ...new Set((rules ?? []).map((r: { day_of_week: number }) => r.day_of_week)),
  ]

  // Human-readable timezone label
  const tzLabel = new Intl.DateTimeFormat("es-ES", {
    timeZoneName: "long",
    timeZone: timezone,
  })
    .formatToParts(new Date())
    .find((part) => part.type === "timeZoneName")?.value

  return (
    <main className="min-h-screen bg-[#F7F8F8]">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-5xl">
          {/* Main booking card — Cal.com style single card */}
          <div className="overflow-hidden rounded-2xl border border-[#C2CDCF] bg-white shadow-card">
            <BookingWidget
              username={username}
              slug={slug}
              timezone={timezone}
              availableDayOfWeeks={availableDayOfWeeks}
              durationMinutes={eventType.duration_minutes}
              hostName={p.full_name}
              hostAvatarUrl={p.avatar_url}
              hostBio={p.bio}
              eventTypeTitle={eventType.title}
              eventTypeColor={eventType.color}
              eventTypeDescription={eventType.description}
              tzLabel={tzLabel}
            />
          </div>

          {/* Footer branding */}
          <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-[#C2CDCF]">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Powered by Aute Meet</span>
          </div>
        </div>
      </div>
    </main>
  )
}
