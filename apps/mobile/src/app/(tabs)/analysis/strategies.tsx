import { ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { ComingSoon } from "@/components/coming-soon"
import { PageHeader } from "@/components/page-header"
import { appSections } from "@/features/shell/sections"

export default function StrategiesScreen() {
  return (
    <SafeAreaView edges={["left", "right"]} className="flex-1 bg-secondary">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-8 p-6"
      >
        <PageHeader
          title={appSections.strategies.title}
          description={appSections.strategies.description}
        />
        <ComingSoon
          icon={appSections.strategies.icon}
          title="No strategies to compare yet"
          description="Each strategy will show why it is suggested, the evidence behind it, its benefits, what information is missing and which risks need local review."
        />
      </ScrollView>
    </SafeAreaView>
  )
}
