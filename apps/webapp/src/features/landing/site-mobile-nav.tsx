import { Link } from "@tanstack/react-router"
import { Menu } from "lucide-react"
import { useState } from "react"
import { BrandMark } from "@/components/brand-mark"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { AppEntryLink } from "@/features/landing/cta-link"
import { SITE_MENUS } from "@/features/landing/site-content"

/** The same menus as the desktop navigation, stacked in a side sheet. */
export function SiteMobileNav({
  isSignedIn,
  className,
}: {
  isSignedIn: boolean
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon-lg" className={className} />}
      >
        <Menu />
        <span className="sr-only">Open menu</span>
      </SheetTrigger>
      <SheetContent className="gap-0 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            <BrandMark />
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-8 px-4 pt-2 pb-8">
          {SITE_MENUS.map((menu) => (
            <section key={menu.sectionSlug} className="flex flex-col gap-3">
              <h2 className="border-b pb-2 text-sm text-muted-foreground">
                {menu.label}
              </h2>
              <ul className="flex flex-col gap-3">
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
                        onClick={() => setIsOpen(false)}
                        className="text-base text-foreground"
                      >
                        {page.title}
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </nav>
        <SheetFooter className="sticky bottom-0 border-t bg-popover">
          <AppEntryLink isSignedIn={isSignedIn} signedOutLabel="Get started" />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
