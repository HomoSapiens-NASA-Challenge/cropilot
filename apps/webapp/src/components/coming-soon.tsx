import type { LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

/** A section whose models are not wired yet. It shows no numbers, not even mock ones. */
export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <Empty className="border bg-card py-14">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-10 border bg-background text-primary"
        >
          <Icon />
        </EmptyMedia>
        <EmptyTitle className="text-xl font-light">{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Badge variant="outline">Not available yet</Badge>
      </EmptyContent>
    </Empty>
  )
}
