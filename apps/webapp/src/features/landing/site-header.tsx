import { Link } from "@tanstack/react-router"
import { cn } from "cn"
import { useRef, useState } from "react"
import { BrandMark } from "@/components/brand-mark"
import { LanguageSelector } from "@/components/language-selector"
import { AppEntryLink, CtaLink } from "@/features/landing/cta-link"
import { RepositoryLink } from "@/features/landing/repository-link"
import { SiteMobileNav } from "@/features/landing/site-mobile-nav"
import { SiteNavMenu } from "@/features/landing/site-nav-menu"
import { useI18n } from "@/lib/i18n"

/** Sticky glass header of the public site. */
export function SiteHeader({ isSignedIn }: { isSignedIn: boolean }) {
  const { t } = useI18n("landing")
  const frameRef = useRef<HTMLDivElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/75 px-2 backdrop-blur-lg sm:px-4">
      <div
        ref={frameRef}
        className={cn(
          "mx-auto flex h-18 max-w-316 items-center gap-4 rounded-t-xl px-4 transition-colors duration-200",
          isMenuOpen && "bg-popover"
        )}
      >
        <Link to="/" className="mr-2 rounded-lg">
          <BrandMark />
        </Link>
        <SiteNavMenu
          frameRef={frameRef}
          onOpenChange={setIsMenuOpen}
          className="hidden lg:block"
        />
        <div className="ml-auto flex items-center gap-2">
          <RepositoryLink />
          <LanguageSelector />
          {!isSignedIn && (
            <CtaLink
              to="/login"
              variant="outline"
              size="compact"
              className="hidden sm:inline-flex"
            >
              {t("Sign in")}
            </CtaLink>
          )}
          <AppEntryLink
            isSignedIn={isSignedIn}
            signedOutLabel={t("Get started")}
            size="compact"
            className="hidden sm:inline-flex"
          />
          <SiteMobileNav isSignedIn={isSignedIn} className="lg:hidden" />
        </div>
      </div>
    </header>
  )
}
