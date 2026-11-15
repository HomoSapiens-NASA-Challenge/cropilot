import { Link } from "@tanstack/react-router"
import { BrandMark } from "@/components/brand-mark"
import { ArrowLink } from "@/features/landing/cta-link"
import { Band } from "@/features/landing/frame"
import { SITE_MENUS } from "@/features/landing/site-content"

export function SiteFooter({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <footer>
      <Band tone="tinted" frameClassName="border-t">
        <div className="grid divide-dashed sm:grid-cols-2 lg:grid-cols-4 lg:divide-x">
          {SITE_MENUS.map((menu) => (
            <nav
              key={menu.sectionSlug}
              aria-label={menu.label}
              className="flex flex-col gap-4 px-4 py-10 sm:px-6 lg:py-16"
            >
              <h2 className="text-sm font-medium">{menu.label}</h2>
              <ul className="flex flex-col gap-2">
                {menu.columns
                  .flatMap((column) => column.pages)
                  .map((page) => (
                    <li key={page.pageSlug}>
                      <Link
                        to="/$sectionSlug/$pageSlug"
                        params={{
                          sectionSlug: menu.sectionSlug,
                          pageSlug: page.pageSlug,
                        }}
                        className="rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {page.title}
                      </Link>
                    </li>
                  ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="flex flex-col gap-6 border-t border-dashed px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-start gap-3">
            <BrandMark />
            <p className="max-w-xl text-sm text-muted-foreground">
              Built for the NASA Space Apps Challenge 2026 · Field Shift:
              Adapting Farms with NASA Data. Cropilot supports the agronomist's
              judgment and never replaces it.
            </p>
          </div>
          <ArrowLink
            to={isSignedIn ? "/overview" : "/login"}
            className="text-sm"
          >
            {isSignedIn ? "Open app" : "Sign in"}
          </ArrowLink>
        </div>
      </Band>
    </footer>
  )
}
