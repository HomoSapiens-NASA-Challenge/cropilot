import { ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { ComingSoon } from "@/components/coming-soon"
import { PageHeader } from "@/components/page-header"
import { appSections } from "@/features/shell/sections"

export default function AnalogYearsScreen() {
  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      className="flex-1 bg-secondary"
    >
      <ScrollView contentContainerClassName="gap-8 p-6">
        <PageHeader
          title={appSections.analogYears.title}
          description={appSections.analogYears.description}
        />
        <ComingSoon
          icon={appSections.analogYears.icon}
          title="No campaigns to show yet"
          description="Pick a farm and Cropilot will list the past campaigns that started with the same El Niño phase (NOAA ONI) and similar root-zone soil moisture (NASA POWER), each with its name and dates."
        />
      </ScrollView>
    </SafeAreaView>
  )
}
