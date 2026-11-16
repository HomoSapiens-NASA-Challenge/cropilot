import { router, useLocalSearchParams } from "expo-router"
import { type ComponentRef, type ReactNode, useEffect, useRef } from "react"
import { ScrollView, View } from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { Text } from "@/components/ui/text"
import {
  isLandingAnchor,
  type LandingAnchor,
  type SiteScroll,
  SiteScrollContext,
} from "@/features/landing/site-scroll"
import { useReduceMotion } from "@/lib/use-reduce-motion"

export function SiteScreen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets()
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
      y: Math.max(0, y),
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
      y: Math.max(0, y),
      animated: !reduceMotion,
    })
  }, [section, at, reduceMotion])

  const value: SiteScroll = {
    goTo: (anchor) => {
      const y = positions.current[anchor]
      if (y === undefined) {
        router.navigate({
          pathname: "/tour",
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
  }

  return (
    <SiteScrollContext.Provider value={value}>
      <SafeAreaView edges={["left", "right"]} className="flex-1 bg-background">
        <ScrollView ref={scroll} showsVerticalScrollIndicator={false}>
          {children}
          <View
            className="border-t border-border/70 px-6 pt-8 pb-12"
            style={
              insets.bottom > 0
                ? { paddingBottom: 48 + insets.bottom }
                : undefined
            }
          >
            <Text className="text-xs text-muted-foreground">
              Built for the NASA Space Apps Challenge 2026 · Field Shift:
              Adapting Farms with NASA Data. Cropilot supports the agronomist's
              judgment and never replaces it.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SiteScrollContext.Provider>
  )
}
