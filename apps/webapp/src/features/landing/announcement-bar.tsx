import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import { useI18n } from "@/lib/i18n"

export function AnnouncementBar() {
  const { t } = useI18n("landing")
  return (
    <p className="relative z-50 bg-inverse px-4 py-2.5 text-center text-sm text-inverse-foreground">
      <span className="text-inverse-muted-foreground">
        {t("NASA Space Apps Challenge 2026 ·")}
      </span>{" "}
      {t("Field Shift: Adapting Farms with NASA Data.")}{" "}
      <Link
        to="/$sectionSlug/$pageSlug"
        params={{ sectionSlug: "resources", pageSlug: "space-apps" }}
        className="group inline-flex items-center gap-0.5 rounded-lg font-medium"
      >
        {t("Learn more")}
        <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </p>
  )
}
