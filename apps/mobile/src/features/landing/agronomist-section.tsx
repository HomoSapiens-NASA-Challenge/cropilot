import { Check } from "lucide-react-native"
import { View } from "react-native"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { DashedRule } from "@/features/landing/decor"
import { Band, SplitHeading } from "@/features/landing/frame"

const STRATEGY_ANSWERS = [
  "Why it is suggested",
  "The evidence behind it",
  "The benefits it brings",
  "What information is missing",
  "Which risks need local review",
] as const

export function AgronomistSection() {
  return (
    <Band>
      <View className="gap-14 px-4 py-20">
        <View className="gap-6">
          <SplitHeading lead="Supports your judgment. Never replaces it.">
            Cropilot is for the agronomist who advises the farm. It brings the
            evidence from Earth observation; you bring local knowledge and make
            the call with the producer.
          </SplitHeading>
          <Text className="text-muted-foreground">
            No remote sensing background needed.
          </Text>
          <View className="gap-3 border-l-2 border-primary pl-5">
            <Text className="text-xl font-light leading-8 tracking-tight">
              “We all know the forecast; the starting point in each case is what
              matters for the decision.”
            </Text>
            <Text className="text-sm text-muted-foreground">
              Ing. Agr. MBA Fernando Spelanzon, adviser in southern Córdoba,
              central Buenos Aires and Bragado (translated from Spanish)
            </Text>
          </View>
        </View>
        <View>
          <Text className="pb-4 text-sm text-muted-foreground">
            Every strategy answers
          </Text>
          {STRATEGY_ANSWERS.map((answer) => (
            <View key={answer}>
              <DashedRule />
              <View className="flex-row items-center gap-4 py-4">
                <View className="size-8 shrink-0 items-center justify-center rounded-lg bg-accent">
                  <Icon as={Check} size={16} className="text-primary" />
                </View>
                <Text className="flex-1 text-xl font-light tracking-tight">
                  {answer}
                </Text>
              </View>
            </View>
          ))}
          <DashedRule />
        </View>
      </View>
    </Band>
  )
}
