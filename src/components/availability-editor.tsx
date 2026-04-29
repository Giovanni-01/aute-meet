"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, X, CheckCircle } from "lucide-react"

const DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
]

interface Rule {
  day_of_week: number
  start_time: string
  end_time: string
}

interface AvailabilityEditorProps {
  initialRules: Rule[]
}

export function AvailabilityEditor({ initialRules }: AvailabilityEditorProps) {
  const router = useRouter()
  const [rules, setRules] = useState<Rule[]>(initialRules)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  function addRule(day: number) {
    // Default: 09:00 - 14:00 if no rules for that day, else 16:00 - 19:00
    const dayRules = rules.filter((r) => r.day_of_week === day)
    const start = dayRules.length === 0 ? "09:00" : "16:00"
    const end = dayRules.length === 0 ? "14:00" : "19:00"
    setRules([...rules, { day_of_week: day, start_time: start, end_time: end }])
    setSaved(false)
  }

  function removeRule(index: number) {
    setRules(rules.filter((_, i) => i !== index))
    setSaved(false)
  }

  function updateRule(
    index: number,
    field: "start_time" | "end_time",
    value: string
  ) {
    const updated = [...rules]
    updated[index] = { ...updated[index], [field]: value }
    setRules(updated)
    setSaved(false)
  }

  function copyToWeekdays(sourceDay: number) {
    const sourceRules = rules.filter((r) => r.day_of_week === sourceDay)
    if (sourceRules.length === 0) return

    const weekdays = [0, 1, 2, 3, 4] // Mon-Fri
    const nonSourceRules = rules.filter(
      (r) => !weekdays.includes(r.day_of_week) || r.day_of_week === sourceDay
    )
    const copied = weekdays
      .filter((d) => d !== sourceDay)
      .flatMap((d) =>
        sourceRules.map((r) => ({ ...r, day_of_week: d }))
      )

    setRules([...nonSourceRules, ...copied])
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError("")
    setSaved(false)

    try {
      const res = await fetch("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      })

      if (res.ok) {
        setSaved(true)
        router.refresh()
      } else {
        const data = await res.json()
        if (data.errors) {
          setError(
            data.errors.map((e: { message: string }) => e.message).join(". ")
          )
        } else {
          setError(data.error ?? "Error al guardar")
        }
      }
    } catch {
      setError("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle className="h-4 w-4" />
          Disponibilidad guardada correctamente.
        </div>
      )}

      {DAYS.map((dayName, dayIndex) => {
        const dayRules = rules
          .map((r, i) => ({ ...r, _index: i }))
          .filter((r) => r.day_of_week === dayIndex)
          .sort((a, b) => a.start_time.localeCompare(b.start_time))

        return (
          <div key={dayIndex} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-700">{dayName}</h3>
              <div className="flex items-center gap-2">
                {dayIndex < 5 && dayRules.length > 0 && (
                  <button
                    type="button"
                    onClick={() => copyToWeekdays(dayIndex)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Copiar a L-V
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => addRule(dayIndex)}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  <Plus className="h-3 w-3" />
                  Añadir franja
                </button>
              </div>
            </div>

            {dayRules.length === 0 ? (
              <p className="text-xs text-slate-400">No disponible</p>
            ) : (
              <div className="space-y-2">
                {dayRules.map((rule) => (
                  <div
                    key={rule._index}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="time"
                      value={rule.start_time}
                      onChange={(e) =>
                        updateRule(rule._index, "start_time", e.target.value)
                      }
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                    <span className="text-sm text-slate-400">—</span>
                    <input
                      type="time"
                      value={rule.end_time}
                      onChange={(e) =>
                        updateRule(rule._index, "end_time", e.target.value)
                      }
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeRule(rule._index)}
                      className="text-slate-400 hover:text-red-500"
                      aria-label="Eliminar franja"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {dayIndex < 6 && (
              <div className="border-b border-slate-100 pt-2" />
            )}
          </div>
        )
      })}

      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar disponibilidad
        </Button>
      </div>
    </div>
  )
}
