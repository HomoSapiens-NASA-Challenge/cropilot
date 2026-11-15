import type { LenisOptions } from "lenis"
import { ReactLenis } from "lenis/react"
import type { ReactNode } from "react"
import { AnnouncementBar } from "@/features/landing/announcement-bar"
import { SiteFooter } from "@/features/landing/site-footer"
import { SiteHeader } from "@/features/landing/site-header"

/**
 * Smooth wheel scrolling for the public site. Touch keeps the native scroll,
 * and Lenis drops the smoothing when the reader asks for reduced motion.
 */
const SMOOTH_SCROLL: LenisOptions = {
  autoRaf: true,
  // Base UI locks the page under a sheet with `overflow: hidden` on the body.
  // Lenis cannot see that lock, so while it is on the wheel stays native.
  prevent: (node) =>
    node === document.body && getComputedStyle(node).overflowY === "hidden",
  // A scrollable box inside a page keeps its own native scroll.
  allowNestedScroll: true,
  // A link to another page does not carry the inertia of the last wheel turn.
  stopInertiaOnNavigate: true,
}

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
      <ReactLenis root options={SMOOTH_SCROLL} />
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
