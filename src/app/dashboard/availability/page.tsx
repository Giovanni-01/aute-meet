import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { AvailabilityEditor } from "@/components/availability-editor"
import { BlockedDatesEditor } from "@/components/blocked-dates-editor"
import { ChevronRight } from "lucide-react"

export default async function AvailabilityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [rulesResult, blockedResult] = await Promise.all([
    supabase
      .from("availability_rules")
      .select("day_of_week, start_time, end_time")
      .eq("user_id", user.id)
      .order("day_of_week")
      .order("start_time"),
    supabase
      .from("blocked_dates")
      .select("id, start_date, end_date, reason")
      .eq("user_id", user.id)
      .order("start_date", { ascending: true }),
  ])

  // Normalize time format: Supabase returns "HH:MM:SS", we need "HH:MM"
  const normalizedRules = (rulesResult.data ?? []).map((r) => ({
    day_of_week: r.day_of_week,
    start_time: r.start_time.slice(0, 5),
    end_time: r.end_time.slice(0, 5),
  }))

  const blockedDates = (blockedResult.data ?? []) as Array<{
    id: string
    start_date: string
    end_date: string
    reason: string | null
  }>

  return (
    <div className="min-h-screen bg-[#F7F8F8]">
      <header className="border-b border-[#C2CDCF] bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <nav className="flex items-center gap-1.5 text-sm">
            <Link href="/dashboard" className="text-[#8A9F9F] transition-colors hover:text-[#64797C]">
              Dashboard
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-[#C2CDCF]" />
            <span className="font-semibold text-[#37585A]">Disponibilidad</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        {/* Weekly availability */}
        <section>
          <p className="mb-4 text-sm text-[#8A9F9F]">
            Configura las franjas horarias en las que estás disponible para
            reuniones. Las personas solo podrán reservar dentro de estos horarios.
          </p>
          <div className="rounded-2xl border border-[#C2CDCF] bg-white p-6 shadow-card">
            <AvailabilityEditor initialRules={normalizedRules} />
          </div>
        </section>

        {/* Blocked dates */}
        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64797C]">
            Fechas bloqueadas
          </h2>
          <p className="mb-4 text-sm text-[#8A9F9F]">
            Bloquea días concretos o rangos (vacaciones, festivos…). Nadie podrá reservar en esas fechas aunque estén dentro de tu horario habitual.
          </p>
          <div className="rounded-2xl border border-[#C2CDCF] bg-white p-6 shadow-card">
            <BlockedDatesEditor initialDates={blockedDates} />
          </div>
        </section>
      </main>
    </div>
  )
}
