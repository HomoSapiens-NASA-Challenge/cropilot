import { Link, useMatchRoute } from "@tanstack/react-router"
import { BrandLogo } from "@/components/brand-mark"
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

export function AppSidebar(props: NavUserProps) {
  const matchRoute = useMatchRoute()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link to={appSections.overview.to} />}
            >
              <BrandLogo />
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium tracking-tight text-foreground">
                  Cropilot
                </span>
                <span className="truncate text-xs">Rotation planning</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {sectionGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.sections.map((section) => (
                <SidebarMenuItem key={section.to}>
                  <SidebarMenuButton
                    tooltip={section.title}
                    isActive={Boolean(
                      matchRoute({ to: section.to, fuzzy: true })
                    )}
                    render={<Link to={section.to} />}
                  >
                    <section.icon />
                    <span>{section.title}</span>
                  </SidebarMenuButton>
                  {!section.isAvailable && (
                    <SidebarMenuBadge className="text-[0.65rem] font-normal">
                      Soon
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser {...props} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
