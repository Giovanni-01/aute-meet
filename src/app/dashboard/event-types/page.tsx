import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { DeleteEventTypeButton } from "@/components/delete-event-type-button"
import { ToggleActiveButton } from "@/components/toggle-active-button"
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  Clock,
  Pencil,
  Plus,
} from "lucide-react"

interface PageProps {
  searchParams: Promise<{ saved?: string }>
}

type EventType = {
  id: string
  title: string
  slug: string
  description: string | null
  duration_minutes: number
  buffer_before_minutes: number
  buffer_after_minutes: number
  color: string
  is_active: boolean
  created_at: string
}

export default async function EventTypesPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: eventTypes } = await supabase
    .from("event_types")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const items = (eventTypes as EventType[] | null) ?? []
  const { saved } = await searchParams

  // Get username for the public URL preview
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single()

  const username = profile?.username ?? "tu-usuario"

  return (
    <div className="min-h-screen bg-[#F7F8F8]">
      <header className="border-b border-[#C2CDCF] bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-[#8A9F9F] hover:text-[#64797C]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-semibold text-[#37585A]">
              Tipos de evento
            </h1>
          </div>
          <Button render={<Link href="/dashboard/event-types/new" />} size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Nuevo
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {saved === "1" && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            Tipo de evento guardado correctamente.
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#C2CDCF] bg-white px-6 py-16 text-center">
            <CalendarDays className="mb-4 h-10 w-10 text-[#C2CDCF]" />
            <p className="text-sm font-medium text-[#64797C]">
              No tienes tipos de evento
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
        ) : (
          /* Cal.com style: one shared card with rows, not individual cards */
          <div className="overflow-hidden rounded-2xl border border-[#C2CDCF] bg-white shadow-card">
            {items.map((et, idx) => (
              <div
                key={et.id}
                className={`flex items-center gap-0 ${
                  idx < items.length - 1 ? "border-b border-[#C2CDCF]" : ""
                }`}
              >
                {/* Event type color strip — 3px left border */}
                <div
                  className="w-1 self-stretch shrink-0"
                  style={{ backgroundColor: et.color }}
                />

                {/* Content */}
                <div className="flex flex-1 items-center justify-between px-5 py-4 min-w-0">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span
                      className={`text-sm font-medium ${
                        et.is_active ? "text-[#37585A]" : "text-[#8A9F9F]"
                      }`}
                    >
                      {et.title}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-[#8A9F9F]">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>{et.duration_minutes} min</span>
                      <span>·</span>
                      <span className="truncate">/{username}/{et.slug}</span>
                    </div>
                  </div>

                  <div className="ml-4 flex shrink-0 items-center gap-2">
                    <ToggleActiveButton
                      eventTypeId={et.id}
                      isActive={et.is_active}
                    />
                    <Button
                      render={
                        <Link href={`/dashboard/event-types/${et.id}/edit`} />
                      }
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-[#8A9F9F] hover:text-[#64797C]"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <DeleteEventTypeButton
                      eventTypeId={et.id}
                      title={et.title}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
