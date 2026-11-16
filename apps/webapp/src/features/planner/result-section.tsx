import type { PlannerSource } from "@cropilot/api"
import { cn } from "cn"
import type { ReactNode } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { plannerText } from "@/features/planner/planner-copy"
import { useI18n } from "@/lib/i18n"

/** "Dataset. Period. Location." for the footer of a card: where its numbers come from. */
function sourceLine(source: PlannerSource): string {
  return `${plannerText(source.dataset)}. ${plannerText(source.period)}. ${plannerText(source.location)}.`
}

export function ResultSection({
  title,
  lead,
  aside,
  sources,
  children,
  className,
}: {
  title: string
  lead?: ReactNode
  aside?: ReactNode
  sources?: ReadonlyArray<PlannerSource>
  children: ReactNode
  className?: string
}) {
  const { t } = useI18n("app")

  return (
    <Card className={cn("sm:[--card-spacing:--spacing(6)]", className)}>
      <CardHeader className="gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <CardTitle>{t(title)}</CardTitle>
          {aside}
        </div>
        {lead && (
          <CardDescription className="max-w-3xl">
            {typeof lead === "string" ? t(lead) : lead}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-6">
        {children}
      </CardContent>
      {sources && sources.length > 0 && (
        <CardFooter className="flex-col items-start gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {sources.length === 1 ? t("Source") : t("Sources")}
          </span>
          <ul className="grid w-full gap-x-8 gap-y-1 lg:grid-cols-2">
            {sources.map((source) => (
              <li key={source.source_id}>{sourceLine(source)}</li>
            ))}
          </ul>
        </CardFooter>
      )}
    </Card>
  )
}
