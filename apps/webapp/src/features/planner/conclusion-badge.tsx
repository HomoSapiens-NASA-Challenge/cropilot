import { Badge } from "@/components/ui/badge"
import { CONCLUSION_LABEL } from "@/features/planner/planner-format"
import type { Conclusion } from "@/features/planner/planner-types"

/** A held-out conclusion as a badge and a word, never as red or green. */
export function ConclusionBadge({ conclusion }: { conclusion: Conclusion }) {
  return <Badge variant="outline">{CONCLUSION_LABEL[conclusion]}</Badge>
}
