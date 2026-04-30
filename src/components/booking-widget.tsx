"use client"

import { useState } from "react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Check,
  Video,
  TriangleAlert,
  Clock,
  Globe,
  Users,
  X,
  Copy,
} from "lucide-react"

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
  availableDayOfWeeks: number[] // 0 = Sunday (JS)
  blockedDateRanges?: Array<{ start_date: string; end_date: string }>
  durationMinutes: number
  // Host / event type info (rendered in the left info panel)
  hostName: string
  hostAvatarUrl: string | null
  hostBio: string | null
  eventTypeTitle: string
  eventTypeColor: string
  eventTypeDescription: string | null
  tzLabel: string | undefined
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_INITIALS = ["L", "M", "X", "J", "V", "S", "D"] // Monday-first

function formatTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
    hour12: false,
  }).format(new Date(iso))
}

function formatDateLong(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date(iso))
}

function capitalizeFirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function mondayFirstDow(date: Date): number {
  return (getDay(date) + 6) % 7
}

function isDateBlocked(
  dateStr: string,
  ranges: Array<{ start_date: string; end_date: string }>
): boolean {
  return ranges.some((r) => dateStr >= r.start_date && dateStr <= r.end_date)
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MiniCalendarProps {
  currentMonth: Date
  availableDayOfWeeks: number[]
  blockedDateRanges: Array<{ start_date: string; end_date: string }>
  selectedDate: string | null
  onSelectDate: (date: string) => void
  onPrev: () => void
  onNext: () => void
}

function MiniCalendar({
  currentMonth,
  availableDayOfWeeks,
  blockedDateRanges,
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
  const leadingPad = mondayFirstDow(monthStart)
  const canPrev = isAfter(monthStart, today)
  const canNext = isBefore(monthStart, startOfMonth(maxDate))

  const monthLabel = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(currentMonth)

  return (
    <div className="select-none w-full">
      {/* Month navigation */}
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Mes anterior"
          className={cn(
            "rounded-lg p-1.5 text-[#64797C] transition-colors hover:bg-[#F5F5F5] hover:text-[#37585A]",
            !canPrev && "cursor-default opacity-30"
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-[#37585A]">
          {capitalizeFirst(monthLabel)}
        </span>
        <button
          onClick={onNext}
          disabled={!canNext}
          aria-label="Mes siguiente"
          className={cn(
            "rounded-lg p-1.5 text-[#64797C] transition-colors hover:bg-[#F5F5F5] hover:text-[#37585A]",
            !canNext && "cursor-default opacity-30"
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {DAY_INITIALS.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-xs font-semibold uppercase tracking-wide text-[#8A9F9F]"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd")
          const jsDoW = getDay(day)
          const isPast = isBefore(day, today)
          const isBeyond = isAfter(day, maxDate)
          const hasAvailability = availableDayOfWeeks.includes(jsDoW)
          const blocked = isDateBlocked(dateStr, blockedDateRanges)
          const disabled = isPast || isBeyond || !hasAvailability || blocked
          const isSelected = selectedDate === dateStr
          const isToday = isSameDay(day, today)

          return (
            <button
              key={dateStr}
              disabled={disabled}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors",
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

// ─── Host info panel (left column) ───────────────────────────────────────────

interface HostInfoPanelProps {
  hostName: string
  hostAvatarUrl: string | null
  hostBio: string | null
  eventTypeTitle: string
  eventTypeColor: string
  eventTypeDescription: string | null
  durationMinutes: number
  tzLabel: string | undefined
}

function HostInfoPanel({
  hostName,
  hostAvatarUrl,
  hostBio,
  eventTypeTitle,
  eventTypeColor,
  eventTypeDescription,
  durationMinutes,
  tzLabel,
}: HostInfoPanelProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Host identity */}
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={hostAvatarUrl ?? undefined} alt={hostName} />
          <AvatarFallback className="bg-[#64797C] text-sm font-medium text-white">
            {getInitials(hostName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-[#37585A]">{hostName}</span>
          {hostBio && (
            <span className="text-xs text-[#8A9F9F] line-clamp-1">{hostBio}</span>
          )}
        </div>
      </div>

      <Separator className="border-[#C2CDCF]" />

      {/* Event type details */}
      <div className="flex flex-col gap-3">
        <div
          className="h-1 w-10 rounded-full"
          style={{ backgroundColor: eventTypeColor }}
        />
        <h1 className="text-lg font-semibold leading-tight text-[#37585A]">
          {eventTypeTitle}
        </h1>

        <div className="flex items-center gap-1.5 text-sm text-[#8A9F9F]">
          <Clock className="h-4 w-4 shrink-0" />
          <span>{durationMinutes} minutos</span>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-[#8A9F9F]">
          <Video className="h-4 w-4 shrink-0" />
          <span>Google Meet</span>
        </div>

        {eventTypeDescription && (
          <p className="text-sm leading-relaxed text-[#8A9F9F]">
            {eventTypeDescription}
          </p>
        )}

        {tzLabel && (
          <div className="flex items-start gap-1.5 text-xs text-[#8A9F9F]">
            <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{tzLabel}</span>
          </div>
        )}
      </div>

      <Separator className="border-[#C2CDCF]" />

      {/* How-to steps */}
      <ol className="flex flex-col gap-2">
        {[
          "Elige un día disponible en el calendario",
          "Selecciona el horario que mejor te venga",
          "Introduce tus datos y confirma",
        ].map((step, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#64797C]/10 text-[10px] font-semibold text-[#64797C]">
              {i + 1}
            </span>
            <span className="text-xs leading-relaxed text-[#8A9F9F]">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ─── Booking summary panel (left col in form phase) ──────────────────────────

interface BookingSummaryPanelProps {
  hostName: string
  hostAvatarUrl: string | null
  eventTypeTitle: string
  eventTypeColor: string
  durationMinutes: number
  selectedDate: string | null
  selectedSlot: Slot | null
  timezone: string
  tzLabel: string | undefined
}

function BookingSummaryPanel({
  hostName,
  hostAvatarUrl,
  eventTypeTitle,
  eventTypeColor,
  durationMinutes,
  selectedDate,
  selectedSlot,
  timezone,
  tzLabel,
}: BookingSummaryPanelProps) {
  const dateLabel = selectedDate
    ? capitalizeFirst(
        new Intl.DateTimeFormat("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(parseISO(selectedDate))
      )
    : ""

  const timeLabel = selectedSlot
    ? `${formatTime(selectedSlot.start, timezone)} – ${formatTime(selectedSlot.end, timezone)}`
    : ""

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={hostAvatarUrl ?? undefined} alt={hostName} />
          <AvatarFallback className="bg-[#64797C] text-sm font-medium text-white">
            {getInitials(hostName)}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-semibold text-[#37585A]">{hostName}</span>
      </div>

      <Separator className="border-[#C2CDCF]" />

      <div className="flex flex-col gap-3">
        <div
          className="h-1 w-10 rounded-full"
          style={{ backgroundColor: eventTypeColor }}
        />
        <p className="text-base font-semibold text-[#37585A]">{eventTypeTitle}</p>

        {dateLabel && (
          <p className="text-sm font-medium text-[#37585A]">{dateLabel}</p>
        )}
        {timeLabel && (
          <p className="text-sm text-[#8A9F9F]">{timeLabel}</p>
        )}

        <div className="flex items-center gap-1.5 text-sm text-[#8A9F9F]">
          <Clock className="h-4 w-4 shrink-0" />
          <span>{durationMinutes} min</span>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-[#8A9F9F]">
          <Video className="h-4 w-4 shrink-0" />
          <span>Google Meet</span>
        </div>

        {tzLabel && (
          <div className="flex items-start gap-1.5 text-xs text-[#8A9F9F]">
            <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{tzLabel}</span>
          </div>
        )}
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
  blockedDateRanges = [],
  durationMinutes,
  hostName,
  hostAvatarUrl,
  hostBio,
  eventTypeTitle,
  eventTypeColor,
  eventTypeDescription,
  tzLabel,
}: BookingWidgetProps) {
  const today = startOfDay(new Date())

  const [phase, setPhase] = useState<Phase>("calendar")
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [notes, setNotes] = useState("")

  // Copy Meet link feedback
  const [copied, setCopied] = useState(false)

  // Guests state
  const [guestsExpanded, setGuestsExpanded] = useState(false)
  const [guestInput, setGuestInput] = useState("")
  const [guestEmails, setGuestEmails] = useState<string[]>([])
  const [guestError, setGuestError] = useState<string | null>(null)

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
          guest_emails: guestEmails.length > 0 ? guestEmails : undefined,
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

  // ─── Phase: error ─────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center gap-4 p-8 text-center">
        <TriangleAlert className="h-10 w-10 text-red-400" />
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-[#37585A]">Algo ha ido mal</p>
          <p className="text-sm text-[#8A9F9F]">{errorMsg}</p>
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

  // ─── Phase: confirmed ─────────────────────────────────────────────────────
  if (phase === "confirmed" && confirmation) {
    const { booking, meetLink } = confirmation
    const dateLabel = formatDateLong(booking.start_time, timezone)
    const startLabel = formatTime(booking.start_time, timezone)
    const endLabel = formatTime(booking.end_time, timezone)

    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center gap-6 p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-[#37585A]">
            ¡Reserva confirmada!
          </h2>
          <p className="text-sm text-[#8A9F9F]">{capitalizeFirst(dateLabel)}</p>
          <p className="text-sm font-medium text-[#64797C]">
            {startLabel} – {endLabel} · {durationMinutes} min
          </p>
        </div>

        {meetLink && (
          <div className="flex items-center gap-2">
            <a
              href={meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-[#C2CDCF] bg-white px-5 py-3 text-sm font-medium text-[#64797C] shadow-card transition-colors hover:border-[#8A9F9F]"
            >
              <Video className="h-4 w-4 text-blue-500" />
              Unirse a Google Meet
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(meetLink)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              title="Copiar enlace"
              className="flex items-center gap-1.5 rounded-xl border border-[#C2CDCF] bg-white px-3 py-3 text-sm text-[#8A9F9F] shadow-card transition-colors hover:border-[#8A9F9F] hover:text-[#64797C]"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-500">Copiado</span>
                </>
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        )}

        <p className="max-w-xs text-xs text-[#8A9F9F]">
          Recibirás un correo de confirmación.
          {meetLink && " El enlace de Meet también está en tu invitación de Google Calendar."}
        </p>
      </div>
    )
  }

  // ─── Phase: form / submitting — 2 column layout ───────────────────────────
  if (phase === "form" || phase === "submitting") {
    const isSubmitting = phase === "submitting"

    return (
      <div className="grid min-h-[520px] grid-cols-1 md:grid-cols-[240px_1fr]">
        {/* Left: booking summary */}
        <div className="border-b border-[#C2CDCF] bg-[#F7F8F8] p-6 md:border-b-0 md:border-r">
          <BookingSummaryPanel
            hostName={hostName}
            hostAvatarUrl={hostAvatarUrl}
            eventTypeTitle={eventTypeTitle}
            eventTypeColor={eventTypeColor}
            durationMinutes={durationMinutes}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            timezone={timezone}
            tzLabel={tzLabel}
          />
        </div>

        {/* Right: form */}
        <div className="p-6">
          <div className="mb-5 flex items-center gap-2">
            <button
              onClick={() => setPhase("slots")}
              disabled={isSubmitting}
              className="rounded-lg p-1.5 text-[#64797C] transition-colors hover:bg-[#F5F5F5] hover:text-[#37585A]"
              aria-label="Volver"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold text-[#37585A]">
              Introduce tus datos
            </p>
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
                <span className="text-xs font-normal text-[#8A9F9F]">
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

            {/* Guests section */}
            <div className="flex flex-col gap-2">
              {!guestsExpanded ? (
                <button
                  type="button"
                  onClick={() => setGuestsExpanded(true)}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 text-sm text-[#64797C] hover:text-[#37585A] disabled:opacity-50 w-fit"
                >
                  <Users className="h-4 w-4" />
                  Añadir invitados
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Invitados <span className="text-xs font-normal text-[#8A9F9F]">(opcional, máx. 10)</span></Label>
                  </div>

                  {/* Chips */}
                  {guestEmails.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {guestEmails.map((g) => (
                        <span
                          key={g}
                          className="flex items-center gap-1 bg-[#F5F5F5] text-[#37585A] rounded-full px-3 py-1 text-sm"
                        >
                          {g}
                          <button
                            type="button"
                            onClick={() =>
                              setGuestEmails((prev) => prev.filter((e) => e !== g))
                            }
                            className="ml-0.5 text-[#8A9F9F] hover:text-[#37585A]"
                            aria-label={`Eliminar ${g}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Input row */}
                  {guestEmails.length < 10 && (
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        value={guestInput}
                        onChange={(e) => {
                          setGuestInput(e.target.value)
                          setGuestError(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            const trimmed = guestInput.trim()
                            if (!trimmed) return
                            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                              setGuestError("Email inválido")
                              return
                            }
                            if (guestEmails.includes(trimmed)) {
                              setGuestError("Ya está en la lista")
                              return
                            }
                            setGuestEmails((prev) => [...prev, trimmed])
                            setGuestInput("")
                          }
                        }}
                        placeholder="invitado@email.com"
                        disabled={isSubmitting}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => {
                          const trimmed = guestInput.trim()
                          if (!trimmed) return
                          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                            setGuestError("Email inválido")
                            return
                          }
                          if (guestEmails.includes(trimmed)) {
                            setGuestError("Ya está en la lista")
                            return
                          }
                          setGuestEmails((prev) => [...prev, trimmed])
                          setGuestInput("")
                        }}
                      >
                        Añadir
                      </Button>
                    </div>
                  )}
                  {guestError && (
                    <p className="text-xs text-red-500">{guestError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Bottom actions */}
            <div className="flex items-center gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                className="text-[#64797C]"
                onClick={() => setPhase("slots")}
              >
                Atrás
              </Button>
              <Button
                type="submit"
                variant="accent"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "Confirmando…" : "Confirmar reserva"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // ─── Phase: calendar / slots — 3 column layout ───────────────────────────
  const showSlots = phase === "slots" || phase === "slots-loading"
  const isLoadingSlots = phase === "slots-loading"

  const slotDateLabel = selectedDate
    ? capitalizeFirst(
        new Intl.DateTimeFormat("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(parseISO(selectedDate))
      )
    : ""

  return (
    <div className="grid min-h-[520px] grid-cols-1 md:grid-cols-[240px_1fr_200px]">
      {/* Col 1: Host info */}
      <div className="border-b border-[#C2CDCF] p-6 md:border-b-0 md:border-r">
        <HostInfoPanel
          hostName={hostName}
          hostAvatarUrl={hostAvatarUrl}
          hostBio={hostBio}
          eventTypeTitle={eventTypeTitle}
          eventTypeColor={eventTypeColor}
          eventTypeDescription={eventTypeDescription}
          durationMinutes={durationMinutes}
          tzLabel={tzLabel}
        />
      </div>

      {/* Col 2: Calendar */}
      <div className="border-b border-[#C2CDCF] p-6 md:border-b-0 md:border-r">
        <p className="mb-4 text-sm font-medium text-[#37585A]">
          Selecciona una fecha
        </p>
        <MiniCalendar
          currentMonth={currentMonth}
          availableDayOfWeeks={availableDayOfWeeks}
          blockedDateRanges={blockedDateRanges}
          selectedDate={selectedDate}
          onSelectDate={handleDateSelect}
          onPrev={handlePrevMonth}
          onNext={handleNextMonth}
        />
      </div>

      {/* Col 3: Slots */}
      <div className="flex flex-col p-6">
        {!showSlots && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-xs text-[#C2CDCF]">
              Selecciona un día para<br />ver los horarios disponibles
            </p>
          </div>
        )}

        {showSlots && (
          <>
            <p className="mb-4 text-sm font-semibold text-[#37585A]">
              {slotDateLabel}
            </p>

            {isLoadingSlots && (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-xl bg-[#F5F5F5]"
                  />
                ))}
              </div>
            )}

            {!isLoadingSlots && slots.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm text-[#8A9F9F]">
                  No hay horarios disponibles para este día.
                </p>
                <button
                  onClick={() => {
                    setSelectedDate(null)
                    setPhase("calendar")
                  }}
                  className="text-xs text-[#64797C] underline hover:text-[#37585A]"
                >
                  Elegir otro día
                </button>
              </div>
            )}

            {!isLoadingSlots && slots.length > 0 && (
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[272px] pr-1">
                {slots.map((slot) => (
                  <button
                    key={slot.start}
                    onClick={() => handleSlotSelect(slot)}
                    className="flex items-center gap-2.5 rounded-xl border border-[#C2CDCF] bg-white px-3 py-2.5 text-sm font-medium text-[#37585A] transition-colors hover:border-[#64797C] hover:bg-[#64797C] hover:text-white group"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full bg-green-400 group-hover:bg-green-200" />
                    {formatTime(slot.start, timezone)}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
