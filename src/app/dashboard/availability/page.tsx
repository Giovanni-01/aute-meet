import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AvailabilityEditor } from "@/components/availability-editor"
import { BlockedDatesEditor } from "@/components/blocked-dates-editor"

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
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="grid grid-cols-[3fr_2fr] gap-6 items-start">
        {/* Left column — weekly availability */}
        <div className="rounded-2xl border border-[#C2CDCF] bg-white p-6 shadow-card">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64797C]">
            Horario semanal
          </h2>
          <p className="mb-4 text-sm text-[#8A9F9F]">
            Configura las franjas horarias en las que estás disponible para reuniones.
          </p>
          <AvailabilityEditor initialRules={normalizedRules} />
        </div>

        {/* Right column — blocked dates */}
        <div className="rounded-2xl border border-[#C2CDCF] bg-white p-6 shadow-card">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64797C]">
            Fechas bloqueadas
          </h2>
          <p className="mb-4 text-sm text-[#8A9F9F]">
            Bloquea días o rangos (vacaciones, festivos…) en los que nadie podrá reservar.
          </p>
          <BlockedDatesEditor initialDates={blockedDates} />
        </div>
      </div>
    </main>
  )
}
