"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  CalendarDays,
  Clock,
  Video,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  Users,
  Mail,
} from "lucide-react"
import { CancelBookingButton } from "@/components/cancel-booking-button"
import { RescheduleModalTrigger } from "@/components/reschedule-modal-trigger"

export type BookingDetailData = {
  id: string
  attendee_name: string
  attendee_email: string
  attendee_notes: string | null
  guest_emails: string[]
  start_time: string
  end_time: string
  meet_link: string | null
  google_event_id: string | null
  status: string
  host_notes: string | null
  cancellation_reason: string | null
  readai_notes: string | null
  readai_report_url: string | null
  event_types: {
    id: string
    title: string
    slug: string
    duration_minutes: number
    color: string
  } | null
}

interface BookingDetailProps {
  booking: BookingDetailData
  filter: string
  timezone: string
  username: string
}

function formatDateTime(isoString: string, timezone?: string) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(isoString))
}

export function BookingDetail({
  booking,
  filter,
  timezone,
  username,
}: BookingDetailProps) {
  const router = useRouter()
  const et = booking.event_types
  const isPast = new Date(booking.end_time) < new Date()

  const [expanded, setExpanded] = useState(false)
  const [hostNotes, setHostNotes] = useState(booking.host_notes ?? "")
  const [fetchingReadAi, setFetchingReadAi] = useState(false)
  const [readaiNotes, setReadaiNotes] = useState(booking.readai_notes)
  const [readaiReportUrl, setReadaiReportUrl] = useState(booking.readai_report_url)
  const [readaiError, setReadaiError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save host notes with 1s debounce
  const saveNotes = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        await fetch(`/api/bookings/${booking.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update_notes", host_notes: value }),
        })
      }, 1000)
    },
    [booking.id]
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  async function handleFetchReadAi() {
    setFetchingReadAi(true)
    setReadaiError(null)
    try {
      const res = await fetch(`/api/bookings/${booking.id}/fetch-notes`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) {
        setReadaiError(data.error ?? "Error al buscar notas.")
        return
      }
      setReadaiNotes(data.readaiNotes)
      setReadaiReportUrl(data.readaiReportUrl)
      if (!data.readaiNotes && !data.readaiReportUrl) {
        setReadaiError(
          "Read AI aún no ha generado el resumen. Inténtalo más tarde."
        )
      }
    } catch {
      setReadaiError("Error de red. Inténtalo de nuevo.")
    } finally {
      setFetchingReadAi(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#C2CDCF] bg-white shadow-card">
      {/* ── Card header (always visible) ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-stretch gap-0 text-left"
        aria-expanded={expanded}
      >
        {/* Color strip */}
        <div
          className="w-1 shrink-0"
          style={{ backgroundColor: et?.color ?? "#64797C" }}
        />

        <div className="flex flex-1 flex-col gap-3 px-5 py-4">
          {/* Top row */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#64797C]">
              {et?.title ?? "Evento"}
            </span>
            <div className="flex items-center gap-2">
              {booking.status === "cancelled" && (
                <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                  Cancelada
                </span>
              )}
              <ChevronDown
                className={`h-4 w-4 text-[#C2CDCF] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              />
            </div>
          </div>

          {/* Attendee */}
          <div>
            <p className="text-sm font-medium text-[#37585A]">
              {booking.attendee_name}
            </p>
            <p className="text-xs text-[#8A9F9F]">{booking.attendee_email}</p>
            {booking.attendee_notes && (
              <p className="mt-1 text-xs italic text-[#8A9F9F]">
                &ldquo;{booking.attendee_notes}&rdquo;
              </p>
            )}
          </div>

          {/* Date + duration + Meet */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#8A9F9F]">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              {formatDateTime(booking.start_time, timezone)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {et?.duration_minutes ?? "?"} min
            </span>
            {booking.meet_link && (
              <a
                href={booking.meet_link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 font-medium text-[#64797C] hover:text-[#37585A]"
              >
                <Video className="h-3.5 w-3.5 shrink-0" />
                Google Meet
              </a>
            )}
          </div>
        </div>
      </button>

      {/* ── Actions row (upcoming confirmed only) ── */}
      {booking.status === "confirmed" && filter === "upcoming" && (
        <div className="flex items-center justify-end gap-2 border-t border-[#C2CDCF] px-5 py-3">
          {et?.slug && (
            <RescheduleModalTrigger
              bookingId={booking.id}
              username={username}
              slug={et.slug}
              timezone={timezone}
              attendeeName={booking.attendee_name}
              currentStartTime={booking.start_time}
            />
          )}
          <CancelBookingButton
            bookingId={booking.id}
            attendeeName={booking.attendee_name}
          />
        </div>
      )}

      {/* ── Expandable detail panel ── */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          expanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-5 border-t border-[#C2CDCF] px-5 py-5">

          {/* Guests */}
          {booking.guest_emails && booking.guest_emails.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#64797C]">
                <Users className="h-3.5 w-3.5" />
                Invitados
              </p>
              <div className="flex flex-wrap gap-1.5">
                {booking.guest_emails.map((email) => (
                  <span
                    key={email}
                    className="flex items-center gap-1 rounded-full bg-[#F5F5F5] px-3 py-1 text-xs text-[#64797C]"
                  >
                    <Mail className="h-3 w-3" />
                    {email}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cancellation reason */}
          {booking.status === "cancelled" && booking.cancellation_reason && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64797C]">
                Motivo de cancelación
              </p>
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {booking.cancellation_reason}
              </p>
            </div>
          )}

          {/* Read AI notes */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64797C]">
              Notas de Read AI
            </p>

            {readaiNotes ? (
              <div className="rounded-xl bg-[#F5F5F5] p-4">
                <p className="whitespace-pre-wrap text-sm text-[#37585A]">
                  {readaiNotes}
                </p>
                {readaiReportUrl && (
                  <a
                    href={readaiReportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#64797C] hover:text-[#37585A]"
                  >
                    Ver reporte completo
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ) : !booking.google_event_id ? (
              <p className="text-sm text-[#8A9F9F]">
                No hay evento de Google Calendar vinculado.
              </p>
            ) : isPast ? (
              <div className="flex flex-col gap-2">
                {readaiError && (
                  <p className="text-sm text-[#8A9F9F]">{readaiError}</p>
                )}
                <div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleFetchReadAi}
                    disabled={fetchingReadAi}
                    className="gap-1.5"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${fetchingReadAi ? "animate-spin" : ""}`}
                    />
                    {fetchingReadAi
                      ? "Buscando notas…"
                      : "Buscar notas de Read AI"}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#8A9F9F]">
                Las notas de Read AI estarán disponibles después de la reunión.
              </p>
            )}
          </div>

          {/* Host notes */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64797C]">
              Mis notas
            </p>
            <textarea
              rows={3}
              value={hostNotes}
              onChange={(e) => {
                setHostNotes(e.target.value)
                saveNotes(e.target.value)
              }}
              placeholder="Añade tus notas sobre esta reunión..."
              className="w-full resize-none rounded-lg border border-[#C2CDCF] bg-white px-3 py-2 text-sm text-[#37585A] placeholder-[#C2CDCF] outline-none transition-colors focus:border-[#64797C]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
