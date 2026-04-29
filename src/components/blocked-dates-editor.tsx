"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Ban, Loader2, Plus, Trash2 } from "lucide-react"

interface BlockedDate {
  id: string
  start_date: string
  end_date: string
  reason: string | null
}

interface BlockedDatesEditorProps {
  initialDates: BlockedDate[]
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateStr + "T12:00:00Z"))
}

export function BlockedDatesEditor({ initialDates }: BlockedDatesEditorProps) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)

  const [dates, setDates] = useState<BlockedDate[]>(initialDates)
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [reason, setReason] = useState("")
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setError(null)

    try {
      const res = await fetch("/api/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_date: startDate, end_date: endDate, reason: reason || null }),
      })
      const json = await res.json()

      if (res.ok) {
        setDates((prev) =>
          [...prev, json].sort((a, b) => a.start_date.localeCompare(b.start_date))
        )
        setReason("")
        router.refresh()
      } else {
        setError(json.error ?? "Error al guardar")
      }
    } catch {
      setError("Error de red. Inténtalo de nuevo.")
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/blocked-dates/${id}`, { method: "DELETE" })
      if (res.ok) {
        setDates((prev) => prev.filter((d) => d.id !== id))
        router.refresh()
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <form onSubmit={handleAdd} className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#64797C]">Desde</label>
            <input
              type="date"
              value={startDate}
              min={today}
              onChange={(e) => {
                setStartDate(e.target.value)
                if (e.target.value > endDate) setEndDate(e.target.value)
              }}
              className="rounded-lg border border-[#C2CDCF] px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#64797C] focus:outline-none focus:ring-1 focus:ring-[#64797C]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#64797C]">Hasta</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-[#C2CDCF] px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#64797C] focus:outline-none focus:ring-1 focus:ring-[#64797C]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#64797C] invisible">Añadir</label>
            <Button type="submit" disabled={adding} size="sm" className="h-[38px] gap-1.5">
              {adding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Bloquear
            </Button>
          </div>
        </div>

        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={200}
          placeholder="Motivo (opcional): vacaciones, formación…"
          className="w-full rounded-lg border border-[#C2CDCF] px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#8A9F9F] focus:border-[#64797C] focus:outline-none focus:ring-1 focus:ring-[#64797C]"
        />

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </form>

      {/* List */}
      {dates.length === 0 ? (
        <p className="text-sm text-[#8A9F9F]">No hay fechas bloqueadas.</p>
      ) : (
        <ul className="space-y-2">
          {dates.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/60 px-4 py-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Ban className="h-4 w-4 shrink-0 text-red-400" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#37585A]">
                    {d.start_date === d.end_date
                      ? formatDate(d.start_date)
                      : `${formatDate(d.start_date)} – ${formatDate(d.end_date)}`}
                  </p>
                  {d.reason && (
                    <p className="truncate text-xs text-[#8A9F9F]">{d.reason}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(d.id)}
                disabled={deletingId === d.id}
                className="shrink-0 text-[#8A9F9F] hover:text-red-600 disabled:opacity-50"
                aria-label="Eliminar fecha bloqueada"
              >
                {deletingId === d.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
