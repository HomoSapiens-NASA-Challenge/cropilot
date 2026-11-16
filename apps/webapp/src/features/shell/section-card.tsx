import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { AppSection } from "@/features/shell/sections"
import { useI18n } from "@/lib/i18n"

export function SectionCard({
  section,
  children,
}: {
  section: AppSection
  children?: ReactNode
}) {
  const { t } = useI18n("app")

  return (
    <Link to={section.to} className="group/section rounded-xl outline-none">
      <Card className="h-full transition-shadow group-hover/section:shadow-sm group-focus-visible/section:ring-2 group-focus-visible/section:ring-ring">
        <CardHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-lg border bg-background text-primary">
            <section.icon className="size-5" />
          </div>
          <CardTitle className="flex items-center gap-1">
            {t(section.title)}
            <ArrowRight className="size-4 text-primary opacity-0 transition-all group-hover/section:translate-x-0.5 group-hover/section:opacity-100" />
          </CardTitle>
          <CardDescription>{t(section.description)}</CardDescription>
          {!section.isAvailable && (
            <CardAction>
              <Badge variant="outline">{t("Soon")}</Badge>
            </CardAction>
          )}
        </CardHeader>
        {children && <CardContent>{children}</CardContent>}
      </Card>
    </Link>
  )
}
