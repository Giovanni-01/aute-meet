"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Unlink } from "lucide-react"

interface DisconnectCalendarButtonProps {
  connectionId: string
}

export function DisconnectCalendarButton({
  connectionId,
}: DisconnectCalendarButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDisconnect() {
    setLoading(true)
    try {
      const res = await fetch("/api/calendar/google/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: connectionId }),
      })
      if (res.ok) {
        // Revalidate the Server Component so the UI reflects the removed row
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleDisconnect}
      variant="ghost"
      size="sm"
      disabled={loading}
      className="gap-1.5 text-red-500 hover:bg-red-50 hover:text-red-600"
    >
      <Unlink className="h-3.5 w-3.5" />
      {loading ? "Desconectando…" : "Desconectar"}
    </Button>
  )
}
