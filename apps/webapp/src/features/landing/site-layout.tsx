import type { ReactNode } from "react"
import { AnnouncementBar } from "@/features/landing/announcement-bar"
import { SiteFooter } from "@/features/landing/site-footer"
import { SiteHeader } from "@/features/landing/site-header"

/** Shell of the public site: announcement, glass header, page and footer. */
export function SiteLayout({
  isSignedIn,
  children,
}: {
  isSignedIn: boolean
  children: ReactNode
}) {
  return (
    <div className="min-h-svh bg-inverse">
      <AnnouncementBar />
      {/* `overflow-clip` rounds the top corners without breaking the sticky header. */}
      <div className="overflow-clip rounded-t-4xl bg-background">
        <SiteHeader isSignedIn={isSignedIn} />
        <main>{children}</main>
        <SiteFooter isSignedIn={isSignedIn} />
      </div>
    </div>
  )
}
