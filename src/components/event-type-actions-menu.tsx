"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Copy, Link, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface EventTypeActionsMenuProps {
  eventTypeId: string
  title: string
  slug: string
  username: string
}

export function EventTypeActionsMenu({
  eventTypeId,
  title,
  slug,
  username,
}: EventTypeActionsMenuProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
  const publicUrl = `${appUrl}/${username}/${slug}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available (e.g. non-HTTPS dev)
    }
  }

  async function handleDuplicate() {
    setDuplicating(true)
    try {
      const res = await fetch(`/api/event-types/${eventTypeId}/duplicate`, {
        method: "POST",
      })
      if (res.ok) router.refresh()
    } finally {
      setDuplicating(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/event-types/${eventTypeId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setDeleteOpen(false)
        router.refresh()
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#8A9F9F] transition-colors hover:bg-[#F5F5F5] hover:text-[#64797C]"
          aria-label={`Acciones para ${title}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onClick={() =>
              router.push(`/dashboard/event-types/${eventTypeId}/edit`)
            }
          >
            <Pencil className="h-4 w-4" />
            Editar
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Link className="h-4 w-4" />
            )}
            {copied ? "¡Copiado!" : "Copiar link"}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleDuplicate} disabled={duplicating}>
            {duplicating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            Duplicar
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>¿Eliminar tipo de evento?</DialogTitle>
            <DialogDescription>
              Estás a punto de eliminar &quot;{title}&quot;. Esta acción no se
              puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
