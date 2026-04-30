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
  const [reason, setReason] = useState("")
  const [cancelling, setCancelling] = useState(false)

  async function handleCancel() {
    if (!reason.trim()) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          cancellation_reason: reason.trim(),
        }),
      })
      if (res.ok) {
        setConfirming(false)
        setReason("")
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
      <div className="flex flex-col gap-2">
        <p className="text-xs text-[#64797C]">
          Motivo de cancelación (obligatorio):
        </p>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={`¿Por qué cancelas la reserva de ${attendeeName}?`}
          disabled={cancelling}
          className="w-full resize-none rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 placeholder-red-300 outline-none focus:border-red-400"
        />
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setConfirming(false)
              setReason("")
            }}
            disabled={cancelling}
            className="h-7 px-2 text-xs"
          >
            No
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelling || !reason.trim()}
            className="h-7 px-2 text-xs"
          >
            {cancelling ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "Sí, cancelar"
            )}
          </Button>
        </div>
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
