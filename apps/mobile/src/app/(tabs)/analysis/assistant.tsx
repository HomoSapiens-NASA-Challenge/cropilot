import { ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { ComingSoon } from "@/components/coming-soon"
import { PageHeader } from "@/components/page-header"
import { appSections } from "@/features/shell/sections"

export default function AssistantScreen() {
  return (
    <SafeAreaView edges={["left", "right"]} className="flex-1 bg-secondary">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-8 p-6"
      >
        <PageHeader
          title={appSections.assistant.title}
          description={appSections.assistant.description}
        />
        <ComingSoon
          icon={appSections.assistant.icon}
          title="The assistant is not connected yet"
          description="It will answer questions about your farms and strategies, and every answer will point to its source. It supports your judgment, it never replaces it."
        />
      </ScrollView>
    </SafeAreaView>
  )
}
