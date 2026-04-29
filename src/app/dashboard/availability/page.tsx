import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { AvailabilityEditor } from "@/components/availability-editor"
import { ArrowLeft } from "lucide-react"

export default async function AvailabilityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: rules } = await supabase
    .from("availability_rules")
    .select("day_of_week, start_time, end_time")
    .eq("user_id", user.id)
    .order("day_of_week")
    .order("start_time")

  // Normalize time format: Supabase returns "HH:MM:SS", we need "HH:MM"
  const normalizedRules = (rules ?? []).map((r) => ({
    day_of_week: r.day_of_week,
    start_time: r.start_time.slice(0, 5),
    end_time: r.end_time.slice(0, 5),
  }))

  return (
    <div className="min-h-screen bg-[#F7F8F8]">
      <header className="border-b border-[#C2CDCF] bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <Link
            href="/dashboard"
            className="text-[#8A9F9F] hover:text-[#64797C]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-[#37585A]">
            Disponibilidad
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <p className="mb-6 text-sm text-[#8A9F9F]">
          Configura las franjas horarias en las que estás disponible para
          reuniones. Las personas solo podrán reservar dentro de estos horarios.
        </p>
        <div className="rounded-2xl border border-[#C2CDCF] bg-white p-6 shadow-card">
          <AvailabilityEditor initialRules={normalizedRules} />
        </div>
      </main>
    </div>
  )
}
