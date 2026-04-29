import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CalendarDays } from "lucide-react"

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="flex flex-col items-center gap-8 text-center">
        {/* Logo mark */}
        <div className="flex items-center justify-center rounded-2xl bg-[#64797C] p-4">
          <CalendarDays className="h-8 w-8 text-white" />
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight text-[#37585A] sm:text-5xl">
            Aute Meet
          </h1>
          <p className="max-w-sm text-lg text-[#8A9F9F]">
            Agenda reuniones con el equipo de Aute
          </p>
        </div>

        {/* CTA — render prop makes the button render as a Next.js Link */}
        <Button render={<Link href="/login" />} size="lg" className="min-w-40">
          Iniciar sesión
        </Button>
      </div>
    </main>
  )
}
