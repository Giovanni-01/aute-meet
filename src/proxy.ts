import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import { isEmailAllowed } from "@/lib/auth/allowed-domains"

/**
 * Routes that are accessible without authentication.
 * Everything else is considered a protected route.
 */
const PUBLIC_PATHS = ["/", "/login", "/auth"]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)

  const { pathname } = request.nextUrl

  // Defence-in-depth: if a session exists on a protected route but the email
  // is not in the allowlist (e.g. someone tampered with cookies or the
  // domain restriction was added after the account was created), sign them
  // out and send them to the login page with a clear error.
  if (!isPublicPath(pathname) && user && !isEmailAllowed(user.email)) {
    // We cannot call supabase.auth.signOut() from the proxy — the server
    // client with cookies is not available here. Instead we redirect to the
    // dedicated signout route which handles it server-side.
    const signOutUrl = new URL("/auth/signout", request.url)
    signOutUrl.searchParams.set("next", "/login?error=domain_not_allowed")
    return NextResponse.redirect(signOutUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico   (favicon)
     * - public assets (png, svg, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
