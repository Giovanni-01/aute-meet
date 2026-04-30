import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { EventTypeForm } from "@/components/event-type-form"

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
    <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-2xl border border-[#C2CDCF] bg-white p-6 shadow-card">
          <EventTypeForm initialData={eventType} />
        </div>
    </main>
  )
}
