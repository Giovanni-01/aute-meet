import { CalendarDays, TriangleAlert } from "lucide-react"
import { GoogleSignInButton } from "@/components/google-sign-in-button"

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>
}

const ERROR_MESSAGES: Record<string, string> = {
  domain_not_allowed:
    "Solo cuentas del dominio @aute.website pueden acceder a Aute Meet. " +
    "Si crees que es un error, contacta con el administrador.",
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-10 flex flex-col items-center gap-5 text-center">
          <div className="flex items-center justify-center rounded-2xl bg-[#64797C] p-4">
            <CalendarDays className="h-7 w-7 text-white" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[#37585A]">
              Bienvenido a Aute Meet
            </h1>
            <p className="text-sm text-[#8A9F9F]">
              Inicia sesión con tu cuenta de Google para continuar
            </p>
          </div>
        </div>

        {/* Domain error alert — only shown when errorMessage is set */}
        {errorMessage && (
          <div className="mb-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Sign-in card */}
        <div className="rounded-2xl border border-[#C2CDCF] bg-white p-8 shadow-card">
          <GoogleSignInButton />
        </div>

        <p className="mt-6 text-center text-xs text-[#8A9F9F]">
          Solo disponible para el equipo interno de Aute
        </p>
      </div>
    </main>
  )
}
