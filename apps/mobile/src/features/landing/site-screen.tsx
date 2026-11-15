import { router, useLocalSearchParams } from "expo-router"
import { type ComponentRef, type ReactNode, useEffect, useRef } from "react"
import { ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { AnnouncementBar } from "@/features/landing/announcement-bar"
import { SiteFooter } from "@/features/landing/site-footer"
import { SiteHeader } from "@/features/landing/site-header"
import {
  isLandingAnchor,
  type LandingAnchor,
  SITE_HEADER_HEIGHT,
  type SiteScroll,
  SiteScrollContext,
} from "@/features/landing/site-scroll"
import { useReduceMotion } from "@/lib/use-reduce-motion"

/**
 * Chrome of the public site: the announcement bar scrolls away, the header
 * sticks to the top like the web's glass header, the footer closes the page.
 */
export function SiteScreen({ children }: { children: ReactNode }) {
  const reduceMotion = useReduceMotion()
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null)
  const positions = useRef<Partial<Record<LandingAnchor, number>>>({})
  // `at` makes every request new, so asking twice for the same section works.
  const { section, at } = useLocalSearchParams<{
    section?: string
    at?: string
  }>()
  const pending = useRef<LandingAnchor | null>(null)

  const scrollToY = (y: number) =>
    scroll.current?.scrollTo({
      y: Math.max(0, y - SITE_HEADER_HEIGHT),
      animated: !reduceMotion,
    })

  // A sub-page asked for a section (`section` + `at`): scroll there now if
  // this landing is already laid out (it stayed under the sub-page), or as
  // soon as that section reports its position.
  useEffect(() => {
    if (!isLandingAnchor(section) || at === undefined) {
      return
    }
    const y = positions.current[section]
    if (y === undefined) {
      pending.current = section
      return
    }
    scroll.current?.scrollTo({
      y: Math.max(0, y - SITE_HEADER_HEIGHT),
      animated: !reduceMotion,
    })
  }, [section, at, reduceMotion])

  const value: SiteScroll = {
    goTo: (anchor) => {
      const y = positions.current[anchor]
      if (y === undefined) {
        router.navigate({
          pathname: "/",
          params: { section: anchor, at: String(Date.now()) },
        })
        return
      }
      scrollToY(y)
    },
    register: (anchor, y) => {
      positions.current[anchor] = y
      if (pending.current === anchor) {
        pending.current = null
        scrollToY(y)
      }
    },
    scrollToTop: () =>
      scroll.current?.scrollTo({ y: 0, animated: !reduceMotion }),
  }

  return (
    <SiteScrollContext.Provider value={value}>
      <SafeAreaView
        edges={["top", "left", "right"]}
        className="flex-1 bg-background"
      >
        <ScrollView ref={scroll} stickyHeaderIndices={[1]}>
          <AnnouncementBar />
          <SiteHeader />
          {children}
          <SiteFooter />
        </ScrollView>
      </SafeAreaView>
    </SiteScrollContext.Provider>
  )
}
