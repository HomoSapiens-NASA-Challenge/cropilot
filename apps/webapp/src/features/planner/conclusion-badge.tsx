import { Badge } from "@/components/ui/badge"
import { CONCLUSION_LABEL } from "@/features/planner/planner-format"
import type { Conclusion } from "@/features/planner/planner-types"
import { useI18n } from "@/lib/i18n"

/** A held-out conclusion as a badge and a word, never as red or green. */
export function ConclusionBadge({ conclusion }: { conclusion: Conclusion }) {
  const { t } = useI18n("app")

  return <Badge variant="outline">{t(CONCLUSION_LABEL[conclusion])}</Badge>
}
