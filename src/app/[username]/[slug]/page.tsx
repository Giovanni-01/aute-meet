import { notFound } from "next/navigation"
import { createServiceClient } from "@/lib/supabase/service"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BookingWidget } from "@/components/booking-widget"
import { CalendarDays, Clock } from "lucide-react"
import { Separator } from "@/components/ui/separator"

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

  const initials = p.full_name
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  // Human-readable timezone label
  const tzLabel = new Intl.DateTimeFormat("es-ES", {
    timeZoneName: "long",
    timeZone: timezone,
  })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName")?.value

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid max-w-5xl gap-0 px-6 py-12 md:grid-cols-[300px_1fr] md:gap-12">
        {/* ── Left: host + event info ─────────────────────────────────────── */}
        <aside className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={p.avatar_url ?? undefined} alt={p.full_name} />
              <AvatarFallback className="bg-slate-200 text-sm font-medium text-slate-600">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-900">
                {p.full_name}
              </span>
              {p.bio && (
                <span className="text-xs text-slate-400 line-clamp-1">
                  {p.bio}
                </span>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <div
              className="h-1.5 w-12 rounded-full"
              style={{ backgroundColor: eventType.color }}
            />
            <h1 className="text-xl font-semibold text-slate-900">
              {eventType.title}
            </h1>
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <Clock className="h-4 w-4" />
              <span>{eventType.duration_minutes} minutos</span>
            </div>
            {eventType.description && (
              <p className="text-sm text-slate-500 leading-relaxed">
                {eventType.description}
              </p>
            )}
            {tzLabel && (
              <p className="text-xs text-slate-400">
                Horarios en zona horaria: {tzLabel}
              </p>
            )}
          </div>

          {/* Branding */}
          <div className="mt-auto flex items-center gap-1.5 text-xs text-slate-300 pt-4">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Powered by Aute Meet</span>
          </div>
        </aside>

        {/* ── Right: booking widget ───────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <BookingWidget
            username={username}
            slug={slug}
            timezone={timezone}
            availableDayOfWeeks={availableDayOfWeeks}
            durationMinutes={eventType.duration_minutes}
          />
        </section>
      </div>
    </main>
  )
}
