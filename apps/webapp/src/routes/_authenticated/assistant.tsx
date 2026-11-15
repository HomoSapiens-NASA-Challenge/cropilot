import { createFileRoute } from "@tanstack/react-router"
import { ComingSoon } from "@/components/coming-soon"
import { PageHeader } from "@/components/page-header"
import { appSections } from "@/features/shell/sections"

const section = appSections.assistant

export const Route = createFileRoute("/_authenticated/assistant")({
  staticData: { title: section.title },
  component: AssistantPage,
})

function AssistantPage() {
  return (
    <>
      <PageHeader title={section.title} description={section.description} />
      <ComingSoon
        icon={section.icon}
        title="The assistant is not connected yet"
        description="It will answer questions about your farms and strategies, and every answer will point to its source. It supports your judgment, it never replaces it."
      />
    </>
  )
}
