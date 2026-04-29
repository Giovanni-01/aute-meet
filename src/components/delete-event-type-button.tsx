"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2 } from "lucide-react"

interface DeleteEventTypeButtonProps {
  eventTypeId: string
  title: string
}

export function DeleteEventTypeButton({
  eventTypeId,
  title,
}: DeleteEventTypeButtonProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/event-types/${eventTypeId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        router.refresh()
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600">
          ¿Eliminar &quot;{title}&quot;?
        </span>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting}
          className="h-7 px-2 text-xs"
        >
          {deleting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            "Sí, eliminar"
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfirming(false)}
          className="h-7 px-2 text-xs"
        >
          No
        </Button>
      </div>
    )
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => setConfirming(true)}
      className="h-8 w-8 p-0 text-[#8A9F9F] hover:text-red-600"
      aria-label={`Eliminar ${title}`}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
