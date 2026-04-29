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
    <main className="min-h-screen bg-[#F7F8F8] py-16 px-6">
      <div className="mx-auto max-w-xl">
        {/* Host info */}
        <div className="flex flex-col items-center gap-4 text-center">
          <Avatar className="h-20 w-20">
            <AvatarImage src={p.avatar_url ?? undefined} alt={p.full_name} />
            <AvatarFallback className="bg-[#64797C] text-xl font-medium text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-[#37585A]">
              {p.full_name}
            </h1>
            {p.bio && (
              <p className="max-w-sm text-sm text-[#8A9F9F]">{p.bio}</p>
            )}
          </div>
        </div>

        {/* Event type list */}
        <div className="mt-10 flex flex-col gap-3">
          {events.length === 0 && (
            <p className="text-center text-sm text-[#8A9F9F]">
              Este usuario no tiene tipos de evento disponibles.
            </p>
          )}

          {events.map((et) => (
            <Link
              key={et.id}
              href={`/${p.username}/${et.slug}`}
              className="group flex items-center gap-4 rounded-2xl border border-[#C2CDCF] bg-white px-5 py-4 shadow-card transition-colors hover:border-[#8A9F9F]"
            >
              <div
                className="h-10 w-1.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: et.color }}
              />
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium text-[#37585A] group-hover:text-[#64797C]">
                  {et.title}
                </span>
                {et.description && (
                  <span className="line-clamp-1 text-xs text-[#8A9F9F]">
                    {et.description}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="flex items-center gap-1 text-xs text-[#8A9F9F]">
                  <Clock className="h-3.5 w-3.5" />
                  {et.duration_minutes} min
                </div>
                <span className="text-xs font-medium text-[#64797C] group-hover:text-[#37585A] transition-colors">
                  Reservar →
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Aute Meet branding */}
        <div className="mt-10 flex items-center justify-center gap-2 text-xs text-[#C2CDCF]">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Powered by Aute Meet</span>
        </div>
      </div>
    </main>
  )
}
