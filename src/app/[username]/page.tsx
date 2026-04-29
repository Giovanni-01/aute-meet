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
    <main className="min-h-screen bg-slate-50 py-16 px-6">
      <div className="mx-auto max-w-xl">
        {/* Host info */}
        <div className="flex flex-col items-center gap-4 text-center">
          <Avatar className="h-20 w-20">
            <AvatarImage src={p.avatar_url ?? undefined} alt={p.full_name} />
            <AvatarFallback className="bg-slate-200 text-xl font-medium text-slate-600">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-slate-900">
              {p.full_name}
            </h1>
            {p.bio && (
              <p className="max-w-sm text-sm text-slate-500">{p.bio}</p>
            )}
          </div>
        </div>

        {/* Event type list */}
        <div className="mt-10 flex flex-col gap-3">
          {events.length === 0 && (
            <p className="text-center text-sm text-slate-400">
              Este usuario no tiene tipos de evento disponibles.
            </p>
          )}

          {events.map((et) => (
            <Link
              key={et.id}
              href={`/${p.username}/${et.slug}`}
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-slate-300"
            >
              <div
                className="h-10 w-1.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: et.color }}
              />
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium text-slate-900 group-hover:text-slate-700">
                  {et.title}
                </span>
                {et.description && (
                  <span className="line-clamp-1 text-xs text-slate-400">
                    {et.description}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                {et.duration_minutes} min
              </div>
            </Link>
          ))}
        </div>

        {/* Aute Meet branding */}
        <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-300">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Powered by Aute Meet</span>
        </div>
      </div>
    </main>
  )
}
