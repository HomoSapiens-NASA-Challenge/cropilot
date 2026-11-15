import { ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { SectionCard } from "@/features/shell/section-card"
import { appSections } from "@/features/shell/sections"

export default function AnalysisScreen() {
  const sections = [
    appSections.analogYears,
    appSections.strategies,
    appSections.assistant,
  ]
  return (
    <SafeAreaView edges={["left", "right"]} className="flex-1 bg-secondary">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="p-6"
      >
        <View className="gap-3">
          {sections.map((section) => (
            <SectionCard key={section.href} section={section} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
