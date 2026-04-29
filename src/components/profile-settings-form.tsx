"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, CheckCircle, Loader2 } from "lucide-react"

const COMMON_TIMEZONES = [
  { value: "Europe/Madrid", label: "Madrid (CET/CEST)" },
  { value: "Europe/London", label: "Londres (GMT/BST)" },
  { value: "Europe/Paris", label: "París (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlín (CET/CEST)" },
  { value: "Europe/Rome", label: "Roma (CET/CEST)" },
  { value: "Europe/Amsterdam", label: "Ámsterdam (CET/CEST)" },
  { value: "Europe/Lisbon", label: "Lisboa (WET/WEST)" },
  { value: "Europe/Helsinki", label: "Helsinki (EET/EEST)" },
  { value: "Europe/Warsaw", label: "Varsovia (CET/CEST)" },
  { value: "Europe/Istanbul", label: "Estambul (TRT)" },
  { value: "Europe/Moscow", label: "Moscú (MSK)" },
  { value: "America/New_York", label: "Nueva York (ET)" },
  { value: "America/Chicago", label: "Chicago (CT)" },
  { value: "America/Denver", label: "Denver (MT)" },
  { value: "America/Los_Angeles", label: "Los Ángeles (PT)" },
  { value: "America/Toronto", label: "Toronto (ET)" },
  { value: "America/Vancouver", label: "Vancouver (PT)" },
  { value: "America/Mexico_City", label: "Ciudad de México (CT)" },
  { value: "America/Bogota", label: "Bogotá (COT)" },
  { value: "America/Lima", label: "Lima (PET)" },
  { value: "America/Santiago", label: "Santiago (CLT/CLST)" },
  { value: "America/Sao_Paulo", label: "São Paulo (BRT)" },
  { value: "America/Buenos_Aires", label: "Buenos Aires (ART)" },
  { value: "Africa/Cairo", label: "El Cairo (EET)" },
  { value: "Africa/Lagos", label: "Lagos (WAT)" },
  { value: "Africa/Johannesburg", label: "Johannesburgo (SAST)" },
  { value: "Asia/Dubai", label: "Dubái (GST)" },
  { value: "Asia/Kolkata", label: "Mumbai / Nueva Delhi (IST)" },
  { value: "Asia/Bangkok", label: "Bangkok (ICT)" },
  { value: "Asia/Singapore", label: "Singapur (SGT)" },
  { value: "Asia/Shanghai", label: "Shanghái (CST)" },
  { value: "Asia/Tokyo", label: "Tokio (JST)" },
  { value: "Asia/Seoul", label: "Seúl (KST)" },
  { value: "Australia/Sydney", label: "Sídney (AEST/AEDT)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)" },
  { value: "UTC", label: "UTC" },
]

interface ProfileSettingsFormProps {
  initialData: {
    full_name: string
    username: string
    bio: string | null
    timezone: string
    avatar_url: string | null
  }
  appUrl: string
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function ProfileSettingsForm({
  initialData,
  appUrl,
}: ProfileSettingsFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [avatarUrl, setAvatarUrl] = useState(initialData.avatar_url)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [fullName, setFullName] = useState(initialData.full_name ?? "")
  const [username, setUsername] = useState(initialData.username ?? "")
  const [bio, setBio] = useState(initialData.bio ?? "")
  const [timezone, setTimezone] = useState(
    initialData.timezone ?? "Europe/Madrid"
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    const body = new FormData()
    body.append("avatar", file)

    try {
      const res = await fetch("/api/profile/avatar", { method: "POST", body })
      const json = await res.json()
      if (res.ok) {
        setAvatarUrl(json.avatar_url)
        router.refresh()
      } else {
        setUploadError(json.error ?? "Error al subir la foto")
      }
    } catch {
      setUploadError("Error de red. Inténtalo de nuevo.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          username: username.toLowerCase(),
          bio: bio || null,
          timezone,
        }),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
        router.refresh()
      } else {
        const json = await res.json()
        setError(json.error ?? "Error al guardar")
      }
    } catch {
      setError("Error de red. Inténtalo de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  const publicUrl = `${appUrl}/${username}`

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Avatar upload */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="group relative block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#64797C]"
            aria-label="Cambiar foto de perfil"
          >
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl ?? undefined} alt={fullName} />
              <AvatarFallback className="bg-[#64797C] text-lg font-medium text-white">
                {getInitials(fullName || "?")}
              </AvatarFallback>
            </Avatar>
            {/* Hover / loading overlay */}
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-disabled:opacity-100">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-sm font-medium text-[#64797C] hover:text-[#37585A] disabled:opacity-50 text-left"
          >
            {uploading ? "Subiendo…" : "Cambiar foto"}
          </button>
          <p className="text-xs text-[#8A9F9F]">JPG, PNG, WebP o GIF · máx. 2 MB</p>
          {uploadError && (
            <p className="text-xs text-red-600">{uploadError}</p>
          )}
        </div>
      </div>

      {/* Public URL preview */}
      <div className="rounded-xl border border-[#C2CDCF] bg-[#F7F8F8] px-4 py-3">
        <p className="text-xs text-[#8A9F9F]">Tu página pública</p>
        <p className="mt-0.5 text-sm font-medium text-[#37585A] break-all">
          {publicUrl}
        </p>
      </div>

      {/* Full name */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="full_name"
          className="text-sm font-medium text-[#37585A]"
        >
          Nombre completo
        </label>
        <input
          id="full_name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          maxLength={200}
          className="rounded-lg border border-[#C2CDCF] bg-white px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#8A9F9F] focus:border-[#64797C] focus:outline-none focus:ring-2 focus:ring-[#64797C]/20"
          placeholder="Tu nombre"
        />
      </div>

      {/* Username */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="username"
          className="text-sm font-medium text-[#37585A]"
        >
          Nombre de usuario
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          required
          minLength={3}
          maxLength={50}
          pattern="^[a-z0-9-]+$"
          title="Solo minúsculas, números y guiones"
          className="rounded-lg border border-[#C2CDCF] bg-white px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#8A9F9F] focus:border-[#64797C] focus:outline-none focus:ring-2 focus:ring-[#64797C]/20"
          placeholder="tu-usuario"
        />
        <p className="text-xs text-[#8A9F9F]">
          Solo minúsculas, números y guiones. Mín. 3 caracteres.
        </p>
      </div>

      {/* Bio */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className="text-sm font-medium text-[#37585A]">
          Bio
          <span className="ml-1.5 font-normal text-[#8A9F9F]">(opcional)</span>
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={3}
          className="rounded-lg border border-[#C2CDCF] bg-white px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#8A9F9F] focus:border-[#64797C] focus:outline-none focus:ring-2 focus:ring-[#64797C]/20 resize-none"
          placeholder="Una breve descripción sobre ti"
        />
        <p className="text-right text-xs text-[#8A9F9F]">
          {bio.length}/500
        </p>
      </div>

      {/* Timezone */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="timezone"
          className="text-sm font-medium text-[#37585A]"
        >
          Zona horaria
        </label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="rounded-lg border border-[#C2CDCF] bg-white px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#64797C] focus:outline-none focus:ring-2 focus:ring-[#64797C]/20"
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando…
            </>
          ) : (
            "Guardar cambios"
          )}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            Guardado
          </span>
        )}
      </div>
    </form>
  )
}
