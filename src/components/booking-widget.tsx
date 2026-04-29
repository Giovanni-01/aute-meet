"use client"

import { useState, useTransition } from "react"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, CheckCircle, Video, TriangleAlert } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Slot {
  start: string // ISO UTC
  end: string
}

interface BookingConfirmation {
  booking: { id: string; start_time: string; end_time: string; meet_link: string | null }
  meetLink: string | null
  timezone: string
}

type Phase =
  | "calendar"
  | "slots"
  | "slots-loading"
  | "form"
  | "submitting"
  | "confirmed"
  | "error"

interface BookingWidgetProps {
  username: string
  slug: string
  timezone: string
  availableDayOfWeeks: number[] // 0 = Sunday
  durationMinutes: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_INITIALS = ["L", "M", "X", "J", "V", "S", "D"] // Monday-first

/** Formats a UTC ISO string as a local time string in the given IANA timezone. */
function formatTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
    hour12: false,
  }).format(new Date(iso))
}

/** Formats a UTC ISO date as a long Spanish date string in the given timezone. */
function formatDateLong(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date(iso))
}

/** Returns the Monday-first index (0=Monday, 6=Sunday) from a JS Date. */
function mondayFirstDow(date: Date): number {
  return (getDay(date) + 6) % 7
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MiniCalendarProps {
  currentMonth: Date
  availableDayOfWeeks: number[] // JS convention 0=Sunday
  selectedDate: string | null
  onSelectDate: (date: string) => void
  onPrev: () => void
  onNext: () => void
}

function MiniCalendar({
  currentMonth,
  availableDayOfWeeks,
  selectedDate,
  onSelectDate,
  onPrev,
  onNext,
}: MiniCalendarProps) {
  const today = startOfDay(new Date())
  const maxDate = addDays(today, 30)
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Padding cells for Monday-first grid
  const leadingPad = mondayFirstDow(monthStart)

  const canPrev = isAfter(monthStart, today)
  const canNext = isBefore(monthStart, startOfMonth(maxDate))

  const monthLabel = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(currentMonth)

  return (
    <div className="select-none">
      {/* Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Mes anterior"
          className={cn(
            "rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100",
            !canPrev && "cursor-default opacity-30"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium capitalize text-slate-900">
          {monthLabel}
        </span>
        <button
          onClick={onNext}
          disabled={!canNext}
          aria-label="Mes siguiente"
          className={cn(
            "rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100",
            !canNext && "cursor-default opacity-30"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day-of-week headers (Monday first) */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAY_INITIALS.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-xs font-medium text-slate-400"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {/* Leading padding */}
        {Array.from({ length: leadingPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd")
          const jsDoW = getDay(day) // 0=Sunday
          const isPast = isBefore(day, today)
          const isBeyond = isAfter(day, maxDate)
          const hasAvailability = availableDayOfWeeks.includes(jsDoW)
          const disabled = isPast || isBeyond || !hasAvailability
          const isSelected = selectedDate === dateStr
          const isToday = isSameDay(day, today)

          return (
            <button
              key={dateStr}
              disabled={disabled}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                "mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors",
                disabled && "cursor-default text-slate-300",
                !disabled && !isSelected && "text-slate-700 hover:bg-slate-100",
                isSelected && "bg-slate-900 font-medium text-white",
                isToday && !isSelected && !disabled && "font-semibold underline decoration-dotted"
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

// ─── Main widget ──────────────────────────────────────────────────────────────

export function BookingWidget({
  username,
  slug,
  timezone,
  availableDayOfWeeks,
  durationMinutes,
}: BookingWidgetProps) {
  const today = startOfDay(new Date())

  const [phase, setPhase] = useState<Phase>("calendar")
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()

  // Form state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [notes, setNotes] = useState("")

  // ── Calendar navigation ────────────────────────────────────────────────────
  function handlePrevMonth() {
    setCurrentMonth((m) => subMonths(m, 1))
  }
  function handleNextMonth() {
    setCurrentMonth((m) => addMonths(m, 1))
  }

  // ── Date selection → fetch slots ──────────────────────────────────────────
  async function handleDateSelect(date: string) {
    setSelectedDate(date)
    setPhase("slots-loading")
    setSlots([])

    try {
      const res = await fetch(
        `/api/booking/slots?username=${encodeURIComponent(username)}&slug=${encodeURIComponent(slug)}&date=${date}`
      )
      const data = await res.json()
      setSlots(data.slots ?? [])
      setPhase("slots")
    } catch {
      setErrorMsg("No se pudieron cargar los horarios disponibles.")
      setPhase("error")
    }
  }

  // ── Slot selection ────────────────────────────────────────────────────────
  function handleSlotSelect(slot: Slot) {
    setSelectedSlot(slot)
    setPhase("form")
  }

  // ── Form submission ───────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSlot || !selectedDate) return

    setPhase("submitting")
    const startTime = new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
      hour12: false,
    }).format(new Date(selectedSlot.start))

    try {
      const res = await fetch(`/api/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          slug,
          date: selectedDate,
          start_time: startTime,
          attendee_name: name,
          attendee_email: email,
          attendee_notes: notes || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? "Ha ocurrido un error. Inténtalo de nuevo.")
        setPhase("error")
        return
      }

      setConfirmation(data)
      setPhase("confirmed")
    } catch {
      setErrorMsg("Error de red. Por favor, comprueba tu conexión e inténtalo de nuevo.")
      setPhase("error")
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  // ── Error ─────────────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <TriangleAlert className="h-10 w-10 text-red-400" />
        <div className="flex flex-col gap-1">
          <p className="font-medium text-slate-900">Algo ha ido mal</p>
          <p className="text-sm text-slate-500">{errorMsg}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPhase("calendar")
            setErrorMsg(null)
          }}
        >
          Volver al inicio
        </Button>
      </div>
    )
  }

  // ── Confirmed ─────────────────────────────────────────────────────────────
  if (phase === "confirmed" && confirmation) {
    const { booking, meetLink } = confirmation
    const dateLabel = formatDateLong(booking.start_time, timezone)
    const startLabel = formatTime(booking.start_time, timezone)
    const endLabel = formatTime(booking.end_time, timezone)

    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-slate-900">
            ¡Reserva confirmada!
          </h2>
          <p className="text-sm text-slate-500 capitalize">{dateLabel}</p>
          <p className="text-sm font-medium text-slate-700">
            {startLabel} – {endLabel} · {durationMinutes} min
          </p>
        </div>

        {meetLink && (
          <a
            href={meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300"
          >
            <Video className="h-4 w-4 text-blue-500" />
            Unirse a Google Meet
          </a>
        )}

        <p className="max-w-xs text-xs text-slate-400">
          Recibirás un correo de confirmación en {name ? name.split(" ")[0] + "'s email" : "tu email"}.
          {meetLink && " El enlace de Meet también está en tu invitación de Google Calendar."}
        </p>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  if (phase === "form" || phase === "submitting") {
    const isSubmitting = phase === "submitting"
    const slotLabel = selectedSlot
      ? `${formatTime(selectedSlot.start, timezone)} – ${formatTime(selectedSlot.end, timezone)}`
      : ""
    const dateLabelShort = selectedDate
      ? new Intl.DateTimeFormat("es-ES", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }).format(parseISO(selectedDate))
      : ""

    return (
      <div className="flex flex-col gap-5">
        {/* Header with back button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPhase("slots")}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Volver"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-900 capitalize">
              {dateLabelShort}
            </span>
            <span className="text-xs text-slate-500">{slotLabel}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="attendee-name">Nombre *</Label>
            <Input
              id="attendee-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre completo"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="attendee-email">Email *</Label>
            <Input
              id="attendee-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="attendee-notes">
              Notas{" "}
              <span className="text-xs font-normal text-slate-400">
                (opcional)
              </span>
            </Label>
            <textarea
              id="attendee-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="¿Hay algo que quieras comentar antes de la reunión?"
              rows={3}
              disabled={isSubmitting}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Confirmando…" : "Confirmar reserva"}
          </Button>
        </form>
      </div>
    )
  }

  // ── Slots ────────────────────────────────────────────────────────────────
  if (phase === "slots" || phase === "slots-loading") {
    const isLoading = phase === "slots-loading"
    const dateLabelShort = selectedDate
      ? new Intl.DateTimeFormat("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(parseISO(selectedDate))
      : ""

    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPhase("calendar")}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Volver al calendario"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium capitalize text-slate-900">
            {dateLabelShort}
          </span>
        </div>

        {isLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        )}

        {!isLoading && slots.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500">
              No hay horarios disponibles para este día.
            </p>
            <button
              onClick={() => setPhase("calendar")}
              className="mt-2 text-xs text-slate-400 underline hover:text-slate-600"
            >
              Elegir otro día
            </button>
          </div>
        )}

        {!isLoading && slots.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map((slot) => (
              <button
                key={slot.start}
                onClick={() => handleSlotSelect(slot)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-900 hover:bg-slate-900 hover:text-white"
              >
                {formatTime(slot.start, timezone)}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Calendar (default phase) ─────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-sm font-medium text-slate-900">
          Selecciona una fecha
        </h2>
        <p className="text-xs text-slate-400">
          Solo se muestran días con disponibilidad
        </p>
      </div>

      <MiniCalendar
        currentMonth={currentMonth}
        availableDayOfWeeks={availableDayOfWeeks}
        selectedDate={selectedDate}
        onSelectDate={handleDateSelect}
        onPrev={handlePrevMonth}
        onNext={handleNextMonth}
      />
    </div>
  )
}
