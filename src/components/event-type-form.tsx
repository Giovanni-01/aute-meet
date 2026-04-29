"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { slugify } from "@/lib/validations/event-type"
import { Loader2 } from "lucide-react"

const DURATIONS = [15, 30, 45, 60, 90, 120]
const COLORS = [
  "#1F3A68",
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#DC2626",
  "#EA580C",
  "#16A34A",
  "#0D9488",
]

interface EventTypeFormProps {
  initialData?: {
    id: string
    title: string
    slug: string
    description: string | null
    duration_minutes: number
    buffer_before_minutes: number
    buffer_after_minutes: number
    color: string
    is_active: boolean
  }
}

export function EventTypeForm({ initialData }: EventTypeFormProps) {
  const router = useRouter()
  const isEditing = !!initialData

  const [title, setTitle] = useState(initialData?.title ?? "")
  const [slug, setSlug] = useState(initialData?.slug ?? "")
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  )
  const [duration, setDuration] = useState(
    initialData?.duration_minutes ?? 30
  )
  const [bufferBefore, setBufferBefore] = useState(
    initialData?.buffer_before_minutes ?? 0
  )
  const [bufferAfter, setBufferAfter] = useState(
    initialData?.buffer_after_minutes ?? 0
  )
  const [color, setColor] = useState(initialData?.color ?? "#1F3A68")
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState("")

  // Auto-generate slug from title (only if user hasn't manually edited it)
  useEffect(() => {
    if (!slugManuallyEdited && !isEditing) {
      setSlug(slugify(title))
    }
  }, [title, slugManuallyEdited, isEditing])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    setGlobalError("")

    const payload = {
      title,
      slug,
      description: description || null,
      duration_minutes: duration,
      buffer_before_minutes: bufferBefore,
      buffer_after_minutes: bufferAfter,
      color,
      is_active: isActive,
    }

    const url = isEditing
      ? `/api/event-types/${initialData.id}`
      : "/api/event-types"

    const method = isEditing ? "PATCH" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        router.push("/dashboard/event-types?saved=1")
        router.refresh()
        return
      }

      const data = await res.json()

      if (data.errors && Array.isArray(data.errors)) {
        const fieldErrors: Record<string, string> = {}
        for (const err of data.errors) {
          fieldErrors[err.field] = err.message
        }
        setErrors(fieldErrors)
      } else {
        setGlobalError(data.error ?? "Error desconocido")
      }
    } catch {
      setGlobalError("Error de conexión. Inténtalo de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {globalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {globalError}
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <label
          htmlFor="title"
          className="block text-sm font-medium text-[#64797C]"
        >
          Título *
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. Reunión de 30 minutos"
          className="w-full rounded-lg border border-[#C2CDCF] px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#8A9F9F] focus:border-[#64797C] focus:outline-none focus:ring-1 focus:ring-[#64797C]"
        />
        {errors.title && (
          <p className="text-xs text-red-600">{errors.title}</p>
        )}
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <label
          htmlFor="slug"
          className="block text-sm font-medium text-[#64797C]"
        >
          Slug (URL) *
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#8A9F9F]">/tu-usuario/</span>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value)
              setSlugManuallyEdited(true)
            }}
            placeholder="reunion-30min"
            className="flex-1 rounded-lg border border-[#C2CDCF] px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#8A9F9F] focus:border-[#64797C] focus:outline-none focus:ring-1 focus:ring-[#64797C]"
          />
        </div>
        {errors.slug && (
          <p className="text-xs text-red-600">{errors.slug}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label
          htmlFor="description"
          className="block text-sm font-medium text-[#64797C]"
        >
          Descripción
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Describe brevemente de qué se trata esta reunión"
          className="w-full rounded-lg border border-[#C2CDCF] px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#8A9F9F] focus:border-[#64797C] focus:outline-none focus:ring-1 focus:ring-[#64797C]"
        />
        {errors.description && (
          <p className="text-xs text-red-600">{errors.description}</p>
        )}
      </div>

      {/* Duration */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[#64797C]">
          Duración *
        </label>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                duration === d
                  ? "border-[#64797C] bg-[#64797C] text-white"
                  : "border-[#C2CDCF] text-[#64797C] hover:border-[#8A9F9F]"
              }`}
            >
              {d} min
            </button>
          ))}
        </div>
        {errors.duration_minutes && (
          <p className="text-xs text-red-600">{errors.duration_minutes}</p>
        )}
      </div>

      {/* Buffers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label
            htmlFor="buffer_before"
            className="block text-sm font-medium text-[#64797C]"
          >
            Buffer antes (min)
          </label>
          <input
            id="buffer_before"
            type="number"
            min={0}
            max={60}
            value={bufferBefore}
            onChange={(e) => setBufferBefore(parseInt(e.target.value) || 0)}
            className="w-full rounded-lg border border-[#C2CDCF] px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#64797C] focus:outline-none focus:ring-1 focus:ring-[#64797C]"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="buffer_after"
            className="block text-sm font-medium text-[#64797C]"
          >
            Buffer después (min)
          </label>
          <input
            id="buffer_after"
            type="number"
            min={0}
            max={60}
            value={bufferAfter}
            onChange={(e) => setBufferAfter(parseInt(e.target.value) || 0)}
            className="w-full rounded-lg border border-[#C2CDCF] px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#64797C] focus:outline-none focus:ring-1 focus:ring-[#64797C]"
          />
        </div>
      </div>

      {/* Color */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[#64797C]">
          Color
        </label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-8 w-8 rounded-full border-2 transition-all ${
                color === c
                  ? "border-[#64797C] scale-110"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>

      {/* Active toggle */}
      {isEditing && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              isActive ? "bg-[#64797C]" : "bg-[#C2CDCF]"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                isActive ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-sm text-[#64797C]">
            {isActive ? "Activo" : "Inactivo"}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Guardar cambios" : "Crear tipo de evento"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/dashboard/event-types")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
