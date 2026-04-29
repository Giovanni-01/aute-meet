"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RescheduleModal } from "@/components/reschedule-modal"
import { CalendarClock } from "lucide-react"

interface RescheduleModalTriggerProps {
  bookingId: string
  username: string
  slug: string
  timezone: string
  attendeeName: string
  currentStartTime: string
}

export function RescheduleModalTrigger(props: RescheduleModalTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-8 gap-1.5 text-xs"
      >
        <CalendarClock className="h-3.5 w-3.5" />
        Reprogramar
      </Button>

      <RescheduleModal
        open={open}
        onClose={() => setOpen(false)}
        {...props}
      />
    </>
  )
}
