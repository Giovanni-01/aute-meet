import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { EventTypeForm } from "@/components/event-type-form"

export default async function NewEventTypePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-2xl border border-[#C2CDCF] bg-white p-6 shadow-card">
          <EventTypeForm />
        </div>
    </main>
  )
}
