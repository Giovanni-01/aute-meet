import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DashboardNav } from "@/components/dashboard-nav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url, full_name")
    .eq("id", user.id)
    .single()

  const displayName = (profile as any)?.full_name ??
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email ??
    "Usuario"

  const avatarUrl: string | undefined = (profile as any)?.avatar_url ??
    user.user_metadata?.avatar_url ?? user.user_metadata?.picture

  const initials = displayName
    .split(" ")
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const publicUsername = profile?.username as string | undefined
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
  const publicProfileUrl = publicUsername ? `${appUrl}/${publicUsername}` : undefined

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-[#C2CDCF] bg-white p-4">
        {/* User info */}
        <div className="flex items-center gap-3 pb-4">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-[#64797C] text-xs text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#37585A]">
              {displayName}
            </p>
            <p className="truncate text-xs text-[#8A9F9F]">{user.email}</p>
          </div>
        </div>

        <div className="mb-4 border-b border-[#C2CDCF]" />

        {/* Nav */}
        <DashboardNav publicProfileUrl={publicProfileUrl} />
      </aside>

      {/* Main content */}
      <div className="ml-64 flex-1 bg-[#F7F8F8]">
        {children}
      </div>
    </div>
  )
}
