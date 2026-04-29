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
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-slate-400 hover:text-slate-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-semibold text-slate-900">
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
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <CalendarDays className="mb-4 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">
              No tienes tipos de evento
            </p>
            <p className="mt-1 text-sm text-slate-400">
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
          <div className="space-y-3">
            {items.map((et) => (
              <div
                key={et.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: et.color }}
                  />
                  <div className="flex flex-col">
                    <span
                      className={`text-sm font-medium ${
                        et.is_active ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {et.title}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      <span>{et.duration_minutes} min</span>
                      <span>·</span>
                      <span>/{username}/{et.slug}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ToggleActiveButton
                    eventTypeId={et.id}
                    isActive={et.is_active}
                  />
                  <Button
                    render={
                      <Link
                        href={`/dashboard/event-types/${et.id}/edit`}
                      />
                    }
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <DeleteEventTypeButton
                    eventTypeId={et.id}
                    title={et.title}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
