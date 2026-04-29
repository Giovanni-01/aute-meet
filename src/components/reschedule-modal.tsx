"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  addDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isBefore,
  isAfter,
  isSameDay,
  format,
  parseISO,
  startOfDay,
} from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Mini calendar (self-contained) ──────────────────────────────────────────

const DAY_INITIALS = ["L", "M", "X", "J", "V", "S", "D"]

function capitalizeFirst(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function mondayFirstDow(date: Date) {
  return (getDay(date) + 6) % 7
}

interface MiniCalProps {
  currentMonth: Date
  selectedDate: string | null
  onSelectDate: (date: string) => void
  onPrev: () => void
  onNext: () => void
}

function MiniCal({ currentMonth, selectedDate, onSelectDate, onPrev, onNext }: MiniCalProps) {
  const today = startOfDay(new Date())
  const maxDate = addDays(today, 60)
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const leadingPad = mondayFirstDow(monthStart)
  const canPrev = isAfter(monthStart, today)
  const canNext = isBefore(monthStart, startOfMonth(maxDate))

  const monthLabel = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(currentMonth)

  return (
    <div className="select-none w-full">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={onPrev}
          disabled={!canPrev}
          className={cn(
            "rounded-lg p-1.5 text-[#64797C] transition-colors hover:bg-[#F5F5F5]",
            !canPrev && "cursor-default opacity-30"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-[#37585A]">
          {capitalizeFirst(monthLabel)}
        </span>
        <button
          onClick={onNext}
          disabled={!canNext}
          className={cn(
            "rounded-lg p-1.5 text-[#64797C] transition-colors hover:bg-[#F5F5F5]",
            !canNext && "cursor-default opacity-30"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {DAY_INITIALS.map((d) => (
          <div key={d} className="py-1 text-center text-xs font-semibold uppercase tracking-wide text-[#8A9F9F]">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: leadingPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd")
          const isPast = isBefore(day, today)
          const isBeyond = isAfter(day, maxDate)
          const disabled = isPast || isBeyond
          const isSelected = selectedDate === dateStr
          const isToday = isSameDay(day, today)

          return (
            <button
              key={dateStr}
              disabled={disabled}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors",
                disabled && "cursor-default text-[#C2CDCF]",
                !disabled && !isSelected && "font-medium text-[#37585A] hover:bg-[#64797C] hover:text-white",
                isSelected && "bg-[#64797C] font-semibold text-white",
                isToday && !isSelected && !disabled && "border-2 border-[#F0BF47]"
              )}
            >
              {format(day, "d")}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Slot {
  start: string
  end: string
}

interface RescheduleModalProps {
  open: boolean
  onClose: () => void
  bookingId: string
  username: string
  slug: string
  timezone: string
  attendeeName: string
  currentStartTime: string
}

function formatTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
    hour12: false,
  }).format(new Date(iso))
}

export function RescheduleModal({
  open,
  onClose,
  bookingId,
  username,
  slug,
  timezone,
  attendeeName,
  currentStartTime,
}: RescheduleModalProps) {
  const router = useRouter()
  const today = startOfDay(new Date())

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDateSelect(date: string) {
    setSelectedDate(date)
    setSelectedSlot(null)
    setSlots([])
    setError(null)
    setLoadingSlots(true)

    try {
      const res = await fetch(
        `/api/booking/slots?username=${encodeURIComponent(username)}&slug=${encodeURIComponent(slug)}&date=${date}`
      )
      const data = await res.json()
      setSlots(data.slots ?? [])
    } catch {
      setError("No se pudieron cargar los horarios.")
    } finally {
      setLoadingSlots(false)
    }
  }

  async function handleConfirm() {
    if (!selectedSlot || !selectedDate) return

    setConfirming(true)
    setError(null)

    const startTime = new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
      hour12: false,
    }).format(new Date(selectedSlot.start))

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          date: selectedDate,
          start_time: startTime,
        }),
      })

      const json = await res.json()

      if (res.ok) {
        router.refresh()
        onClose()
      } else {
        setError(json.error ?? "Error al reprogramar")
      }
    } catch {
      setError("Error de red. Inténtalo de nuevo.")
    } finally {
      setConfirming(false)
    }
  }

  function handleClose() {
    setSelectedDate(null)
    setSlots([])
    setSelectedSlot(null)
    setError(null)
    onClose()
  }

  const currentTimeLabel = formatTime(currentStartTime, timezone)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Reprogramar reserva</DialogTitle>
          <p className="text-sm text-[#8A9F9F]">
            {attendeeName} · actualmente a las{" "}
            <span className="font-medium text-[#64797C]">{currentTimeLabel}</span>
          </p>
        </DialogHeader>

        {/* Calendar + slots grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
          {/* Calendar */}
          <div className="rounded-xl border border-[#C2CDCF] bg-[#F7F8F8] p-4">
            <MiniCal
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              onSelectDate={handleDateSelect}
              onPrev={() => setCurrentMonth((m) => subMonths(m, 1))}
              onNext={() => setCurrentMonth((m) => addMonths(m, 1))}
            />
          </div>

          {/* Slots */}
          <div className="flex flex-col gap-2">
            {!selectedDate && (
              <p className="text-xs text-[#C2CDCF] text-center pt-4">
                Selecciona un día
              </p>
            )}

            {loadingSlots && (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-9 animate-pulse rounded-lg bg-[#F5F5F5]" />
                ))}
              </div>
            )}

            {!loadingSlots && selectedDate && slots.length === 0 && (
              <p className="text-xs text-[#8A9F9F] text-center pt-4">
                Sin horarios disponibles
              </p>
            )}

            {!loadingSlots && slots.length > 0 && (
              <div className="flex flex-col gap-1.5 max-h-[272px] overflow-y-auto pr-0.5">
                {slots.map((slot) => {
                  const isSelected = selectedSlot?.start === slot.start
                  return (
                    <button
                      key={slot.start}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                        isSelected
                          ? "border-[#64797C] bg-[#64797C] text-white"
                          : "border-[#C2CDCF] bg-white text-[#37585A] hover:border-[#64797C] hover:bg-[#64797C] hover:text-white"
                      )}
                    >
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", isSelected ? "bg-green-200" : "bg-green-400")} />
                      {formatTime(slot.start, timezone)}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        {/* Footer */}
        <div className="-mx-4 -mb-4 flex justify-end gap-2 rounded-b-xl border-t border-[#C2CDCF] bg-[#F7F8F8] px-4 py-3">
          <Button variant="ghost" onClick={handleClose} disabled={confirming}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedSlot || confirming}
          >
            {confirming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Reprogramando…
              </>
            ) : (
              "Confirmar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
