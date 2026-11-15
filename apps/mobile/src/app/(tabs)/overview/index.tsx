import { ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { PageHeader } from "@/components/page-header"
import { SectionCard } from "@/features/shell/section-card"
import { appSections } from "@/features/shell/sections"

export default function OverviewScreen() {
  const sections = [
    appSections.farmMap,
    appSections.fieldFootprints,
    appSections.analogYears,
    appSections.strategies,
    appSections.assistant,
  ]
  return (
    <SafeAreaView edges={["left", "right"]} className="flex-1 bg-secondary">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-8 p-6"
      >
        <PageHeader
          title="Welcome back"
          description="Start from a farm, find the years that started like this one and compare rotations."
        />
        <View className="gap-3">
          {sections.map((section) => (
            <SectionCard key={section.href} section={section} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
