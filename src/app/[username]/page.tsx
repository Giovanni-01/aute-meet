import { notFound } from "next/navigation"
import Link from "next/link"
import { createServiceClient } from "@/lib/supabase/service"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CalendarDays, Clock } from "lucide-react"

type PageProps = { params: Promise<{ username: string }> }

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params
  const db = createServiceClient()

  // ── Load profile ────────────────────────────────────────────────────────────
  const { data: profile } = await db
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio")
    .eq("username", username)
    .single()

  if (!profile) notFound()

  const p = profile as {
    id: string
    username: string
    full_name: string
    avatar_url: string | null
    bio: string | null
  }

  // ── Load active event types ─────────────────────────────────────────────────
  const { data: eventTypes } = await db
    .from("event_types")
    .select("id, title, slug, duration_minutes, color, description")
    .eq("user_id", p.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })

  const events = (eventTypes ?? []) as Array<{
    id: string
    title: string
    slug: string
    duration_minutes: number
    color: string
    description: string | null
  }>

  const initials = p.full_name
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <main className="min-h-screen bg-[#F7F8F8] px-6 py-16">
      <div className="mx-auto max-w-xl">
        {/* Profile card */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-[#C2CDCF] bg-white p-8 shadow-card">
          <div className="flex items-center gap-5">
            <Avatar className="h-16 w-16 shrink-0">
              <AvatarImage src={p.avatar_url ?? undefined} alt={p.full_name} />
              <AvatarFallback className="bg-[#64797C] text-lg font-medium text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1 min-w-0">
              <h1 className="text-xl font-semibold text-[#37585A]">
                {p.full_name}
              </h1>
              {p.bio && (
                <p className="text-sm text-[#8A9F9F]">{p.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Event type list */}
        {events.length === 0 ? (
          <p className="text-center text-sm text-[#8A9F9F]">
            Este usuario no tiene tipos de evento disponibles.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#C2CDCF] bg-white shadow-card">
            {events.map((et, i) => (
              <Link
                key={et.id}
                href={`/${p.username}/${et.slug}`}
                className={`group flex items-stretch transition-colors hover:bg-[#F7F8F8]${i < events.length - 1 ? " border-b border-[#C2CDCF]" : ""}`}
              >
                {/* Color bar */}
                <div
                  className="w-1 shrink-0"
                  style={{ backgroundColor: et.color }}
                />

                {/* Content */}
                <div className="flex flex-1 items-center justify-between gap-4 px-5 py-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-medium text-[#37585A] group-hover:text-[#64797C] transition-colors">
                      {et.title}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[#8A9F9F]">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {et.duration_minutes} min
                    </span>
                    {et.description && (
                      <span className="text-sm text-[#8A9F9F] line-clamp-2">
                        {et.description}
                      </span>
                    )}
                  </div>

                  {/* Book button */}
                  <span className="shrink-0 rounded-lg border border-[#C2CDCF] px-3 py-1.5 text-sm font-medium text-[#64797C] transition-colors group-hover:border-[#64797C] group-hover:bg-[#64797C] group-hover:text-white">
                    Reservar ahora →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Footer branding */}
        <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-[#C2CDCF]">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Powered by Aute Meet</span>
        </div>
      </div>
    </main>
  )
}
