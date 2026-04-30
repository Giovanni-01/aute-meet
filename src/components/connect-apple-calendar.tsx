"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Link2, ExternalLink, ChevronLeft, Calendar } from "lucide-react"

type CalendarItem = { displayName: string; url: string }
type Step = "credentials" | "calendar"

export function ConnectAppleCalendar() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("credentials")
  const [appleId, setAppleId] = useState("")
  const [appPassword, setAppPassword] = useState("")
  const [calendars, setCalendars] = useState<CalendarItem[]>([])
  const [selectedUrl, setSelectedUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(value: boolean) {
    setOpen(value)
    if (!value) {
      // Reset on close
      setStep("credentials")
      setCalendars([])
      setSelectedUrl("")
      setError(null)
    }
  }

  // Step 1 — validate credentials and get calendar list
  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/calendar/apple/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apple_id: appleId, app_password: appPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Error al verificar las credenciales.")
        return
      }

      const list: CalendarItem[] = data.calendars ?? []
      setCalendars(list)
      setSelectedUrl(list[0]?.url ?? "")
      setStep("calendar")
    } catch {
      setError("Error de red. Comprueba tu conexión e inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  // Step 2 — save the connection with the chosen calendar
  async function handleCalendarSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUrl) return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/calendar/apple/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apple_id: appleId,
          app_password: appPassword,
          calendar_url: selectedUrl,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Error al guardar la conexión.")
        return
      }

      handleOpenChange(false)
      router.refresh()
    } catch {
      setError("Error de red. Comprueba tu conexión e inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Link2 className="h-3.5 w-3.5" />
        Conectar Apple Calendar
      </Button>

      <DialogContent className="sm:max-w-md">
        {step === "credentials" ? (
          <>
            <DialogHeader>
              <DialogTitle>Conectar Apple Calendar</DialogTitle>
              <DialogDescription>
                Necesitas una contraseña de aplicación de tu cuenta de Apple ID.
              </DialogDescription>
            </DialogHeader>

            {/* Instructions */}
            <div className="rounded-xl border border-[#C2CDCF] bg-[#F7F8F8] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#64797C]">
                Cómo obtener la contraseña de aplicación
              </p>
              <ol className="flex flex-col gap-2">
                {[
                  <>
                    Inicia sesión en{" "}
                    <a
                      href="https://appleid.apple.com/account/manage"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 font-medium text-[#64797C] underline underline-offset-2 hover:text-[#37585A]"
                    >
                      appleid.apple.com
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </>,
                  'Ve a "Inicio de sesión y seguridad" → "Contraseñas de aplicaciones"',
                  'Pulsa "+" y escribe "Aute Meet" como nombre',
                  "Copia la contraseña generada y pégala aquí abajo",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#64797C]/10 text-[10px] font-semibold text-[#64797C]">
                      {i + 1}
                    </span>
                    <span className="text-xs leading-relaxed text-[#8A9F9F]">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="apple-id">Apple ID</Label>
                <Input
                  id="apple-id"
                  type="email"
                  placeholder="tu@icloud.com"
                  value={appleId}
                  onChange={(e) => setAppleId(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="app-password">Contraseña de aplicación</Label>
                <Input
                  id="app-password"
                  type="password"
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={loading}
                  onClick={() => handleOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Verificando…" : "Continuar"}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Selecciona un calendario</DialogTitle>
              <DialogDescription>
                Elige el calendario de iCloud que quieres usar para gestionar tu
                disponibilidad.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCalendarSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                {calendars.map((cal) => {
                  const isSelected = selectedUrl === cal.url
                  return (
                    <label
                      key={cal.url}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                        isSelected
                          ? "border-[#64797C] bg-[#F7F8F8]"
                          : "border-[#C2CDCF] bg-white hover:border-[#8A9F9F]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="calendar"
                        value={cal.url}
                        checked={isSelected}
                        onChange={() => setSelectedUrl(cal.url)}
                        className="sr-only"
                      />
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          isSelected ? "bg-[#64797C]/10" : "bg-[#F5F5F5]"
                        }`}
                      >
                        <Calendar
                          className={`h-4 w-4 ${
                            isSelected ? "text-[#64797C]" : "text-[#8A9F9F]"
                          }`}
                        />
                      </div>
                      <span
                        className={`text-sm ${
                          isSelected
                            ? "font-medium text-[#37585A]"
                            : "text-[#64797C]"
                        }`}
                      >
                        {cal.displayName}
                      </span>
                      {isSelected && (
                        <div className="ml-auto h-2 w-2 rounded-full bg-[#64797C]" />
                      )}
                    </label>
                  )
                })}
              </div>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={loading}
                  onClick={() => {
                    setStep("credentials")
                    setError(null)
                  }}
                  className="gap-1.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Atrás
                </Button>
                <Button type="submit" disabled={loading || !selectedUrl}>
                  {loading ? "Guardando…" : "Guardar conexión"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
