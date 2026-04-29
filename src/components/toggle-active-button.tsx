"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface ToggleActiveButtonProps {
  eventTypeId: string
  isActive: boolean
}

export function ToggleActiveButton({
  eventTypeId,
  isActive: initialActive,
}: ToggleActiveButtonProps) {
  const router = useRouter()
  const [isActive, setIsActive] = useState(initialActive)
  const [updating, setUpdating] = useState(false)

  async function handleToggle() {
    setUpdating(true)
    const newState = !isActive
    setIsActive(newState) // optimistic

    try {
      const res = await fetch(`/api/event-types/${eventTypeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newState }),
      })
      if (!res.ok) {
        setIsActive(!newState) // revert
      } else {
        router.refresh()
      }
    } catch {
      setIsActive(!newState) // revert
    } finally {
      setUpdating(false)
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isActive}
      disabled={updating}
      onClick={handleToggle}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${
        isActive ? "bg-slate-900" : "bg-slate-300"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          isActive ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  )
}
