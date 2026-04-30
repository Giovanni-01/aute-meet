import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { ProfileSettingsForm } from "@/components/profile-settings-form"
import { ChevronRight } from "lucide-react"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, bio, timezone, avatar_url")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/dashboard")

  const p = profile as {
    full_name: string
    username: string
    bio: string | null
    timezone: string
    avatar_url: string | null
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""

  return (
    <div className="min-h-screen bg-[#F7F8F8]">
      <header className="border-b border-[#C2CDCF] bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <nav className="flex items-center gap-1.5 text-sm">
            <Link href="/dashboard" className="text-[#8A9F9F] transition-colors hover:text-[#64797C]">
              Dashboard
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-[#C2CDCF]" />
            <span className="font-semibold text-[#37585A]">Ajustes de perfil</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-2xl border border-[#C2CDCF] bg-white p-6 shadow-card">
          <ProfileSettingsForm initialData={p} appUrl={appUrl} />
        </div>
      </main>
    </div>
  )
}
