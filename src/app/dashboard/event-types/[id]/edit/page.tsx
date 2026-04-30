import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { EventTypeForm } from "@/components/event-type-form"
import { ChevronRight } from "lucide-react"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditEventTypePage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: eventType } = await supabase
    .from("event_types")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!eventType) notFound()

  return (
    <div className="min-h-screen bg-[#F7F8F8]">
      <header className="border-b border-[#C2CDCF] bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <nav className="flex items-center gap-1.5 text-sm">
            <Link href="/dashboard" className="text-[#8A9F9F] transition-colors hover:text-[#64797C]">
              Dashboard
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-[#C2CDCF]" />
            <Link href="/dashboard/event-types" className="text-[#8A9F9F] transition-colors hover:text-[#64797C]">
              Tipos de evento
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-[#C2CDCF]" />
            <span className="font-semibold text-[#37585A]">{eventType.title}</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-2xl border border-[#C2CDCF] bg-white p-6 shadow-card">
          <EventTypeForm initialData={eventType} />
        </div>
      </main>
    </div>
  )
}
