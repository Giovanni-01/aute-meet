"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, X } from "lucide-react"

interface CancelBookingButtonProps {
  bookingId: string
  attendeeName: string
}

export function CancelBookingButton({
  bookingId,
  attendeeName,
}: CancelBookingButtonProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  async function handleCancel() {
    setCancelling(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
      })
      if (res.ok) {
        setConfirming(false)
        router.refresh()
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setCancelling(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600">
          ¿Cancelar reserva de {attendeeName}?
        </span>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleCancel}
          disabled={cancelling}
          className="h-7 px-2 text-xs"
        >
          {cancelling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            "Sí, cancelar"
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
      className="h-8 gap-1.5 text-xs text-[#8A9F9F] hover:text-red-600"
      aria-label={`Cancelar reserva de ${attendeeName}`}
    >
      <X className="h-3.5 w-3.5" />
      Cancelar
    </Button>
  )
}
