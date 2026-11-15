import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"

export function AnnouncementBar() {
  return (
    <p className="relative z-50 bg-inverse px-4 py-2.5 text-center text-sm text-inverse-foreground">
      <span className="text-inverse-muted-foreground">
        NASA Space Apps Challenge 2026 ·
      </span>{" "}
      Field Shift: Adapting Farms with NASA Data.{" "}
      <Link
        to="/$sectionSlug/$pageSlug"
        params={{ sectionSlug: "resources", pageSlug: "space-apps" }}
        className="group inline-flex items-center gap-0.5 rounded-lg font-medium"
      >
        Learn more
        <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </p>
  )
}
