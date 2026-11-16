import { NavigationMenu } from "@base-ui/react/navigation-menu"
import { Link } from "@tanstack/react-router"
import { cn } from "cn"
import { ChevronDown } from "lucide-react"
import type { RefObject } from "react"
import { ArrowLink } from "@/features/landing/cta-link"
import {
  SITE_MENUS,
  type SiteMenu,
  type SitePage,
} from "@/features/landing/site-content"
import { StrandsArt } from "@/features/landing/strands-art"
import { useI18n } from "@/lib/i18n"

const TOP_LEVEL_CLASS =
  "flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm text-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:text-foreground"

function MenuPageLink({
  sectionSlug,
  page,
  showSummary,
}: {
  sectionSlug: string
  page: SitePage
  showSummary: boolean
}) {
  const { t } = useI18n("landing")
  return (
    <NavigationMenu.Link
      closeOnClick
      render={
        <Link
          to="/$sectionSlug/$pageSlug"
          params={{ sectionSlug, pageSlug: page.pageSlug }}
        />
      }
      className="group/page block rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex items-baseline gap-2 text-sm font-medium text-primary transition-colors group-hover/page:text-foreground">
        {t(page.title)}
        {(page.isInDevelopment || page.isRoadmap) && (
          <span className="text-xs font-normal text-muted-foreground">
            {t(page.isRoadmap ? "Roadmap" : "Soon")}
          </span>
        )}
      </span>
      {showSummary && (
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {t(page.summary)}
        </span>
      )}
    </NavigationMenu.Link>
  )
}

/** Features menu: summaries under each link, a tinted aside and a footer row. */
function DetailedPanel({ menu }: { menu: SiteMenu }) {
  const { t } = useI18n("landing")
  const mainColumns = menu.columns.filter((column) => !column.isAside)
  const asideColumns = menu.columns.filter((column) => column.isAside)

  return (
    <div className="grid grid-cols-[1fr_17rem]">
      <div className="flex flex-col">
        <div className="grid flex-1 auto-cols-fr grid-flow-col gap-8 p-8">
          {mainColumns.map((column) => (
            <div key={column.heading}>
              <h3 className="border-b pb-3 text-sm">{t(column.heading)}</h3>
              <ul className="mt-5 flex flex-col gap-4">
                {column.pages.map((page) => (
                  <li key={page.pageSlug}>
                    <MenuPageLink
                      sectionSlug={menu.sectionSlug}
                      page={page}
                      showSummary
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t px-8 py-5">
          <NavigationMenu.Link
            closeOnClick
            render={<Link to="/" hash="features" />}
            className="rounded-lg text-sm font-medium text-primary outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {t("See all features")}
          </NavigationMenu.Link>
        </div>
      </div>
      <aside className="flex flex-col gap-8 border-l bg-secondary p-8">
        {asideColumns.map((column) => (
          <div key={column.heading}>
            <h3 className="text-sm">{t(column.heading)}</h3>
            <ul className="mt-5 flex flex-col gap-4">
              {column.pages.map((page) => (
                <li key={page.pageSlug}>
                  <MenuPageLink
                    sectionSlug={menu.sectionSlug}
                    page={page}
                    showSummary
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="mt-auto overflow-hidden rounded-lg border bg-background">
          <div className="relative h-20 overflow-hidden bg-inverse">
            <StrandsArt tone="inverse" className="absolute inset-0 size-full" />
          </div>
          <div className="flex flex-col gap-1 p-4 text-sm">
            <p className="font-medium">{t("Campaign 2026/27")}</p>
            <p className="text-muted-foreground">
              {t("Plan it with the years that started like it.")}
            </p>
            <NavigationMenu.Link
              closeOnClick
              render={
                <ArrowLink
                  to="/$sectionSlug/$pageSlug"
                  params={{
                    sectionSlug: "features",
                    pageSlug: "years-like-this",
                  }}
                />
              }
              className="mt-2"
            >
              {t("See how")}
            </NavigationMenu.Link>
          </div>
        </div>
      </aside>
    </div>
  )
}

/** Titles only, one bordered column per group, the aside tinted. */
function CompactPanel({ menu }: { menu: SiteMenu }) {
  const { t } = useI18n("landing")
  return (
    <div className="grid auto-cols-fr grid-flow-col divide-x">
      {menu.columns.map((column) => (
        <div
          key={column.heading}
          className={cn("p-8 pb-12", column.isAside && "bg-secondary")}
        >
          <h3 className="text-sm">{t(column.heading)}</h3>
          <ul className="mt-5 flex flex-col gap-3.5">
            {column.pages.map((page) => (
              <li key={page.pageSlug}>
                <MenuPageLink
                  sectionSlug={menu.sectionSlug}
                  page={page}
                  showSummary={false}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** Every menu opens one shared panel as wide as the header frame. */
export function SiteNavMenu({
  frameRef,
  onOpenChange,
  className,
}: {
  /** The header frame: the panel hangs from it and takes its width. */
  frameRef: RefObject<HTMLElement | null>
  onOpenChange: (isOpen: boolean) => void
  className?: string
}) {
  const { t } = useI18n("landing")
  return (
    <NavigationMenu.Root
      className={className}
      onValueChange={(value) => onOpenChange(value !== null)}
    >
      <NavigationMenu.List className="flex items-center">
        {SITE_MENUS.map((menu) => (
          <NavigationMenu.Item key={menu.sectionSlug} value={menu.sectionSlug}>
            <NavigationMenu.Trigger className={cn(TOP_LEVEL_CLASS, "group")}>
              {t(menu.label)}
              <NavigationMenu.Icon>
                <ChevronDown className="size-3.5 transition-transform duration-200 group-data-popup-open:rotate-180" />
              </NavigationMenu.Icon>
            </NavigationMenu.Trigger>
            <NavigationMenu.Content className="w-(--anchor-width) transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0">
              {menu.layout === "detailed" ? (
                <DetailedPanel menu={menu} />
              ) : (
                <CompactPanel menu={menu} />
              )}
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        ))}
        <NavigationMenu.Item>
          <NavigationMenu.Link
            render={<Link to="/" hash="how-it-works" />}
            className={TOP_LEVEL_CLASS}
          >
            {t("How it works")}
          </NavigationMenu.Link>
        </NavigationMenu.Item>
      </NavigationMenu.List>
      <NavigationMenu.Portal>
        <NavigationMenu.Backdrop className="fixed inset-0 z-40 bg-background/40 backdrop-blur-xs transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <NavigationMenu.Positioner
          anchor={frameRef}
          side="bottom"
          align="start"
          sideOffset={0}
          positionMethod="fixed"
          collisionAvoidance={{ side: "none", align: "none" }}
          className="z-50 h-(--positioner-height) w-(--anchor-width)"
        >
          <NavigationMenu.Popup className="relative h-(--popup-height) w-full overflow-hidden rounded-b-xl border-t bg-popover text-popover-foreground shadow-2xl outline-none transition-[height,opacity] duration-300 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0">
            <NavigationMenu.Viewport className="relative size-full overflow-hidden" />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  )
}
