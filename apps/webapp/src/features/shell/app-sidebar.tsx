import type { Region } from "@cropilot/api"
import { Link, useMatchRoute } from "@tanstack/react-router"
import { ChevronsUpDown, MapPin } from "lucide-react"
import { useState } from "react"
import { BrandLogo, BrandMark } from "@/components/brand-mark"
import { RegionDialog } from "@/components/region-dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavUser, type NavUserProps } from "@/features/shell/nav-user"
import { appSections, sectionGroups } from "@/features/shell/sections"
import { useI18n } from "@/lib/i18n"

export function AppSidebar({
  region,
  ...navUserProps
}: NavUserProps & { region: Region }) {
  const { t } = useI18n("app")

  const matchRoute = useMatchRoute()
  const [isRegionDialogOpen, setRegionDialogOpen] = useState(false)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link to={appSections.overview.to} />}
            >
              <BrandLogo className="hidden group-data-[collapsible=icon]:flex" />
              {/* The menu button sizes every nested svg to 16px; the logotype keeps its own. */}
              <BrandMark className="h-6! w-auto! text-foreground group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={t("Region: {value1}", { value1: region.name })}
              onClick={() => setRegionDialogOpen(true)}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-primary">
                <MapPin className="size-4" />
              </span>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-xs">{t("Region")}</span>
                <span className="truncate text-foreground">
                  {region.name}, {region.province}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <RegionDialog
          currentRegion={region}
          open={isRegionDialogOpen}
          onOpenChange={setRegionDialogOpen}
        />
      </SidebarHeader>
      <SidebarContent>
        {sectionGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{t(group.label)}</SidebarGroupLabel>
            <SidebarMenu>
              {group.sections.map((section) => (
                <SidebarMenuItem key={section.to}>
                  <SidebarMenuButton
                    tooltip={t(section.title)}
                    isActive={Boolean(
                      matchRoute({ to: section.to, fuzzy: true })
                    )}
                    render={<Link to={section.to} />}
                  >
                    <section.icon />
                    <span>{t(section.title)}</span>
                  </SidebarMenuButton>
                  {!section.isAvailable && (
                    <SidebarMenuBadge className="text-[0.65rem] font-normal">
                      {t("Soon")}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser {...navUserProps} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
