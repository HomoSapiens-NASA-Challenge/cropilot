import { Maximize2 } from "lucide-react-native"
import type { ReactNode } from "react"
import { Pressable, View } from "react-native"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { CardGradient } from "@/features/landing/decor"
import { Band, SplitHeading } from "@/features/landing/frame"
import { AnalogYearsPreview } from "@/features/landing/previews/analog-years-preview"
import { AssistantPreview } from "@/features/landing/previews/assistant-preview"
import { FarmMapPreview } from "@/features/landing/previews/farm-map-preview"
import { RotationComparisonPreview } from "@/features/landing/previews/rotation-comparison-preview"
import { SourceTrailPreview } from "@/features/landing/previews/source-trail-preview"
import { openSitePage } from "@/features/landing/site-links"

function FeatureCard({
  title,
  pageSlug,
  children,
}: {
  title: string
  /** Page under `features` that the card opens. */
  pageSlug: string
  children: ReactNode
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Open ${title}`}
      onPress={() => openSitePage("features", pageSlug)}
      className="group relative overflow-hidden rounded-xl border border-border"
    >
      <CardGradient />
      <View className="flex-row items-start justify-between gap-4 p-6">
        <Text className="flex-1 text-2xl font-light leading-7 tracking-tight">
          {title}
        </Text>
        <View className="size-9 items-center justify-center rounded-lg bg-accent group-active:bg-primary">
          <Icon
            as={Maximize2}
            size={16}
            className="text-primary group-active:text-primary-foreground"
          />
        </View>
      </View>
      <View className="px-6 pt-2 pb-6">{children}</View>
    </Pressable>
  )
}

export function FeatureGridSection() {
  return (
    <Band tone="tinted">
      <View className="gap-14 px-4 py-20">
        <SplitHeading lead="One view for the whole decision.">
          From the field on the map to the rotations compared, with every number
          traced back to its source.
        </SplitHeading>
        <View className="gap-4">
          <FeatureCard
            title="Find the campaigns that started like this one"
            pageSlug="years-like-this"
          >
            <AnalogYearsPreview />
          </FeatureCard>
          <FeatureCard
            title="Compare three or more rotations"
            pageSlug="rotation-strategies"
          >
            <RotationComparisonPreview />
          </FeatureCard>
          <FeatureCard
            title="Every number names its source"
            pageSlug="evidence-trail"
          >
            <SourceTrailPreview />
          </FeatureCard>
          <FeatureCard title="See every farm, lot by lot" pageSlug="farm-map">
            <FarmMapPreview />
          </FeatureCard>
          <FeatureCard
            title="Ask, and get answers that cite their data"
            pageSlug="assistant"
          >
            <AssistantPreview />
          </FeatureCard>
        </View>
      </View>
    </Band>
  )
}
