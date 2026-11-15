import { useLocalSearchParams } from "expo-router"
import { AssistantScreen } from "@/features/case/assistant/assistant-screen"

export default function AskScreen() {
  const { zoneId } = useLocalSearchParams<{ zoneId: string }>()
  return <AssistantScreen key={zoneId} zoneId={zoneId} />
}
