import {
  CalendarSearch,
  type LucideIcon,
  Sprout,
  Tractor,
} from "lucide-react-native"
import { View } from "react-native"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { Band, SplitHeading } from "@/features/landing/frame"

const STEPS: ReadonlyArray<{
  icon: LucideIcon
  title: string
  description: string
}> = [
  {
    icon: Tractor,
    title: "Start from the field",
    description:
      "Location, soil and the rotation the farm runs today. The current rotation is always one of the options compared.",
  },
  {
    icon: CalendarSearch,
    title: "Find years like this one",
    description:
      "Past campaigns that started with the same El Niño phase, as it was known at decision time, and similar root-zone soil moisture.",
  },
  {
    icon: Sprout,
    title: "Compare rotations",
    description:
      "How each rotation did in each of those campaigns, named and dated, side by side. No single score hides the spread.",
  },
]

export function HowItWorksSection() {
  return (
    <Band>
      <View className="px-4 pt-20 pb-14">
        <SplitHeading lead="From the field to the campaigns that started the same way.">
          Cropilot does not predict the weather. It looks back at real campaigns
          that began like this one and shows what happened.
        </SplitHeading>
      </View>
      <View className="border-t border-border">
        {STEPS.map((step, index) => (
          <View key={step.title} className="gap-4 px-4 py-10">
            <View className="flex-row items-center justify-between">
              <View className="size-10 items-center justify-center rounded-lg border border-border bg-background">
                <Icon as={step.icon} size={20} className="text-primary" />
              </View>
              <Text className="text-sm text-muted-foreground">
                0{index + 1}
              </Text>
            </View>
            <Text className="mt-2 text-lg font-medium">{step.title}</Text>
            <Text className="leading-relaxed text-muted-foreground">
              {step.description}
            </Text>
          </View>
        ))}
      </View>
    </Band>
  )
}
