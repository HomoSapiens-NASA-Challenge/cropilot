import { createContext, type ReactNode, useContext } from "react"
import { View } from "react-native"

/** Height of the sticky site header, so jumps to a section land below it. */
export const SITE_HEADER_HEIGHT = 72

/** Sections of the landing that links can jump to, like the web's hashes. */
export type LandingAnchor = "features" | "how-it-works" | "data" | "agronomists"

export function isLandingAnchor(
  value: string | undefined
): value is LandingAnchor {
  return (
    value === "features" ||
    value === "how-it-works" ||
    value === "data" ||
    value === "agronomists"
  )
}

export type SiteScroll = {
  goTo: (anchor: LandingAnchor) => void
  register: (anchor: LandingAnchor, y: number) => void
}

export const SiteScrollContext = createContext<SiteScroll | null>(null)

function useSiteScroll(): SiteScroll {
  const context = useContext(SiteScrollContext)
  if (!context) {
    throw new Error("useSiteScroll must be used inside SiteScreen")
  }
  return context
}

/** Jumps to a section of the tour; from a sub-page it opens the tour there. */
export function useGoToAnchor(): (anchor: LandingAnchor) => void {
  return useSiteScroll().goTo
}

/** Marks where a landing section starts. Must be a direct child of SiteScreen. */
export function AnchorTarget({
  anchor,
  children,
}: {
  anchor: LandingAnchor
  children: ReactNode
}) {
  const { register } = useSiteScroll()
  return (
    <View onLayout={(event) => register(anchor, event.nativeEvent.layout.y)}>
      {children}
    </View>
  )
}
