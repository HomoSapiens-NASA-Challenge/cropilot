import type { Region } from "@cropilot/api"
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react"
import { AssistantPanel } from "@/components/assistant-panel"

const SelectRun = createContext<(runId: string | undefined) => void>(() => {})

/**
 * The assistant bubble on every signed-in page. It explains the region's published case,
 * or the planner run a page selects with `useAssistantRun`.
 */
export function AppAssistant({
  region,
  children,
}: {
  region: Region
  children: ReactNode
}) {
  const [runId, setRunId] = useState<string>()

  return (
    <SelectRun.Provider value={setRunId}>
      {children}
      {/* A new region or run starts a fresh conversation. */}
      <AssistantPanel
        key={`${region.id}-${runId ?? "case"}`}
        zoneId={region.id}
        zoneName={region.name}
        runId={runId}
      />
    </SelectRun.Provider>
  )
}

/** While the calling page is open, the bubble explains this planner run. */
export function useAssistantRun(runId: string | undefined) {
  const selectRun = useContext(SelectRun)

  useEffect(() => {
    selectRun(runId)
    return () => selectRun(undefined)
  }, [runId, selectRun])
}
