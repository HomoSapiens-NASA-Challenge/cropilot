import { CircleHelp } from "lucide-react"
import type { ReactNode } from "react"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useGlossaryEntry } from "@/features/case/case-context"
import { useI18n } from "@/lib/i18n"

export function Term({
  term,
  children,
}: {
  /** The glossary term to look up, for example "NDVI" or "Soil wetness". */
  term: string
  children?: ReactNode
}) {
  const { t } = useI18n("case")

  const entry = useGlossaryEntry(term)
  const label =
    typeof children === "string" ? t(children) : (children ?? t(term))
  if (!entry) return <>{label}</>

  return (
    <span className="inline-flex items-baseline gap-0.5">
      {label}
      <Popover>
        <PopoverTrigger
          aria-label={t("What is {value1}?", { value1: t(entry.term) })}
          className="inline-flex size-4 translate-y-0.5 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:text-primary"
        >
          <CircleHelp className="size-3.5" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72">
          <PopoverHeader>
            <span className="text-xs text-muted-foreground">
              {t("What is this?")}
            </span>
            <PopoverTitle>{t(entry.term)}</PopoverTitle>
            <PopoverDescription>{t(entry.definition)}</PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
    </span>
  )
}
