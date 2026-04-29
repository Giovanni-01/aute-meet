import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { ProfileSettingsForm } from "@/components/profile-settings-form"
import { ArrowLeft } from "lucide-react"

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
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <Link
            href="/dashboard"
            className="text-[#8A9F9F] hover:text-[#64797C]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-[#37585A]">
            Ajustes de perfil
          </h1>
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
